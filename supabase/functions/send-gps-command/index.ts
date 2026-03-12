import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GPS_API_BASE = "http://192.99.16.163:3000";
const GPS_API_TOKEN = "protrack2026";

// ── Send command via REST API ──
async function sendRelayCommand(imei: string, action: "power-off" | "power-on"): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const url = `${GPS_API_BASE}/api/device/${imei}/${action}`;
    console.log(`[GPS-API] POST ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GPS_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const body = await res.text();
    console.log(`[GPS-API] Status: ${res.status}, Body: ${body}`);

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }

    return { success: true, response: body };
  } catch (err) {
    console.error(`[GPS-API] Error:`, err);
    return { success: false, error: err instanceof Error ? err.message : "API request failed" };
  }
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { alarm_type, imei, action } = body;

    // Manual actions from admin panel
    if (action === "relay-on" && imei) {
      const result = await sendRelayCommand(imei, "power-off");
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "relay-off" && imei) {
      const result = await sendRelayCommand(imei, "power-on");
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Alarm trigger: activate relay on all devices
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

      await supabase
        .from("gps_devices")
        .update({ relay_active_until: newActiveUntil.toISOString() })
        .eq("imei", device.imei);

      if (isRelayActive) {
        console.log(`[GPS] Relay already active on ${device.imei}, extended`);
        results.push({
          imei: device.imei, success: true, relay_duration: duration,
          action: "extended", active_until: newActiveUntil.toISOString(),
        });
      } else {
        console.log(`[GPS] Activating relay on ${device.imei} for ${duration}s`);
        try {
          const result = await sendRelayCommand(device.imei, "power-off");
          results.push({
            imei: device.imei, success: result.success, relay_duration: duration,
            action: "activated", active_until: newActiveUntil.toISOString(),
            api_response: result.response,
          });
        } catch (err) {
          results.push({
            imei: device.imei, success: false, relay_duration: duration,
            action: "error", error: err instanceof Error ? err.message : "Error desconocido",
          });
        }
      }

      // Schedule relay restore
      restorePromises.push((async () => {
        const waitMs = newActiveUntil.getTime() - Date.now();
        if (waitMs > 0) {
          console.log(`[GPS] Scheduling power-on for ${device.imei} in ${Math.round(waitMs / 1000)}s`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        const { data: current } = await supabase
          .from("gps_devices")
          .select("relay_active_until")
          .eq("imei", device.imei)
          .single();

        const currentUntil = current?.relay_active_until ? new Date(current.relay_active_until) : null;
        if (currentUntil && currentUntil > new Date()) {
          console.log(`[GPS] Restore skipped for ${device.imei}: timer extended`);
          return;
        }

        console.log(`[GPS] Restoring power on ${device.imei}`);
        await sendRelayCommand(device.imei, "power-on");

        await supabase
          .from("gps_devices")
          .update({ relay_active_until: null })
          .eq("imei", device.imei);
      })());
    }

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
