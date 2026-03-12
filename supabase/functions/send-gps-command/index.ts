import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GPS_API_BASE = "http://192.99.16.163:3000";
const GPS_API_TOKEN = "protrack2026";

type DeviceAction = "relay-on" | "relay-off" | "nosleep";

const AT_COMMANDS: Record<DeviceAction, string> = {
  "relay-on":  "AT^GT_CM=RELAY,1#",
  "relay-off": "AT^GT_CM=RELAY,0#",
  "nosleep":   "nosleep#",
};

async function sendDeviceCommand(imei: string, action: DeviceAction): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const command = AT_COMMANDS[action];
    const url = `${GPS_API_BASE}/api/device/${imei}/command`;
    console.log(`[GPS-API] POST ${url} → ${command}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GPS_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { alarm_type, imei, action } = body;

    // ── Manual actions (nosleep, etc.) ──
    if (action === "nosleep" && imei) {
      const result = await sendDeviceCommand(imei, "nosleep");
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "relay-on" && imei) {
      const result = await sendDeviceCommand(imei, "relay-on");
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "relay-off" && imei) {
      const result = await sendDeviceCommand(imei, "relay-off");
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Alarm trigger: activate siren on matching devices ──
    // Logic:
    //   1. Send power-on → energizes relay → siren sounds
    //   2. If already active → extend timer, report "already sounding"
    //   3. After relay_duration seconds → send power-off → cuts power → siren stops
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const alarmParcel = body.parcel_name || null;

    const query = supabase.from("gps_devices").select("imei, relay_duration, relay_active_until, parcel_name");
    
    const { data: devices } = alarmParcel 
      ? await query.eq("parcel_name", alarmParcel)
      : await query;

    const targetDevices = (devices || []).filter((d: any) =>
      imei ? d.imei === imei : true
    );

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No hay dispositivos GPS registrados para esta parcela",
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

      // Update the active_until timestamp
      await supabase
        .from("gps_devices")
        .update({ relay_active_until: newActiveUntil.toISOString() })
        .eq("imei", device.imei);

      if (isRelayActive) {
        // Siren already sounding — just extend the timer, no need to send power-on again
        console.log(`[GPS] Siren already active on ${device.imei}, timer extended to ${newActiveUntil.toISOString()}`);
        results.push({
          imei: device.imei, success: true, relay_duration: duration,
          action: "extended", active_until: newActiveUntil.toISOString(),
        });
      } else {
        // Send power-on to energize relay → siren sounds
        console.log(`[GPS] Activating siren (power-on) on ${device.imei} for ${duration}s`);
        try {
          const result = await sendDeviceCommand(device.imei, "power-on");
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

      // Schedule automatic power-off after duration
      restorePromises.push((async () => {
        const waitMs = newActiveUntil.getTime() - Date.now();
        if (waitMs > 0) {
          console.log(`[GPS] Scheduling power-off for ${device.imei} in ${Math.round(waitMs / 1000)}s`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        // Check if timer was extended by another alarm
        const { data: current } = await supabase
          .from("gps_devices")
          .select("relay_active_until")
          .eq("imei", device.imei)
          .single();

        const currentUntil = current?.relay_active_until ? new Date(current.relay_active_until) : null;
        if (currentUntil && currentUntil > new Date()) {
          console.log(`[GPS] Power-off skipped for ${device.imei}: timer was extended`);
          return;
        }

        // Send power-off to cut power → siren stops
        console.log(`[GPS] Stopping siren (power-off) on ${device.imei}`);
        await sendDeviceCommand(device.imei, "power-off");

        await supabase
          .from("gps_devices")
          .update({ relay_active_until: null })
          .eq("imei", device.imei);
      })());
    }

    Promise.all(restorePromises).catch((err) =>
      console.error("[GPS] Error in scheduled power-off:", err)
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
