import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRACCAR_API = Deno.env.get("TRACCAR_API_URL") || "https://gps.smarturban.co/api";

type DeviceAction = "engineStop" | "engineResume" | "nosleep";

type CommandAttemptResult = {
  name: string;
  ok: boolean;
  status: number;
  body: string;
};

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
    console.error(`[Traccar] Device lookup failed for ${imei}: ${res.status}`);
    return null;
  }

  const devices = await res.json();
  if (!devices?.length) {
    console.warn(`[Traccar] No device found for IMEI ${imei}`);
    return null;
  }

  return devices[0].id;
}

async function postCommandAttempt(
  cookie: string,
  name: string,
  payload: Record<string, unknown>,
): Promise<CommandAttemptResult> {
  const res = await fetch(`${TRACCAR_API}/commands/send`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  console.log(`[Traccar] Attempt ${name} -> ${res.status} ${body}`);

  return {
    name,
    ok: res.ok,
    status: res.status,
    body,
  };
}

function getRelayTextCommands(action: DeviceAction): string[] {
  if (action === "engineStop") {
    return ["RELAY,1#", "relay,1#", "222#"];
  }

  if (action === "engineResume") {
    return ["RELAY,0#", "relay,0#", "333#"];
  }

  return [];
}

async function sendDeviceCommand(
  cookie: string,
  deviceId: number,
  action: DeviceAction,
): Promise<{ success: boolean; response?: string; error?: string; attempts: CommandAttemptResult[] }> {
  try {
    const attempts: CommandAttemptResult[] = [];

    const nativeAttempt = await postCommandAttempt(cookie, "native", {
      deviceId,
      type: action,
      description: `TeleGuardia ${action}`,
      attributes: {},
    });
    attempts.push(nativeAttempt);

    if (action === "engineStop" || action === "engineResume") {
      const fallbackAttempt = await postCommandAttempt(cookie, "fallback-command", {
        deviceId,
        type: "command",
        description: `TeleGuardia ${action}`,
        data: { command: action },
      });
      attempts.push(fallbackAttempt);

      const relayCommands = getRelayTextCommands(action);

      for (const relayCommand of relayCommands) {
        const customGprsAttempt = await postCommandAttempt(cookie, `custom-gprs-${relayCommand}`, {
          deviceId,
          type: "custom",
          textChannel: false,
          description: `TeleGuardia ${action} relay gprs`,
          attributes: { data: relayCommand },
        });
        attempts.push(customGprsAttempt);

        const customSmsAttempt = await postCommandAttempt(cookie, `custom-sms-${relayCommand}`, {
          deviceId,
          type: "custom",
          textChannel: true,
          description: `TeleGuardia ${action} relay sms`,
          attributes: { data: relayCommand },
        });
        attempts.push(customSmsAttempt);
      }
    }

    const successful = attempts.filter((a) => a.ok);
    if (successful.length > 0) {
      return {
        success: true,
        response: successful.map((a) => `${a.name}:${a.status}`).join(", "),
        attempts,
      };
    }

    return {
      success: false,
      error: attempts.map((a) => `${a.name}:${a.status} ${a.body}`).join(" | "),
      attempts,
    };
  } catch (err) {
    console.error(`[Traccar] Error:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "API request failed",
      attempts: [],
    };
  }
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

function normalizeParcel(parcel: string): string {
  return (parcel || "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { alarm_type, imei, action, alarm_id } = body;

    const cookie = await traccarLogin();

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

    const supabase = getSupabase();

    let alarmPhone = "";
    let alarmParcel = "";

    if (alarm_id) {
      const { data: alarmRow } = await supabase
        .from("alarms")
        .select("phone_number, parcel_name")
        .eq("id", alarm_id)
        .maybeSingle();

      alarmPhone = alarmRow?.phone_number || "";
      alarmParcel = alarmRow?.parcel_name || "";
    }

    const senderPhone = normalizePhone(body.phone_number || alarmPhone || "");
    const clientParcel = normalizeParcel(body.parcel_name || alarmParcel || "");

    console.log(`[GPS] Alarm triggered. phone="${senderPhone}", client_parcel="${clientParcel}", type="${alarm_type}"`);

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
          resolvedParcel = normalizeParcel(match.parcel_name || "");
          console.log(`[GPS] Phone ${senderPhone} -> parcel "${match.parcel_name}" (normalized: "${resolvedParcel}")`);
        } else {
          console.log(`[GPS] Phone ${senderPhone} not found in registered_numbers`);
        }
      }
    }

    const finalParcel = resolvedParcel || clientParcel;

    if (!finalParcel) {
      return new Response(JSON.stringify({
        success: false,
        reason: "no_parcel_resolved",
        message: "No se pudo determinar la parcela del remitente",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: allDevices, error: dbError } = await supabase
      .from("gps_devices")
      .select("imei, relay_duration, relay_active_until, parcel_name");

    if (dbError) {
      console.error("[GPS] DB error:", dbError);
      return new Response(JSON.stringify({ success: false, reason: "db_error", error: dbError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetDevices = (allDevices || []).filter((d: any) =>
      normalizeParcel(d.parcel_name || "") === finalParcel,
    );

    console.log(`[GPS] Parcel: "${finalParcel}" | Total devices: ${allDevices?.length || 0} | Matched: ${targetDevices.length}`);

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        reason: "no_devices_for_parcel",
        message: `No hay dispositivos GPS para la parcela "${finalParcel}"`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

      console.log(`[GPS] Sending engineStop -> IMEI=${device.imei}, duration=${duration}s`);
      const stopResult = await sendDeviceCommand(cookie, traccarDeviceId, "engineStop");

      if (!stopResult.success) {
        results.push({ imei: device.imei, success: false, error: stopResult.error, attempts: stopResult.attempts });
        continue;
      }

      await supabase
        .from("gps_devices")
        .update({ relay_active_until: executeAt.toISOString() })
        .eq("imei", device.imei);

      await supabase
        .from("gps_relay_jobs")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
          error_message: "Reemplazado por una alarma más reciente",
        })
        .eq("imei", device.imei)
        .eq("action", "engineResume")
        .in("status", ["pending", "processing"]);

      const { error: jobError } = await supabase
        .from("gps_relay_jobs")
        .insert({
          imei: device.imei,
          device_id_traccar: traccarDeviceId,
          action: "engineResume",
          status: "pending",
          execute_at: executeAt.toISOString(),
          alarm_id: alarm_id || null,
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
        attempts: stopResult.attempts,
      });
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
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});