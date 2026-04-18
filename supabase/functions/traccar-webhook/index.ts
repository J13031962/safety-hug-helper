import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-traccar-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Recognized panic/SOS alarm types from Traccar (GT06 and others)
const PANIC_ALARMS = new Set([
  "sos",
  "panic",
  "emergency",
  "alarm",
]);

function isPanicEvent(payload: any): boolean {
  const evt = payload?.event;
  if (!evt) return false;

  // Traccar event type can be "alarm" with attributes.alarm = "sos"
  if (evt.type === "alarm") {
    const alarmName = String(evt.attributes?.alarm || "").toLowerCase();
    if (PANIC_ALARMS.has(alarmName)) return true;
  }

  // Some configs send type directly as "sos" or "panic"
  const t = String(evt.type || "").toLowerCase();
  if (PANIC_ALARMS.has(t)) return true;

  // Position-level alarm attribute fallback
  const posAlarm = String(payload?.position?.attributes?.alarm || "").toLowerCase();
  if (posAlarm && PANIC_ALARMS.has(posAlarm)) return true;

  return false;
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

    if (!isPanicEvent(payload)) {
      console.log("[TraccarWH] Ignored: not a panic/SOS event");
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "not_panic" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
