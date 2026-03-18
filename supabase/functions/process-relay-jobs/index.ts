import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRACCAR_API = Deno.env.get("TRACCAR_API_URL") || "https://gps.smarturban.co/api";

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
  const jsessionid = setCookie?.match(/JSESSIONID=([^;]+)/)?.[1];
  if (!jsessionid) throw new Error("No JSESSIONID");

  return `JSESSIONID=${jsessionid}`;
}

async function postCommandAttempt(
  cookie: string,
  name: string,
  payload: Record<string, unknown>,
): Promise<CommandAttemptResult> {
  const res = await fetch(`${TRACCAR_API}/commands`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  console.log(`[Worker] Attempt ${name} -> ${res.status} ${body}`);

  return {
    name,
    ok: res.ok,
    status: res.status,
    body,
  };
}

function getRelayTextCommands(action: string): string[] {
  if (action === "engineStop") {
    return ["RELAY,1#", "relay,1#", "222#"];
  }

  if (action === "engineResume") {
    return ["RELAY,0#", "relay,0#", "333#"];
  }

  return [];
}

async function sendCommand(cookie: string, deviceId: number, action: string): Promise<boolean> {
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

  const success = attempts.some((a) => a.ok);
  if (success) {
    console.log(`[Worker] ✓ ${action} sent to device ${deviceId}`);
  } else {
    console.error(`[Worker] ✗ ${action} failed for device ${deviceId}: ${attempts.map((a) => `${a.name}:${a.status}`).join(" | ")}`);
  }

  return success;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();
    const { data: jobs, error } = await supabase
      .from("gps_relay_jobs")
      .select("id, imei, device_id_traccar, action, execute_at, status")
      .eq("status", "pending")
      .lte("execute_at", now)
      .order("execute_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("[Worker] DB error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobs?.length) {
      console.log("[Worker] No pending relay jobs");
      return new Response(JSON.stringify({ processed: 0, total: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Worker] Processing ${jobs.length} pending relay jobs`);

    const cookie = await traccarLogin();
    let processed = 0;

    for (const job of jobs) {
      const { data: markedRows, error: markError } = await supabase
        .from("gps_relay_jobs")
        .update({ status: "processing" })
        .eq("id", job.id)
        .eq("status", "pending")
        .select("id");

      if (markError) {
        console.error(`[Worker] Failed to mark job ${job.id} as processing:`, markError.message);
        continue;
      }

      if (!markedRows?.length) {
        continue;
      }

      const success = await sendCommand(cookie, job.device_id_traccar, job.action);

      if (success) {
        await supabase
          .from("gps_relay_jobs")
          .update({ status: "completed", completed_at: new Date().toISOString(), error_message: null })
          .eq("id", job.id);

        const { data: newerJobs } = await supabase
          .from("gps_relay_jobs")
          .select("id")
          .eq("imei", job.imei)
          .eq("action", "engineResume")
          .in("status", ["pending", "processing"])
          .gt("execute_at", job.execute_at)
          .limit(1);

        if (!newerJobs?.length) {
          await supabase
            .from("gps_devices")
            .update({ relay_active_until: null })
            .eq("imei", job.imei);
        }

        processed++;
      } else {
        await supabase
          .from("gps_relay_jobs")
          .update({ status: "error", error_message: "Command rejected by Traccar" })
          .eq("id", job.id);
      }
    }

    console.log(`[Worker] Done. Processed: ${processed}/${jobs.length}`);

    return new Response(JSON.stringify({ processed, total: jobs.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Worker] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});