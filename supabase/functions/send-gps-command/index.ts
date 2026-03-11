import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GPS_API_BASE = "http://192.99.16.163:3000/api";

function getApiToken(): string {
  return Deno.env.get("GPS_API_TOKEN") || "";
}

function getHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

// Map alarm type to GPS action
function getActionForAlarmType(alarmType: string): "power-off" | "power-on" {
  switch (alarmType) {
    case "panic":
    case "medical":
    case "fire":
    case "disaster":
      return "power-off"; // Cut power / activate relay
    default:
      return "power-off";
  }
}

async function cutPower(imei: string, token: string) {
  const res = await fetch(`${GPS_API_BASE}/device/${imei}/power-off`, {
    method: "POST",
    headers: getHeaders(token),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function restorePower(imei: string, token: string) {
  const res = await fetch(`${GPS_API_BASE}/device/${imei}/power-on`, {
    method: "POST",
    headers: getHeaders(token),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function getDeviceStatus(imei: string) {
  const res = await fetch(`${GPS_API_BASE}/device/${imei}/status`);
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function listDevices() {
  const res = await fetch(`${GPS_API_BASE}/devices`);
  return { status: res.status, data: await res.json().catch(() => null) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = getApiToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "GPS_API_TOKEN no configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { alarm_type, imei, action } = body;
    // action can be: "power-off", "power-on", "status", "list"

    // Special actions
    if (action === "list") {
      const result = await listDevices();
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status" && imei) {
      const result = await getDeviceStatus(imei);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "power-on" && imei) {
      const result = await restorePower(imei, token);
      console.log(`[GPS] Restored power for ${imei}:`, result);
      return new Response(JSON.stringify({ success: result.status === 200, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: alarm trigger — cut power on target devices
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let targetDevices: { imei: string }[] = [];

    if (imei) {
      targetDevices = [{ imei }];
    } else {
      const { data: devices } = await supabase.from("gps_devices").select("imei");
      targetDevices = devices || [];
    }

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No hay dispositivos GPS registrados",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const gpsAction = action || getActionForAlarmType(alarm_type || "panic");
    const results: { imei: string; success: boolean; error?: string; response?: unknown }[] = [];

    for (const device of targetDevices) {
      try {
        console.log(`[GPS] Sending ${gpsAction} to device ${device.imei}`);
        const result = gpsAction === "power-on"
          ? await restorePower(device.imei, token)
          : await cutPower(device.imei, token);

        console.log(`[GPS] Response for ${device.imei}:`, result);
        results.push({
          imei: device.imei,
          success: result.status === 200,
          response: result.data,
        });
      } catch (err) {
        console.error(`[GPS] Error for ${device.imei}:`, err);
        results.push({
          imei: device.imei,
          success: false,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    return new Response(JSON.stringify({
      success: results.some(r => r.success),
      alarm_type,
      action: gpsAction,
      devices_targeted: targetDevices.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[GPS] Error:", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Error interno",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
