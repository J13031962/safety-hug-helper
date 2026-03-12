import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GPS_SERVER_IP = "192.99.16.163";
const GPS_SERVER_PORT = 8821;

// ── CRC-16/ITU (X.25) ──
function crc16itu(data: Uint8Array): number {
  let crc = 0xFFFF;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }
  return crc ^ 0xFFFF;
}

// ── Build protocol 0x80 command packet ──
function buildCommandPacket(command: string, serialNumber: number): Uint8Array {
  const commandBytes = new TextEncoder().encode(command);
  const commandLen = commandBytes.length;

  // Content length (4 bytes BE) + Server flag (4 bytes) + command + language (2 bytes)
  const contentLenBytes = 4; // command content length field
  const serverFlagBytes = 4; // server flag bits
  const languageBytes = 2;   // language code

  // Packet length = protocol(1) + contentLen(4) + serverFlag(4) + command(N) + language(2) + serial(2) = 13 + N
  const packetLength = 1 + contentLenBytes + serverFlagBytes + commandLen + languageBytes + 2;

  // Full packet: start(2) + packetLen(1) + protocol(1) + contentLen(4) + serverFlag(4) + command(N) + language(2) + serial(2) + crc(2) + stop(2)
  const totalSize = 2 + 1 + 1 + contentLenBytes + serverFlagBytes + commandLen + languageBytes + 2 + 2 + 2;
  const packet = new Uint8Array(totalSize);
  let offset = 0;

  // Start bits
  packet[offset++] = 0x78;
  packet[offset++] = 0x78;

  // Packet length
  packet[offset++] = packetLength;

  // Protocol number (online command)
  packet[offset++] = 0x80;

  // Command content length (4 bytes, big-endian) - length of the ASCII command
  packet[offset++] = (commandLen >> 24) & 0xFF;
  packet[offset++] = (commandLen >> 16) & 0xFF;
  packet[offset++] = (commandLen >> 8) & 0xFF;
  packet[offset++] = commandLen & 0xFF;

  // Server flag bits (4 bytes, all zeros = from server)
  packet[offset++] = 0x00;
  packet[offset++] = 0x00;
  packet[offset++] = 0x00;
  packet[offset++] = 0x00;

  // Command content (ASCII)
  packet.set(commandBytes, offset);
  offset += commandLen;

  // Language (0x0002 = English)
  packet[offset++] = 0x00;
  packet[offset++] = 0x02;

  // Serial number (2 bytes, big-endian)
  packet[offset++] = (serialNumber >> 8) & 0xFF;
  packet[offset++] = serialNumber & 0xFF;

  // CRC-16/ITU: calculated from packet length to serial number (inclusive)
  const crcData = packet.slice(2, offset); // from packetLength byte to end of serial
  const crc = crc16itu(crcData);
  packet[offset++] = (crc >> 8) & 0xFF;
  packet[offset++] = crc & 0xFF;

  // Stop bits
  packet[offset++] = 0x0D;
  packet[offset++] = 0x0A;

  return packet;
}

// ── Send binary command via TCP ──
async function sendGpsCommand(command: string): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    console.log(`[GPS-TCP] Connecting to ${GPS_SERVER_IP}:${GPS_SERVER_PORT}...`);
    const conn = await Deno.connect({ hostname: GPS_SERVER_IP, port: GPS_SERVER_PORT });

    const serialNumber = Math.floor(Math.random() * 0xFFFF);
    const packet = buildCommandPacket(command, serialNumber);

    console.log(`[GPS-TCP] Sending command "${command}" (${packet.length} bytes, serial=${serialNumber})`);
    console.log(`[GPS-TCP] Packet hex: ${Array.from(packet).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

    await conn.write(packet);

    // Read response with timeout
    const buffer = new Uint8Array(1024);
    let response = "";

    try {
      const timeoutId = setTimeout(() => {
        try { conn.close(); } catch { /* ignore */ }
      }, 5000);

      const bytesRead = await conn.read(buffer);
      clearTimeout(timeoutId);

      if (bytesRead !== null) {
        const responseHex = Array.from(buffer.subarray(0, bytesRead)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        response = `Received ${bytesRead} bytes: ${responseHex}`;
        console.log(`[GPS-TCP] ${response}`);
      }
    } catch (readErr) {
      console.log(`[GPS-TCP] Read timeout or error (command may still have been sent):`, readErr);
    }

    try { conn.close(); } catch { /* ignore */ }

    return { success: true, response: response || "Command sent (no response)" };
  } catch (err) {
    console.error(`[GPS-TCP] Connection error:`, err);
    return { success: false, error: err instanceof Error ? err.message : "TCP connection failed" };
  }
}

// ── Relay control ──
async function activateRelay(imei: string): Promise<{ success: boolean; response?: string; error?: string }> {
  console.log(`[GPS] Cutting power for IMEI: ${imei} (poweroff#)`);
  return await sendGpsCommand("poweroff#");
}

async function deactivateRelay(imei: string): Promise<{ success: boolean; response?: string; error?: string }> {
  console.log(`[GPS] Restoring power for IMEI: ${imei} (poweron#)`);
  return await sendGpsCommand("poweron#");
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { alarm_type, imei, action } = body;

    // Manual actions from admin panel
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

    // Alarm trigger: activate relay on all devices
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

        console.log(`[GPS] Deactivating relay on ${device.imei}`);
        await deactivateRelay(device.imei);

        await supabase
          .from("gps_devices")
          .update({ relay_active_until: null })
          .eq("imei", device.imei);
      })());
    }

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
