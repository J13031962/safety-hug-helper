import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRACCAR_API = "http://192.99.16.163:8082/api";

type DeviceAction = "relay-on" | "relay-off" | "nosleep";

// Map actions to Traccar command types
const TRACCAR_COMMANDS: Record<DeviceAction, { type: string; data: Record<string, string> }> = {
  "relay-on":  { type: "custom", data: { data: "AT^GT_CM=RELAY,1#" } },
  "relay-off": { type: "custom", data: { data: "AT^GT_CM=RELAY,0#" } },
  "nosleep":   { type: "custom", data: { data: "nosleep#" } },
};

// Login to Traccar and get session cookie
async function traccarLogin(): Promise<string> {
  const email = Deno.env.get("TRACCAR_EMAIL")!;
  const password = Deno.env.get("TRACCAR_PASSWORD")!;

  const res = await fetch(`${TRACCAR_API}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Traccar login failed: ${res.status} ${body}`);
  }

  // Extract session cookie
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("No session cookie from Traccar");
  
  const jsessionid = setCookie.match(/JSESSIONID=([^;]+)/)?.[1];
  if (!jsessionid) throw new Error("No JSESSIONID in cookie");

  console.log("[Traccar] Login OK");
  return `JSESSIONID=${jsessionid}`;
}

// Find Traccar device ID by IMEI
async function findDeviceId(cookie: string, imei: string): Promise<number | null> {
  const res = await fetch(`${TRACCAR_API}/devices?uniqueId=${imei}`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) {
    console.error(`[Traccar] Device lookup failed: ${res.status}`);
    return null;
  }

  const devices = await res.json();
  if (devices.length === 0) {
    console.warn(`[Traccar] No device found for IMEI ${imei}`);
    return null;
  }

  return devices[0].id;
}

// Send command to device via Traccar
async function sendDeviceCommand(
  cookie: string,
  deviceId: number,
  action: DeviceAction
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const cmd = TRACCAR_COMMANDS[action];
    const payload = {
      deviceId,
      type: cmd.type,
      description: `TeleGuardia ${action}`,
      attributes: cmd.data,
    };

    console.log(`[Traccar] POST /commands/send → deviceId=${deviceId}, type=${cmd.type}, data=${JSON.stringify(cmd.data)}`);

    const res = await fetch(`${TRACCAR_API}/commands/send`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.text();
    console.log(`[Traccar] Status: ${res.status}, Body: ${body}`);

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }

    return { success: true, response: body };
  } catch (err) {
    console.error(`[Traccar] Error:`, err);
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

    // Login to Traccar
    const cookie = await traccarLogin();

    // ── Manual actions (nosleep, relay-on, relay-off) ──
    if (action && imei) {
      const deviceId = await findDeviceId(cookie, imei);
      if (!deviceId) {
        return new Response(JSON.stringify({ success: false, error: `Device ${imei} not found in Traccar` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await sendDeviceCommand(cookie, deviceId, action as DeviceAction);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Alarm trigger: activate siren on matching devices ──
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
      const currentActiveUntil = device.relay_active_until ? new Date(device.relay_active_until) : null;
      const isRelayActive = currentActiveUntil && currentActiveUntil > now;

      // Update the active_until timestamp
      await supabase
        .from("gps_devices")
        .update({ relay_active_until: newActiveUntil.toISOString() })
        .eq("imei", device.imei);

      // Find Traccar device ID
      const traccarDeviceId = await findDeviceId(cookie, device.imei);
      if (!traccarDeviceId) {
        results.push({
          imei: device.imei, success: false, action: "error",
          error: `Device not found in Traccar for IMEI ${device.imei}`,
        });
        continue;
      }

      if (isRelayActive) {
        console.log(`[GPS] Siren already active on ${device.imei}, timer extended`);
        results.push({
          imei: device.imei, success: true, relay_duration: duration,
          action: "extended", active_until: newActiveUntil.toISOString(),
        });
      } else {
        console.log(`[GPS] Activating siren on ${device.imei} for ${duration}s`);
        try {
          const result = await sendDeviceCommand(cookie, traccarDeviceId, "relay-on");
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

        console.log(`[GPS] Stopping siren on ${device.imei}`);
        // Re-login in case session expired
        const newCookie = await traccarLogin();
        const devId = await findDeviceId(newCookie, device.imei);
        if (devId) await sendDeviceCommand(newCookie, devId, "relay-off");

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
