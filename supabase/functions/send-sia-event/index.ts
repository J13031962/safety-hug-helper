import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIA_HOST = "51.79.66.148";
const SIA_PORT = 9558;

const EVENT_CODES: Record<string, string> = {
  panic: "PA",
  fire: "FA",
  medical: "MA",
  disaster: "BA",
  test: "OP",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { alarm_type, parcel_name, phone_number, cra_user_number, source } = await req.json();

    if (!alarm_type || !parcel_name) {
      return new Response(
        JSON.stringify({ success: false, reason: "missing_params", message: "alarm_type and parcel_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventCode = EVENT_CODES[alarm_type];
    if (!eventCode) {
      return new Response(
        JSON.stringify({ success: false, reason: "invalid_alarm_type", message: `Unknown alarm type: ${alarm_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Get account_number from parcel
    const { data: parcel, error: parcelErr } = await sb
      .from("parcels")
      .select("account_number")
      .ilike("name", parcel_name.trim())
      .maybeSingle();

    if (parcelErr) {
      console.error("[SIA] Parcel lookup error:", parcelErr);
      return new Response(
        JSON.stringify({ success: false, reason: "db_error", message: parcelErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountNumber = parcel?.account_number;
    if (!accountNumber) {
      console.log("[SIA] No account_number for parcel:", parcel_name);
      return new Response(
        JSON.stringify({ success: false, reason: "no_account", message: `Parcela "${parcel_name}" no tiene número de abonado CRA configurado.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user_number from registered_number (zone)
    let zone = "001"; // default zone
    if (phone_number) {
      const phoneDigits = phone_number.replace(/\D/g, "");
      const { data: regNumbers } = await sb
        .from("registered_numbers")
        .select("user_number, phone_number")
        .ilike("parcel_name", parcel_name.trim());

      if (regNumbers) {
        const match = regNumbers.find((r: any) => {
          const rd = r.phone_number.replace(/\D/g, "");
          return rd === phoneDigits || rd.endsWith(phoneDigits) || phoneDigits.endsWith(rd);
        });
        if (match?.user_number) {
          zone = match.user_number.padStart(3, "0");
        }
      }
    }

    // For test events (OP), zone is not needed — send without zone suffix
    const zoneStr = alarm_type === "test" ? "" : zone;
    const message = `"SIA-DCS"0001L0#${accountNumber}[#${accountNumber}|${eventCode}${zoneStr}]_\r\n`;
    console.log("[SIA] Sending:", message.trim(), "to", SIA_HOST, SIA_PORT);

    // Send via TCP
    try {
      const conn = await Deno.connect({ hostname: SIA_HOST, port: SIA_PORT });
      const encoder = new TextEncoder();
      await conn.write(encoder.encode(message));

      // Read response to ensure data is flushed before closing
      const buf = new Uint8Array(256);
      try {
        await conn.read(buf);
      } catch (_) {
        // Server may not respond, that's ok
      }
      conn.close();
      console.log("[SIA] Message sent successfully");
    } catch (tcpErr: any) {
      console.error("[SIA] TCP error:", tcpErr);
      return new Response(
        JSON.stringify({ success: false, reason: "tcp_error", message: `Error de conexión TCP: ${tcpErr.message}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, account: accountNumber, zone: zoneStr, event_code: eventCode, message: message.trim() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[SIA] Error:", err);
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
