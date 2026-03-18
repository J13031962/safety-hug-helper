import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRACCAR_API = Deno.env.get("TRACCAR_API_URL") || "https://gps.smarturban.co/api";

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

async function sendCommand(cookie: string, deviceId: number, action: string): Promise<boolean> {
  // Try native type first
  const res1 = await fetch(`${TRACCAR_API}/commands`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, type: action, description: `TeleGuardia ${action}`, attributes: {} }),
  });
  const body1 = await res1.text();
  if (res1.ok) {
    console.log(`[Worker] ✓ ${action} sent to device ${deviceId}: ${body1}`);
    return true;
  }

  // Fallback
  const res2 = await fetch(`${TRACCAR_API}/commands`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, type: "command", description: `TeleGuardia ${action}`, data: { command: action } }),
  });
  const body2 = await res2.text();
  if (res2.ok) {
    console.log(`[Worker] ✓ ${action} (fallback) sent to device ${deviceId}: ${body2}`);
    return true;
  }

  console.error(`[Worker] ✗ ${action} failed for device ${deviceId}: ${res1.status} / ${res2.status}`);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find pending jobs whose execute_at has passed
    const now = new Date().toISOString();
    const { data: jobs, error } = await supabase
      .from("gps_relay_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("execute_at", now)
      .limit(20);

    if (error) {
      console.error("[Worker] DB error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Worker] Processing ${jobs.length} pending relay jobs`);
    const cookie = await traccarLogin();
    let processed = 0;

    for (const job of jobs) {
      // Mark as processing
      await supabase
        .from("gps_relay_jobs")
        .update({ status: "processing" })
        .eq("id", job.id);

      const success = await sendCommand(cookie, job.device_id_traccar, job.action);

      if (success) {
        await supabase
          .from("gps_relay_jobs")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", job.id);

        // Clear relay_active_until
        await supabase
          .from("gps_devices")
          .update({ relay_active_until: null })
          .eq("imei", job.imei);

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
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Worker] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
