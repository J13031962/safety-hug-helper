import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRACCAR_API = Deno.env.get("TRACCAR_API_URL") || "https://gps.smarturban.co/api";

type DeviceAction = "engineStop" | "engineResume" | "nosleep";

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

  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("No session cookie from Traccar");

  const jsessionid = setCookie.match(/JSESSIONID=([^;]+)/)?.[1];
  if (!jsessionid) throw new Error("No JSESSIONID in cookie");

  console.log("[Traccar] Login OK");
  return `JSESSIONID=${jsessionid}`;
}

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

async function sendDeviceCommand(
  cookie: string,
  deviceId: number,
  action: DeviceAction
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const payloads: any[] = (action === "engineStop" || action === "engineResume")
      ? [
          {
            deviceId,
            type: action,
            description: `TeleGuardia ${action}`,
            attributes: {},
          },
          {
            deviceId,
            type: "command",
            description: `TeleGuardia ${action}`,
            data: { command: action },
          },
        ]
      : [
          {
            deviceId,
            type: "command",
            description: `TeleGuardia ${action}`,
            data: { command: action },
          },
        ];

    const successBodies: string[] = [];
    const failedAttempts: string[] = [];

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      console.log(`[Traccar] POST /commands (attempt ${i + 1}/${payloads.length}) → deviceId=${deviceId}, action=${action}, type=${payload.type}`);
      console.log(`[Traccar] Payload: ${JSON.stringify(payload)}`);

      const res = await fetch(`${TRACCAR_API}/commands`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await res.text();
      console.log(`[Traccar] Response status: ${res.status}, Body: ${body}`);

      if (res.ok) {
        successBodies.push(body);
        continue;
      }

      const errorMsg = `type=${payload.type} HTTP ${res.status}: ${body}`;
      failedAttempts.push(errorMsg);
      console.warn(`[Traccar] Attempt ${i + 1} failed: ${errorMsg}`);
    }

    if (successBodies.length > 0) {
      if (successBodies.length > 1) {
        console.log(`[Traccar] Multiple command formats accepted for action=${action}`);
      }
      return { success: true, response: successBodies[successBodies.length - 1] };
    }

    return { success: false, error: failedAttempts.join(" | ") || "Command rejected by Traccar" };
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

    const cookie = await traccarLogin();

    // ── Manual actions (engineStop, engineResume, nosleep) ──
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

    const alarmParcel = (body.parcel_name || "").trim();
    const normalizedParcel = alarmParcel.toLowerCase();

    // Fetch ALL devices, then filter case-insensitively
    const { data: allDevices, error: dbError } = await supabase
      .from("gps_devices")
      .select("imei, relay_duration, relay_active_until, parcel_name");

    if (dbError) {
      console.error("[GPS] DB error fetching devices:", dbError);
      return new Response(JSON.stringify({ success: false, reason: "db_error", error: dbError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Case-insensitive parcel matching
    const targetDevices = (allDevices || []).filter((d: any) => {
      if (imei) return d.imei === imei;
      if (!normalizedParcel) return true;
      return (d.parcel_name || "").trim().toLowerCase() === normalizedParcel;
    });

    console.log(`[GPS] Parcel requested: "${alarmParcel}" (normalized: "${normalizedParcel}")`);
    console.log(`[GPS] Total devices in DB: ${allDevices?.length || 0}`);
    console.log(`[GPS] Matched devices: ${targetDevices.length}`);
    if (targetDevices.length === 0 && allDevices && allDevices.length > 0) {
      const availableParcels = [...new Set(allDevices.map((d: any) => d.parcel_name))];
      console.log(`[GPS] Available parcels in DB: ${JSON.stringify(availableParcels)}`);
    }

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        reason: "no_devices_for_parcel",
        message: `No hay dispositivos GPS registrados para la parcela "${alarmParcel}"`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const results: any[] = [];
    const restorePromises: Promise<void>[] = [];

    for (const device of targetDevices) {
      const duration = device.relay_duration ?? 30;
      const newActiveUntil = new Date(now.getTime() + duration * 1000);
      const currentActiveUntil = device.relay_active_until ? new Date(device.relay_active_until) : null;
      const wasRelayActive = Boolean(currentActiveUntil && currentActiveUntil > now);

      const traccarDeviceId = await findDeviceId(cookie, device.imei);
      if (!traccarDeviceId) {
        results.push({
          imei: device.imei,
          success: false,
          action: "error",
          error: `Device not found in Traccar for IMEI ${device.imei}`,
        });
        continue;
      }

      console.log(`[GPS] Sending engineStop on ${device.imei} for ${duration}s (${wasRelayActive ? "relay_active_refresh" : "new_cycle"})`);
      const stopResult = await sendDeviceCommand(cookie, traccarDeviceId, "engineStop");

      if (!stopResult.success) {
        results.push({
          imei: device.imei,
          success: false,
          relay_duration: duration,
          action: "error",
          error: stopResult.error || "engineStop rejected by Traccar",
        });
        continue;
      }

      const { error: relayUpdateError } = await supabase
        .from("gps_devices")
        .update({ relay_active_until: newActiveUntil.toISOString() })
        .eq("imei", device.imei);

      if (relayUpdateError) {
        console.error(`[GPS] Failed updating relay_active_until for ${device.imei}:`, relayUpdateError.message);
      }

      results.push({
        imei: device.imei,
        success: true,
        relay_duration: duration,
        action: wasRelayActive ? "retriggered" : "activated",
        active_until: newActiveUntil.toISOString(),
        api_response: stopResult.response,
        db_warning: relayUpdateError?.message,
      });

      // Schedule automatic restore after duration
      restorePromises.push((async () => {
        const waitMs = newActiveUntil.getTime() - Date.now();
        if (waitMs > 0) {
          console.log(`[GPS] Scheduling engineResume for ${device.imei} in ${Math.round(waitMs / 1000)}s`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        const { data: current } = await supabase
          .from("gps_devices")
          .select("relay_active_until")
          .eq("imei", device.imei)
          .single();

        const currentUntil = current?.relay_active_until ? new Date(current.relay_active_until) : null;
        if (currentUntil && currentUntil > new Date()) {
          console.log(`[GPS] engineResume skipped for ${device.imei}: timer was extended`);
          return;
        }

        console.log(`[GPS] Sending engineResume on ${device.imei}`);
        const newCookie = await traccarLogin();
        const devId = await findDeviceId(newCookie, device.imei);
        if (devId) await sendDeviceCommand(newCookie, devId, "engineResume");

        await supabase
          .from("gps_devices")
          .update({ relay_active_until: null })
          .eq("imei", device.imei);
      })());
    }

    Promise.all(restorePromises).catch((err) =>
      console.error("[GPS] Error in scheduled engineResume:", err)
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
