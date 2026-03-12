import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GPS_SERVER_IP = "192.99.16.163";
const GPS_SERVER_PORT = 8821;

/**
 * Send a raw TCP command to the VT08F GPS server
 */
async function sendTcpCommand(command: string): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    console.log(`[GPS-TCP] Connecting to ${GPS_SERVER_IP}:${GPS_SERVER_PORT}...`);
    const conn = await Deno.connect({ hostname: GPS_SERVER_IP, port: GPS_SERVER_PORT });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Send command
    console.log(`[GPS-TCP] Sending command: ${command}`);
    await conn.write(encoder.encode(command + "\n"));

    // Read response with timeout
    const buffer = new Uint8Array(1024);
    let response = "";

    try {
      // Set a read timeout using AbortController
      const timeoutId = setTimeout(() => {
        try { conn.close(); } catch { /* ignore */ }
      }, 5000);

      const bytesRead = await conn.read(buffer);
      clearTimeout(timeoutId);

      if (bytesRead !== null) {
        response = decoder.decode(buffer.subarray(0, bytesRead));
        console.log(`[GPS-TCP] Response: ${response}`);
      }
    } catch (readErr) {
      console.log(`[GPS-TCP] Read timeout or error (command may still have been sent):`, readErr);
    }

    try { conn.close(); } catch { /* ignore */ }

    return { success: true, response: response || "Command sent" };
  } catch (err) {
    console.error(`[GPS-TCP] Connection error:`, err);
    return { success: false, error: err instanceof Error ? err.message : "TCP connection failed" };
  }
}

/**
 * Activate relay (cut power/activate siren) on VT08F
 * Common VT08F relay commands:
 * - relay,1# = activate relay (close circuit)
 * - relay,0# = deactivate relay (open circuit)
 */
async function activateRelay(imei: string): Promise<{ success: boolean; response?: string; error?: string }> {
  // VT08F command format to activate relay
  const command = `*HQ,${imei},V1,${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)},A,1#`;
  console.log(`[GPS] Activating relay for IMEI: ${imei}`);
  return await sendTcpCommand(command);
}

/**
 * Deactivate relay (restore power/stop siren) on VT08F
 */
async function deactivateRelay(imei: string): Promise<{ success: boolean; response?: string; error?: string }> {
  const command = `*HQ,${imei},V1,${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)},A,0#`;
  console.log(`[GPS] Deactivating relay for IMEI: ${imei}`);
  return await sendTcpCommand(command);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { alarm_type, imei, action } = body;

    // ── Manual actions from admin panel ──
    if (action === "relay-on" && imei) {
      const result = await activateRelay(imei);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "relay-off" && imei) {
      const result = await deactivateRelay(imei);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Alarm trigger: activate relay on all devices ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all GPS devices
    const { data: devices } = await supabase
      .from("gps_devices")
      .select("imei, relay_duration, relay_active_until");

    const targetDevices = (devices || []).filter((d: any) =>
      imei ? d.imei === imei : true
    );

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No hay dispositivos GPS registrados",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const results: any[] = [];
    const restorePromises: Promise<void>[] = [];

    for (const device of targetDevices) {
      const duration = device.relay_duration ?? 30;
      const newActiveUntil = new Date(now.getTime() + duration * 1000);
      const currentActiveUntil = device.relay_active_until
        ? new Date(device.relay_active_until)
        : null;
      const isRelayActive = currentActiveUntil && currentActiveUntil > now;

      // Update relay_active_until
      await supabase
        .from("gps_devices")
        .update({ relay_active_until: newActiveUntil.toISOString() })
        .eq("imei", device.imei);

      if (isRelayActive) {
        console.log(`[GPS] Relay already active on ${device.imei}, extended to ${newActiveUntil.toISOString()}`);
        results.push({
          imei: device.imei,
          success: true,
          relay_duration: duration,
          action: "extended",
          active_until: newActiveUntil.toISOString(),
        });
      } else {
        // Activate relay via TCP
        console.log(`[GPS] Activating relay on ${device.imei} for ${duration}s`);
        try {
          const result = await activateRelay(device.imei);
          results.push({
            imei: device.imei,
            success: result.success,
            relay_duration: duration,
            action: "activated",
            active_until: newActiveUntil.toISOString(),
            tcp_response: result.response,
          });
        } catch (err) {
          console.error(`[GPS] Error activating ${device.imei}:`, err);
          results.push({
            imei: device.imei,
            success: false,
            relay_duration: duration,
            action: "error",
            error: err instanceof Error ? err.message : "Error desconocido",
          });
        }
      }

      // Schedule relay deactivation
      restorePromises.push((async () => {
        const waitMs = newActiveUntil.getTime() - Date.now();
        if (waitMs > 0) {
          console.log(`[GPS] Scheduling relay-off for ${device.imei} in ${Math.round(waitMs / 1000)}s`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        // Re-check if timer was extended
        const { data: current } = await supabase
          .from("gps_devices")
          .select("relay_active_until")
          .eq("imei", device.imei)
          .single();

        const currentUntil = current?.relay_active_until
          ? new Date(current.relay_active_until)
          : null;

        if (currentUntil && currentUntil > new Date()) {
          console.log(`[GPS] Restore skipped for ${device.imei}: timer extended`);
          return;
        }

        // Deactivate relay
        console.log(`[GPS] Deactivating relay on ${device.imei}`);
        await deactivateRelay(device.imei);

        await supabase
          .from("gps_devices")
          .update({ relay_active_until: null })
          .eq("imei", device.imei);
      })());
    }

    // Let restore promises run in background
    Promise.all(restorePromises).catch((err) =>
      console.error("[GPS] Error in scheduled restores:", err)
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
