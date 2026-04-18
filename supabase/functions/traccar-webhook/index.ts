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

function norm(v: any): string {
  return String(v || "").toLowerCase().replace(/[\s_-]/g, "");
}

function classify(payload: any): { panic: boolean; reason: string } {
  const evt = payload?.event;
  if (!evt) return { panic: false, reason: "no_event" };

  const evtType = norm(evt.type);

  // Always ignore non-event noise
  if (evtType === "commandresult") return { panic: false, reason: "commandResult" };

  const evtAlarm = norm(evt.attributes?.alarm);
  const posAlarm = norm(payload?.position?.attributes?.alarm);
  const alarmValue = evtAlarm || posAlarm;

  // 1) Direct event type as panic (e.g. type === "sos")
  if (PANIC_ALARMS.has(evtType)) {
    return { panic: true, reason: `event_type=${evtType}` };
  }

  // 2) type === "alarm" with attributes.alarm
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

  // 3) Position-level alarm fallback (only if explicitly SOS)
  if (posAlarm && PANIC_ALARMS.has(posAlarm)) {
    return { panic: true, reason: `position_alarm=${posAlarm}` };
  }

  return { panic: false, reason: `event_type=${evtType}` };
}

function isPanicEvent(payload: any): boolean {
  return classify(payload).panic;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate shared token
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
    console.log(`[TraccarWH] Panic accepted: ${reason}`);

    const imei = String(payload?.device?.uniqueId || "").trim();
    const deviceName = payload?.device?.name || null;
    const latitude = payload?.position?.latitude ?? null;
    const longitude = payload?.position?.longitude ?? null;

    if (!imei) {
      return new Response(JSON.stringify({ success: false, error: "missing_imei" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Find the device + its parcels
    const { data: device, error: deviceErr } = await sb
      .from("gps_devices")
      .select("id, imei, name, model")
      .eq("imei", imei)
      .maybeSingle();

    if (deviceErr || !device) {
      console.warn(`[TraccarWH] Device not found for IMEI ${imei}`);
      return new Response(JSON.stringify({ success: false, error: "device_not_registered", imei }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: deviceParcels, error: dpErr } = await sb
      .from("gps_device_parcels")
      .select("parcel_name")
      .eq("device_id", device.id);

    if (dpErr) {
      console.error("[TraccarWH] DB error:", dpErr);
      return new Response(JSON.stringify({ success: false, error: dpErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parcels = (deviceParcels || []).map((p: any) => p.parcel_name).filter(Boolean);

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
      // 1) Insert alarm row
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
      console.log(`[TraccarWH] Created alarm ${alarmId} for parcel ${parcel_name}`);

      // 2) Trigger siren via send-gps-command (will schedule auto-off)
      try {
        const cmdRes = await sb.functions.invoke("send-gps-command", {
          body: {
            alarm_type: "panic",
            alarm_id: alarmId,
            parcel_name,
          },
        });
        console.log(`[TraccarWH] send-gps-command result:`, JSON.stringify(cmdRes.data));
      } catch (e: any) {
        console.error(`[TraccarWH] send-gps-command error:`, e.message);
      }

      // 3) Send WhatsApp to parcel group
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
        console.log(`[TraccarWH] send-whatsapp result:`, JSON.stringify(waRes.data));
      } catch (e: any) {
        console.error(`[TraccarWH] send-whatsapp error:`, e.message);
      }

      // 4) Send SIA-DCS event to CRA
      try {
        const siaRes = await sb.functions.invoke("send-sia-event", {
          body: {
            alarm_type: "panic",
            parcel_name,
          },
        });
        console.log(`[TraccarWH] send-sia-event result:`, JSON.stringify(siaRes.data));
      } catch (e: any) {
        console.error(`[TraccarWH] send-sia-event error:`, e.message);
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
