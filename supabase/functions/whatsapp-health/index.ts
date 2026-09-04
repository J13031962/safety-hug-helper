import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { dbOptions } from "../_shared/dbSchema.ts";

const TEXTMEBOT_API_KEY = Deno.env.get("TEXTMEBOT_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey, dbOptions);

    // Authenticate caller: cron token stored in service_config
    const cronToken = req.headers.get("x-cron-token");
    const { data: tokenRow, error: tokenErr } = await sb
      .from("service_config")
      .select("value")
      .eq("key", "whatsapp_health_cron_token")
      .single();

    if (tokenErr || !tokenRow || cronToken !== tokenRow.value) {
      console.error("[whatsapp-health] Unauthorized call. Token present:", !!cronToken, "DB error:", tokenErr?.message);
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      // cron uses empty body; external reports send JSON
    }

    let status: "up" | "down" = "up";
    let reason = "ok";

    if (body.service === "whatsapp" && (body.status === "up" || body.status === "down")) {
      status = body.status;
      reason = body.reason || "reported";
    } else {
      const health = await checkTextMeBotHealth();
      status = health.status;
      reason = health.reason;
    }

    // Log this check
    const { error: logErr } = await sb.from("service_status_log").insert({
      service: "whatsapp",
      status,
      reason,
    });
    if (logErr) {
      console.error("[whatsapp-health] Failed to insert log:", logErr);
    }

    // Read current persisted status
    const { data: current, error: currentErr } = await sb
      .from("service_status")
      .select("service, status, changed_at, last_reason")
      .eq("service", "whatsapp")
      .single();

    if (currentErr) {
      console.error("[whatsapp-health] Failed to read service_status:", currentErr);
    }

    // Only act on transitions (or first run)
    if (!current || current.status !== status) {
      const { error: upsertErr } = await sb
        .from("service_status")
        .upsert(
          {
            service: "whatsapp",
            status,
            changed_at: new Date().toISOString(),
            last_reason: reason,
          },
          { onConflict: "service" }
        );

      if (upsertErr) {
        console.error("[whatsapp-health] Failed to upsert service_status:", upsertErr);
      }

      // Notify CRA for every parcel with an account number
      const { data: parcels, error: parcelsErr } = await sb
        .from("parcels")
        .select("name, account_number")
        .not("account_number", "is", null);

      if (parcelsErr) {
        console.error("[whatsapp-health] Failed to fetch parcels:", parcelsErr);
      }

      const alarmType = status === "down" ? "trouble" : "trouble_restore";
      const results: any[] = [];

      for (const p of parcels || []) {
        try {
          const siaRes = await sb.functions.invoke("send-sia-event", {
            body: {
              alarm_type: alarmType,
              parcel_name: p.name,
              cra_user_number: "001",
              source: "whatsapp-health",
            },
          });
          results.push({ parcel: p.name, ok: !siaRes.error, error: siaRes.error });
        } catch (siaErr: any) {
          console.error(`[whatsapp-health] SIA notification failed for ${p.name}:`, siaErr);
          results.push({ parcel: p.name, ok: false, error: siaErr.message });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status,
          reason,
          changed: true,
          parcels_notified: results.length,
          details: results,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, status, reason, changed: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[whatsapp-health] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkTextMeBotHealth(): Promise<{ status: "up" | "down"; reason: string }> {
  if (!TEXTMEBOT_API_KEY) {
    return { status: "down", reason: "TEXTMEBOT_API_KEY not configured" };
  }

  try {
    const url = `https://api.textmebot.com/send.php?apikey=${encodeURIComponent(TEXTMEBOT_API_KEY)}&group_info=healthcheck&json=yes`;
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    const lower = text.toLowerCase();

    const disconnected =
      lower.includes("disconnected") ||
      lower.includes("411") ||
      lower.includes("not connected") ||
      lower.includes("session expired") ||
      lower.includes("session invalid") ||
      lower.includes("unlinked") ||
      lower.includes("logout") ||
      lower.includes("invalid session") ||
      lower.includes("phone number is disconnected");

    if (disconnected) {
      return { status: "down", reason: `TextMeBot disconnected (${res.status}): ${text.substring(0, 200)}` };
    }

    return { status: "up", reason: `TextMeBot reachable (${res.status}): ${text.substring(0, 120)}` };
  } catch (err: any) {
    return { status: "down", reason: `TextMeBot unreachable: ${err.message}` };
  }
}
