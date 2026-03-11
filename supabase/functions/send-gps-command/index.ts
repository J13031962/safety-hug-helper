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

    // ── Alarm trigger: relay-on with concurrency control ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all devices with their current relay state
    const { data: devices } = await supabase
      .from("gps_devices")
      .select("imei, relay_duration, relay_active_until");

    const targetDevices = (devices || []).filter((d: any) =>
      imei ? d.imei === imei : true
    );

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No hay dispositivos GPS registrados",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const results: any[] = [];
    const restorePromises: Promise<void>[] = [];

    for (const device of targetDevices) {
      const duration = device.relay_duration ?? 30;
      const newActiveUntil = new Date(now.getTime() + duration * 1000);
      const currentActiveUntil = device.relay_active_until
        ? new Date(device.relay_active_until)
        : null;
      const isRelayActive = currentActiveUntil && currentActiveUntil > now;

      // Always extend the relay_active_until timestamp
      await supabase
        .from("gps_devices")
        .update({ relay_active_until: newActiveUntil.toISOString() })
        .eq("imei", device.imei);

      if (isRelayActive) {
        // Relay already ON — just extended the timer, no need to send power-off again
        console.log(`[GPS] Relay already active on ${device.imei} until ${currentActiveUntil!.toISOString()}, extended to ${newActiveUntil.toISOString()}`);
        results.push({
          imei: device.imei,
          success: true,
          relay_duration: duration,
          action: "extended",
          active_until: newActiveUntil.toISOString(),
        });
      } else {
        // Relay is OFF — send power-off command
        console.log(`[GPS] Activating relay on ${device.imei} for ${duration}s`);
        try {
          const result = await cutPower(device.imei, token);
          const success = result.status === 200;
          results.push({
            imei: device.imei,
            success,
            relay_duration: duration,
            action: "activated",
            active_until: newActiveUntil.toISOString(),
          });
        } catch (err) {
          console.error(`[GPS] Error activating ${device.imei}:`, err);
          results.push({
            imei: device.imei,
            success: false,
            relay_duration: duration,
            action: "error",
            error: err instanceof Error ? err.message : "Error desconocido",
          });
        }
      }

      // Schedule restore: wait until relay_active_until, then check if it should restore
      restorePromises.push((async () => {
        const waitMs = newActiveUntil.getTime() - Date.now();
        if (waitMs > 0) {
          console.log(`[GPS] Scheduling restore check for ${device.imei} in ${Math.round(waitMs / 1000)}s`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        // Re-read the device to check if relay_active_until was extended by another alarm
        const { data: current } = await supabase
          .from("gps_devices")
          .select("relay_active_until")
          .eq("imei", device.imei)
          .single();

        const currentUntil = current?.relay_active_until
          ? new Date(current.relay_active_until)
          : null;
        const nowCheck = new Date();

        if (currentUntil && currentUntil > nowCheck) {
          // Another alarm extended the timer — don't restore yet
          console.log(`[GPS] Restore skipped for ${device.imei}: timer extended to ${currentUntil.toISOString()}`);
          return;
        }

        // Timer expired — send power-on (relay off)
        console.log(`[GPS] Restoring power on ${device.imei}`);
        const restoreResult = await restorePower(device.imei, token);
        console.log(`[GPS] Restore result for ${device.imei}:`, restoreResult);

        // Clear the relay_active_until
        await supabase
          .from("gps_devices")
          .update({ relay_active_until: null })
          .eq("imei", device.imei);
      })());
    }

    // Let restore promises run in background
    Promise.all(restorePromises).catch((err) =>
      console.error("[GPS] Error in scheduled restores:", err)
    );

    return new Response(JSON.stringify({
      success: results.some((r) => r.success),
      alarm_type,
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
