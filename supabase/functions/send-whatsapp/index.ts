import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALARM_LABELS: Record<string, string> = {
  panic: "🚨 PÁNICO",
  medical: "🏥 EMERGENCIA MÉDICA",
  fire: "🔥 INCENDIO",
  disaster: "⚠️ DESASTRE",
};

const normalize = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TEXTMEBOT_API_KEY = Deno.env.get("TEXTMEBOT_API_KEY");
    if (!TEXTMEBOT_API_KEY) {
      throw new Error("TEXTMEBOT_API_KEY not configured");
    }

    const body = await req.json();

    // Action: get_group_id — fetch group ID from invite code
    if (body.action === "get_group_id") {
      const { invite_code } = body;
      if (!invite_code) throw new Error("invite_code is required");

      const url = `https://api.textmebot.com/send.php?apikey=${encodeURIComponent(TEXTMEBOT_API_KEY)}&group_info=${encodeURIComponent(invite_code)}&json=yes`;
      console.log("Fetching group info for invite code:", invite_code);
      const res = await fetch(url);
      const text = await res.text();
      console.log("Group info response:", text.substring(0, 500));

      // Try to parse group_id from JSON response
      try {
        const parsed = JSON.parse(text.trim());
        if (parsed.group_id) {
          return new Response(
            JSON.stringify({ success: true, group_id: parsed.group_id, subject: parsed.subject }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (_) {
        // Not JSON, return raw
      }

      return new Response(
        JSON.stringify({ success: false, response: text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normal alarm flow
    const {
      alarm_type,
      sender_name,
      phone_number,
      parcel_name,
      house_number,
      latitude,
      longitude,
      address,
    } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build message
    const label = ALARM_LABELS[alarm_type] || `🚨 ${alarm_type?.toUpperCase()}`;
    let msg = `*SmartSOS informa:*\n\n${label}\n`;
    if (sender_name) msg += `\n👤 ${sender_name}`;
    if (house_number) msg += `\n🏠 Casa: ${house_number}`;
    if (parcel_name) msg += `\n📍 Parcela: ${parcel_name}`;
    if (address) msg += `\n📌 ${address}`;

    const lat = latitude !== null && latitude !== undefined ? Number(latitude) : NaN;
    const lng = longitude !== null && longitude !== undefined ? Number(longitude) : NaN;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const fallbackLocation = [house_number ? `Casa ${house_number}` : null, parcel_name ? `Parcela ${parcel_name}` : null]
      .filter(Boolean)
      .join(", ");
    const mapQuery = hasCoords ? `${lat},${lng}` : (address?.trim() || fallbackLocation);

    if (mapQuery) {
      msg += `\n🗺️ https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`;
    }

    // Fetch invite link for the parcel's WhatsApp group
    let inviteLink: string | null = null;
    if (parcel_name) {
      const { data: parcelData } = await supabase
        .from("parcels")
        .select("whatsapp_invite_link")
        .ilike("name", parcel_name)
        .maybeSingle();
      inviteLink = parcelData?.whatsapp_invite_link || null;
    }

    if (inviteLink) {
      msg += `\n\n💬 Chat en grupo: ${inviteLink}`;
    }

    msg += `\n\n🌐 www.teleguardia.com`;

    const results = [];

    // 1) Send to WhatsApp group for this parcel
    if (parcel_name) {
      const { data: parcel } = await supabase
        .from("parcels")
        .select("whatsapp_group_id")
        .ilike("name", parcel_name)
        .maybeSingle();

      if (parcel?.whatsapp_group_id) {
        try {
          const formData = new URLSearchParams();
          formData.append("recipient", parcel.whatsapp_group_id);
          formData.append("apikey", TEXTMEBOT_API_KEY);
          formData.append("text", msg);

          console.log(`Sending to group [${parcel_name}]: ${parcel.whatsapp_group_id}`);
          const res = await fetch("https://api.textmebot.com/send.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          });
          const text = await res.text();
          console.log(`TextMeBot -> GROUP [${parcel_name}]: ${res.status} ${text.substring(0, 200)}`);
          results.push({
            phone: `GROUP:${parcel_name}`,
            ok: res.status >= 200 && res.status < 300,
            httpStatus: res.status,
            providerResponse: text.substring(0, 200),
          });

          // Wait before next message
          await new Promise((r) => setTimeout(r, 6000));
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`TextMeBot -> GROUP [${parcel_name}]: FAILED ${errorMessage}`);
          results.push({ phone: `GROUP:${parcel_name}`, ok: false, httpStatus: 0, providerResponse: errorMessage });
        }
      } else {
        console.log(`No WhatsApp group configured for parcel: ${parcel_name}`);
      }
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    const firstError = results.find((r) => !r.ok)?.providerResponse ?? null;

    return new Response(
      JSON.stringify({ success: failed === 0, sent, failed, total: results.length, first_error: firstError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-whatsapp error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
