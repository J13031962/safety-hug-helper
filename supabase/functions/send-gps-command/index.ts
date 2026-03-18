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

// Send command with fallback: try native type first, if it fails try generic "command" type
async function sendDeviceCommand(
  cookie: string,
  deviceId: number,
  action: DeviceAction
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    // Attempt 1: native type (engineStop / engineResume)
    const nativePayload = {
      deviceId,
      type: action,
      description: `TeleGuardia ${action}`,
      attributes: {},
    };

    console.log(`[Traccar] POST /commands → deviceId=${deviceId}, type=${action}`);
    const res1 = await fetch(`${TRACCAR_API}/commands`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(nativePayload),
    });

    const body1 = await res1.text();
    console.log(`[Traccar] Response: ${res1.status} ${body1}`);

    if (res1.ok) {
      return { success: true, response: body1 };
    }

    // Attempt 2: fallback generic command type
    if (action === "engineStop" || action === "engineResume") {
      const fallbackPayload = {
        deviceId,
        type: "command",
        description: `TeleGuardia ${action}`,
        data: { command: action },
      };

      console.log(`[Traccar] Fallback POST /commands → type=command, data.command=${action}`);
      const res2 = await fetch(`${TRACCAR_API}/commands`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify(fallbackPayload),
      });

      const body2 = await res2.text();
      console.log(`[Traccar] Fallback response: ${res2.status} ${body2}`);

      if (res2.ok) {
        return { success: true, response: body2 };
      }

      return { success: false, error: `Native: ${res1.status} ${body1} | Fallback: ${res2.status} ${body2}` };
    }

    return { success: false, error: `${res1.status}: ${body1}` };
  } catch (err) {
    console.error(`[Traccar] Error:`, err);
    return { success: false, error: err instanceof Error ? err.message : "API request failed" };
  }
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Normalize phone: keep only digits
function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

// Match phones flexibly (suffix match)
function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { alarm_type, imei, action, phone_number } = body;

    const cookie = await traccarLogin();

    // ── Manual actions (engineStop, engineResume, nosleep by IMEI) ──
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

    // ── Alarm trigger: resolve parcel from phone number ──
    const supabase = getSupabase();
    const senderPhone = normalizePhone(phone_number || body.phone_number || "");
    const clientParcel = (body.parcel_name || "").trim().toLowerCase();

    console.log(`[GPS] Alarm triggered. phone="${senderPhone}", client_parcel="${clientParcel}", type="${alarm_type}"`);

    // Step 1: Resolve parcel from registered_numbers by phone
    let resolvedParcel: string | null = null;

    if (senderPhone) {
      const { data: regNumbers } = await supabase
        .from("registered_numbers")
        .select("phone_number, parcel_name");

      if (regNumbers) {
        const match = regNumbers.find((r: any) => {
          const regDigits = normalizePhone(r.phone_number);
          return phonesMatch(regDigits, senderPhone);
        });

        if (match) {
          resolvedParcel = (match.parcel_name || "").trim().toLowerCase();
          console.log(`[GPS] Phone ${senderPhone} → parcel "${match.parcel_name}" (normalized: "${resolvedParcel}")`);
        } else {
          console.log(`[GPS] Phone ${senderPhone} not found in registered_numbers`);
        }
      }
    }

    // Fallback to client-provided parcel if phone lookup failed
    const finalParcel = resolvedParcel || clientParcel;

    if (!finalParcel) {
      console.log(`[GPS] No parcel resolved. phone="${senderPhone}", client_parcel="${clientParcel}"`);
      return new Response(JSON.stringify({
        success: false,
        reason: "no_parcel_resolved",
        message: "No se pudo determinar la parcela del remitente",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: Find GPS devices for the resolved parcel
    const { data: allDevices, error: dbError } = await supabase
      .from("gps_devices")
      .select("imei, relay_duration, relay_active_until, parcel_name");

    if (dbError) {
      console.error("[GPS] DB error:", dbError);
      return new Response(JSON.stringify({ success: false, reason: "db_error", error: dbError.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetDevices = (allDevices || []).filter((d: any) =>
      (d.parcel_name || "").trim().toLowerCase() === finalParcel
    );

    console.log(`[GPS] Parcel: "${finalParcel}" | Total devices: ${allDevices?.length || 0} | Matched: ${targetDevices.length}`);

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        reason: "no_devices_for_parcel",
        message: `No hay dispositivos GPS para la parcela "${finalParcel}"`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 3: Send engineStop to each device and create persistent relay job
    const now = new Date();
    const results: any[] = [];

    for (const device of targetDevices) {
      const duration = device.relay_duration ?? 30;
      const executeAt = new Date(now.getTime() + duration * 1000);

      const traccarDeviceId = await findDeviceId(cookie, device.imei);
      if (!traccarDeviceId) {
        results.push({ imei: device.imei, success: false, error: `IMEI ${device.imei} not in Traccar` });
        continue;
      }

      // Send engineStop
      console.log(`[GPS] Sending engineStop → IMEI=${device.imei}, duration=${duration}s`);
      const stopResult = await sendDeviceCommand(cookie, traccarDeviceId, "engineStop");

      if (!stopResult.success) {
        results.push({ imei: device.imei, success: false, error: stopResult.error });
        continue;
      }

      // Update relay_active_until
      await supabase
        .from("gps_devices")
        .update({ relay_active_until: executeAt.toISOString() })
        .eq("imei", device.imei);

      // Create persistent job for engineResume
      const { error: jobError } = await supabase
        .from("gps_relay_jobs")
        .insert({
          imei: device.imei,
          device_id_traccar: traccarDeviceId,
          action: "engineResume",
          status: "pending",
          execute_at: executeAt.toISOString(),
        });

      if (jobError) {
        console.error(`[GPS] Failed creating relay job for ${device.imei}:`, jobError.message);
      }

      console.log(`[GPS] ✓ engineStop sent, engineResume scheduled at ${executeAt.toISOString()} (${duration}s)`);

      results.push({
        imei: device.imei,
        success: true,
        relay_duration: duration,
        resume_at: executeAt.toISOString(),
      });

      // Also try inline setTimeout as backup (may not survive if runtime dies)
      setTimeout(async () => {
        try {
          console.log(`[GPS] Inline resume timer fired for ${device.imei}`);
          const freshCookie = await traccarLogin();
          const devId = await findDeviceId(freshCookie, device.imei);
          if (devId) {
            await sendDeviceCommand(freshCookie, devId, "engineResume");
            console.log(`[GPS] ✓ Inline engineResume sent for ${device.imei}`);
          }
          // Mark job as done
          await supabase
            .from("gps_relay_jobs")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("imei", device.imei)
            .eq("status", "pending");
          // Clear relay_active_until
          await supabase
            .from("gps_devices")
            .update({ relay_active_until: null })
            .eq("imei", device.imei);
        } catch (e) {
          console.error(`[GPS] Inline resume error for ${device.imei}:`, e);
        }
      }, duration * 1000);
    }

    return new Response(JSON.stringify({
      success: results.some((r) => r.success),
      alarm_type,
      parcel_resolved: finalParcel,
      phone_used: senderPhone || null,
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
