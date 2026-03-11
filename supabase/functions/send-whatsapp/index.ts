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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TEXTMEBOT_API_KEY = Deno.env.get("TEXTMEBOT_API_KEY");
    if (!TEXTMEBOT_API_KEY) {
      throw new Error("TEXTMEBOT_API_KEY not configured");
    }

    const {
      alarm_type,
      sender_name,
      phone_number,
      parcel_name,
      house_number,
      latitude,
      longitude,
      address,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get contacts — filter by parcel if provided
    let query = supabase
      .from("registered_numbers")
      .select("phone_number, owner_name, parcel_name");

    if (parcel_name) {
      query = query.eq("parcel_name", parcel_name);
    }

    const { data: contacts, error: dbErr } = await query;
    if (dbErr) throw dbErr;

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No contacts found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build message
    const label = ALARM_LABELS[alarm_type] || `🚨 ${alarm_type?.toUpperCase()}`;
    let msg = `${label}\n`;
    if (sender_name) msg += `👤 ${sender_name}\n`;
    if (house_number) msg += `🏠 Casa: ${house_number}\n`;
    if (parcel_name) msg += `📍 Parcela: ${parcel_name}\n`;
    if (address) msg += `📌 ${address}\n`;
    if (latitude && longitude) {
      msg += `🗺️ https://maps.google.com/?q=${latitude},${longitude}\n`;
    }
    if (phone_number) msg += `📞 ${phone_number}`;

    const encoded = encodeURIComponent(msg);

    // Normalize phone: ensure +57 prefix for Colombian numbers
    const normalize = (phone: string) => {
      const digits = phone.replace(/\D/g, "");
      if (digits.startsWith("57") && digits.length >= 12) return `+${digits}`;
      if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
      return phone.startsWith("+") ? phone : `+${digits}`;
    };

    // Send to all contacts via TextMeBot sequentially (API may rate-limit parallel calls)
    const results = [];
    for (const contact of contacts) {
      try {
        const recipient = normalize(contact.phone_number);
        const formData = new URLSearchParams();
        formData.append("recipient", recipient);
        formData.append("apikey", TEXTMEBOT_API_KEY);
        formData.append("text", msg);

        const res = await fetch("https://api.textmebot.com/send.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
        const text = await res.text();
        console.log(`TextMeBot -> ${recipient}: ${res.status} ${text.substring(0, 200)}`);
        results.push({ status: "fulfilled", phone: recipient, httpStatus: res.status });
      } catch (err) {
        console.error(`TextMeBot -> ${contact.phone_number}: FAILED`, err.message);
        results.push({ status: "rejected", phone: contact.phone_number });
      }
      // Small delay between sends to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1500));
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: contacts.length }),
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
