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

// Schedule restore after delay (runs in background)
async function scheduleRestore(imei: string, delaySec: number, token: string) {
  console.log(`[GPS] Scheduling power restore for ${imei} in ${delaySec}s`);
  await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
  console.log(`[GPS] Restoring power for ${imei}`);
  const result = await restorePower(imei, token);
  console.log(`[GPS] Restore result for ${imei}:`, result);
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

    // Special actions (manual control from admin)
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
      return new Response(JSON.stringify({ success: result.status === 200, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "power-off" && imei) {
      const result = await cutPower(imei, token);
      return new Response(JSON.stringify({ success: result.status === 200, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Alarm trigger: cut power → wait relay_duration → restore ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let targetDevices: { imei: string; relay_duration: number }[] = [];

    if (imei) {
      // Single device - get its relay_duration
      const { data } = await supabase
        .from("gps_devices")
        .select("imei, relay_duration")
        .eq("imei", imei)
        .single();
      targetDevices = data ? [data] : [{ imei, relay_duration: 30 }];
    } else {
      // All devices
      const { data: devices } = await supabase
        .from("gps_devices")
        .select("imei, relay_duration");
      targetDevices = (devices || []).map((d: any) => ({
        imei: d.imei,
        relay_duration: d.relay_duration ?? 30,
      }));
    }

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No hay dispositivos GPS registrados",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: { imei: string; success: boolean; relay_duration: number; error?: string }[] = [];
    const restorePromises: Promise<void>[] = [];

    for (const device of targetDevices) {
      try {
        console.log(`[GPS] Cutting power on ${device.imei} (restore in ${device.relay_duration}s)`);
        const result = await cutPower(device.imei, token);
        const success = result.status === 200;

        results.push({
          imei: device.imei,
          success,
          relay_duration: device.relay_duration,
        });

        // Schedule automatic restore in background
        if (success && device.relay_duration > 0) {
          restorePromises.push(scheduleRestore(device.imei, device.relay_duration, token));
        }
      } catch (err) {
        console.error(`[GPS] Error for ${device.imei}:`, err);
        results.push({
          imei: device.imei,
          success: false,
          relay_duration: device.relay_duration,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    // Don't await restorePromises - let them run in background
    // Use EdgeRuntime.waitUntil if available, otherwise fire-and-forget
    Promise.all(restorePromises).catch((err) =>
      console.error("[GPS] Error in scheduled restores:", err)
    );

    return new Response(JSON.stringify({
      success: results.some((r) => r.success),
      alarm_type,
      action: "power-off → auto-restore",
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
