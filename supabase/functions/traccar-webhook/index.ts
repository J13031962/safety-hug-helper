import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-traccar-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// STRICT whitelist: only real SOS/panic-button events
const PANIC_ALARMS = new Set([
  "sos",
  "panic",
  "panicbutton",
  "sosbutton",
]);

// Explicit blacklist: never treat these as panic, even if type === "alarm"
const NON_PANIC_ALARMS = new Set([
  "vibration", "movement", "motion", "shock", "tow", "tampering", "tamper",
  "geofenceenter", "geofenceexit", "geofence",
  "lowbattery", "lowpower", "powercut", "powerrestored", "powerOn", "poweroff",
  "overspeed", "hardacceleration", "hardbraking", "hardcornering",
  "ignitionon", "ignitionoff",
  "fault", "maintenance",
  "online", "offline", "statusonline", "statusoffline",
  "devicemoving", "devicestopped", "deviceoverspeed",
]);

// In-memory idempotency cache (per-instance). Key = imei, value = last accepted timestamp ms.
const RECENT_SOS = new Map<string, number>();
const SOS_DEDUP_WINDOW_MS = 30_000;

function norm(v: any): string {
  return String(v || "").toLowerCase().replace(/[\s_-]/g, "");
}

function classify(payload: any): { panic: boolean; reason: string } {
  const evt = payload?.event;
  if (!evt) return { panic: false, reason: "no_event" };

  const evtType = norm(evt.type);

  if (evtType === "commandresult") return { panic: false, reason: "commandResult" };

  const evtAlarm = norm(evt.attributes?.alarm);
  const posAlarm = norm(payload?.position?.attributes?.alarm);
  const alarmValue = evtAlarm || posAlarm;

  if (PANIC_ALARMS.has(evtType)) {
    return { panic: true, reason: `event_type=${evtType}` };
  }

  if (evtType === "alarm") {
    if (!alarmValue) return { panic: false, reason: "alarm_without_value" };
    if (NON_PANIC_ALARMS.has(alarmValue)) {
      return { panic: false, reason: `blacklisted_alarm=${alarmValue}` };
    }
    if (PANIC_ALARMS.has(alarmValue)) {
      return { panic: true, reason: `alarm_value=${alarmValue}` };
    }
    return { panic: false, reason: `unknown_alarm=${alarmValue}` };
  }

  if (posAlarm && PANIC_ALARMS.has(posAlarm)) {
    return { panic: true, reason: `position_alarm=${posAlarm}` };
  }

  return { panic: false, reason: `event_type=${evtType}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedToken = Deno.env.get("TRACCAR_WEBHOOK_TOKEN");
    const providedToken =
      req.headers.get("x-traccar-token") ||
      new URL(req.url).searchParams.get("token");

    if (!expectedToken || providedToken !== expectedToken) {
      console.warn("[TraccarWH] Unauthorized call. provided:", providedToken ? "yes" : "no");
      return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("[TraccarWH] Payload:", JSON.stringify(payload));

    const { panic, reason } = classify(payload);
    if (!panic) {
      console.log(`[TraccarWH] Ignored: ${reason}`);
      return new Response(JSON.stringify({ success: true, ignored: true, reason }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imei = String(payload?.device?.uniqueId || "").trim();
    const deviceName = payload?.device?.name || null;
    const latitude = payload?.position?.latitude ?? null;
    const longitude = payload?.position?.longitude ?? null;

    if (!imei) {
      console.warn("[TraccarWH] Panic event missing IMEI -> rejecting");
      return new Response(JSON.stringify({ success: false, error: "missing_imei" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[TraccarWH] Panic accepted: ${reason} | IMEI=${imei} | device_name=${deviceName}`);

    // Idempotency: ignore duplicate SOS from same IMEI within window
    const now = Date.now();
    const last = RECENT_SOS.get(imei);
    if (last && now - last < SOS_DEDUP_WINDOW_MS) {
      console.log(`[TraccarWH] Duplicate SOS ignored for IMEI=${imei} (last ${now - last}ms ago)`);
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "duplicate_within_window", imei }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    RECENT_SOS.set(imei, now);
    // Clean stale entries
    for (const [k, ts] of RECENT_SOS) {
      if (now - ts > SOS_DEDUP_WINDOW_MS * 2) RECENT_SOS.delete(k);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Find the device by IMEI
    const { data: device, error: deviceErr } = await sb
      .from("gps_devices")
      .select("id, imei, name, model, panic_button_enabled, cra_user_number")
      .eq("imei", imei)
      .maybeSingle();

    if (deviceErr || !device) {
      console.warn(`[TraccarWH] Device not found for IMEI ${imei}`);
      return new Response(JSON.stringify({ success: false, error: "device_not_registered", imei }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GATE: panic button must be explicitly enabled
    if (!device.panic_button_enabled) {
      console.log(`[TraccarWH] Ignored: panic_button_disabled | IMEI=${imei} | device=${device.name || device.id}`);
      return new Response(JSON.stringify({
        success: true,
        ignored: true,
        reason: "panic_button_disabled",
        imei,
        device: device.name || device.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STRICT ISOLATION: only parcels linked to THIS device.id
    const { data: deviceParcels, error: dpErr } = await sb
      .from("gps_device_parcels")
      .select("parcel_name")
      .eq("device_id", device.id);

    if (dpErr) {
      console.error("[TraccarWH] DB error fetching parcels:", dpErr);
      return new Response(JSON.stringify({ success: false, error: dpErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parcels = (deviceParcels || []).map((p: any) => p.parcel_name).filter(Boolean);
    console.log(`[TraccarWH] IMEI=${imei} (device.id=${device.id}) -> parcels=${JSON.stringify(parcels)}`);

    if (parcels.length === 0) {
      console.warn(`[TraccarWH] No parcels associated with device ${imei}`);
      return new Response(JSON.stringify({ success: false, error: "no_parcels_for_device", imei }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sirenLabel = device.name || device.model || imei;
    const senderName = `Botón físico GPS${deviceName ? ` (${deviceName})` : ""}`;
    const observations = `Activado desde botón físico del GPS ${sirenLabel} (IMEI ${imei})`;

    const results: any[] = [];

    for (const parcel_name of parcels) {
      const { data: alarmRow, error: alarmErr } = await sb
        .from("alarms")
        .insert({
          alarm_type: "panic",
          parcel_name,
          sender_name: senderName,
          phone_number: null,
          latitude,
          longitude,
          observations,
          status: "pending",
        })
        .select("id")
        .single();

      if (alarmErr || !alarmRow) {
        console.error(`[TraccarWH] Failed inserting alarm for parcel ${parcel_name}:`, alarmErr);
        results.push({ parcel_name, success: false, error: alarmErr?.message });
        continue;
      }

      const alarmId = alarmRow.id;
      console.log(`[TraccarWH] AUDIT inserted alarm | IMEI=${imei} | parcel=${parcel_name} | alarm_id=${alarmId}`);

      try {
        const cmdRes = await sb.functions.invoke("send-gps-command", {
          body: { alarm_type: "panic", alarm_id: alarmId, parcel_name },
        });
        console.log(`[TraccarWH] send-gps-command [${parcel_name}]:`, JSON.stringify(cmdRes.data));
      } catch (e: any) {
        console.error(`[TraccarWH] send-gps-command error [${parcel_name}]:`, e.message);
      }

      try {
        const waRes = await sb.functions.invoke("send-whatsapp", {
          body: {
            alarm_type: "panic",
            sender_name: senderName,
            parcel_name,
            latitude,
            longitude,
            observations,
          },
        });
        console.log(`[TraccarWH] send-whatsapp [${parcel_name}]:`, JSON.stringify(waRes.data));
      } catch (e: any) {
        console.error(`[TraccarWH] send-whatsapp error [${parcel_name}]:`, e.message);
      }

      try {
        const siaRes = await sb.functions.invoke("send-sia-event", {
          body: { alarm_type: "panic", parcel_name },
        });
        console.log(`[TraccarWH] send-sia-event [${parcel_name}]:`, JSON.stringify(siaRes.data));
      } catch (e: any) {
        console.error(`[TraccarWH] send-sia-event error [${parcel_name}]:`, e.message);
      }

      results.push({ parcel_name, success: true, alarm_id: alarmId });
    }

    return new Response(JSON.stringify({
      success: true,
      imei,
      device_name: deviceName,
      parcels_processed: results.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[TraccarWH] Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
