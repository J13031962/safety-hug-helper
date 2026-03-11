import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── CRC-ITU (CRC-16/CCITT) lookup table ───
const CRC_TABLE = new Uint16Array([
  0x0000,0x1189,0x2312,0x329B,0x4624,0x57AD,0x6536,0x74BF,
  0x8C48,0x9DC1,0xAF5A,0xBED3,0xCA6C,0xDBE5,0xE97E,0xF8F7,
  0x1081,0x0108,0x3393,0x221A,0x56A5,0x472C,0x75B7,0x643E,
  0x9CC9,0x8D40,0xBFDB,0xAE52,0xDAED,0xCB64,0xF9FF,0xE876,
  0x2102,0x308B,0x0210,0x1399,0x6726,0x76AF,0x4434,0x55BD,
  0xAD4A,0xBCC3,0x8E58,0x9FD1,0xEB6E,0xFAE7,0xC87C,0xD9F5,
  0x3183,0x200A,0x1291,0x0318,0x77A7,0x662E,0x54B5,0x453C,
  0xBDCB,0xAC42,0x9ED9,0x8F50,0xFBEF,0xEA66,0xD8FD,0xC974,
  0x4204,0x538D,0x6116,0x709F,0x0420,0x15A9,0x2732,0x36BB,
  0xCE4C,0xDFC5,0xED5E,0xFCD7,0x8868,0x99E1,0xAB7A,0xBAF3,
  0x5285,0x430C,0x7197,0x601E,0x14A1,0x0528,0x37B3,0x263A,
  0xDECD,0xCF44,0xFDDF,0xEC56,0x98E9,0x8960,0xBBFB,0xAA72,
  0x6306,0x728F,0x4014,0x519D,0x2522,0x34AB,0x0630,0x17B9,
  0xEF4E,0xFEC7,0xCC5C,0xDDD5,0xA96A,0xB8E3,0x8A78,0x9BF1,
  0x7387,0x620E,0x5095,0x411C,0x35A3,0x242A,0x16B1,0x0738,
  0xFFCF,0xEE46,0xDCDD,0xCD54,0xB9EB,0xA862,0x9AF9,0x8B70,
  0x8408,0x9581,0xA71A,0xB693,0xC22C,0xD3A5,0xE13E,0xF0B7,
  0x0840,0x19C9,0x2B52,0x3ADB,0x4E64,0x5FED,0x6D76,0x7CFF,
  0x9489,0x8500,0xB79B,0xA612,0xD2AD,0xC324,0xF1BF,0xE036,
  0x18C1,0x0948,0x3BD3,0x2A5A,0x5EE5,0x4F6C,0x7DF7,0x6C7E,
  0xA50A,0xB483,0x8618,0x9791,0xE32E,0xF2A7,0xC03C,0xD1B5,
  0x2942,0x38CB,0x0A50,0x1BD9,0x6F66,0x7EEF,0x4C74,0x5DFD,
  0xB58B,0xA402,0x9699,0x8710,0xF3AF,0xE226,0xD0BD,0xC134,
  0x39C3,0x284A,0x1AD1,0x0B58,0x7FE7,0x6E6E,0x5CF5,0x4D7C,
  0xC60C,0xD785,0xE51E,0xF497,0x8028,0x91A1,0xA33A,0xB2B3,
  0x4A44,0x5BCD,0x6956,0x78DF,0x0C60,0x1DE9,0x2F72,0x3EFB,
  0xD68D,0xC704,0xF59F,0xE416,0x90A9,0x8120,0xB3BB,0xA232,
  0x5AC5,0x4B4C,0x79D7,0x685E,0x1CE1,0x0D68,0x3FF3,0x2E7A,
  0xE70E,0xF687,0xC41C,0xD595,0xA12A,0xB0A3,0x8238,0x93B1,
  0x6B46,0x7ACF,0x4854,0x59DD,0x2D62,0x3CEB,0x0E70,0x1FF9,
  0xF78F,0xE606,0xD49D,0xC514,0xB1AB,0xA022,0x92B9,0x8330,
  0x7BC7,0x6A4E,0x58D5,0x495C,0x3DE3,0x2C6A,0x1EF1,0x0F78,
]);

function crcItu(data: Uint8Array): number {
  let fcs = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    fcs = (fcs >> 8) ^ CRC_TABLE[(fcs ^ data[i]) & 0xFF];
  }
  return (~fcs) & 0xFFFF;
}

// ─── Build Protrack protocol 0x80 online command packet ───
function buildOnlineCommandPacket(command: string, serialNumber: number): Uint8Array {
  const cmdBytes = new TextEncoder().encode(command);
  const serverFlag = new Uint8Array([0x00, 0x00, 0x00, 0x00]); // 4 bytes server flag
  
  // Content length = server flag (4) + command bytes length
  const contentLength = serverFlag.length + cmdBytes.length;
  
  // Packet length = protocol(1) + cmdLengthByte(1) + content(N) + serial(2) + crc(2)
  const packetLength = 1 + 1 + contentLength + 2 + 2;
  
  // Build the data for CRC calculation (from packet length to serial number)
  const crcData = new Uint8Array(1 + 1 + 1 + contentLength + 2);
  let offset = 0;
  
  crcData[offset++] = packetLength;          // Packet length
  crcData[offset++] = 0x80;                   // Protocol number
  crcData[offset++] = contentLength;           // Length of command content
  crcData.set(serverFlag, offset); offset += serverFlag.length;
  crcData.set(cmdBytes, offset); offset += cmdBytes.length;
  crcData[offset++] = (serialNumber >> 8) & 0xFF;
  crcData[offset++] = serialNumber & 0xFF;
  
  const crc = crcItu(crcData);
  
  // Build full packet
  const packet = new Uint8Array(2 + crcData.length + 2 + 2);
  offset = 0;
  
  packet[offset++] = 0x78; // Start bit
  packet[offset++] = 0x78;
  packet.set(crcData, offset); offset += crcData.length;
  packet[offset++] = (crc >> 8) & 0xFF;    // CRC high
  packet[offset++] = crc & 0xFF;            // CRC low
  packet[offset++] = 0x0D; // Stop bit
  packet[offset++] = 0x0A;
  
  return packet;
}

// Map alarm type to GPS command
function getCommandForAlarmType(alarmType: string): string {
  switch (alarmType) {
    case "panic":
    case "medical":
    case "fire":
      return "relay,1#"; // Activate relay output (siren)
    case "disaster":
      return "relay,1#"; // Also activate siren for disaster; change to motor cut if needed
    default:
      return "relay,1#";
  }
}

function toHexString(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GPS_SERVER_HOST = Deno.env.get("GPS_SERVER_HOST");
    const GPS_SERVER_PORT = parseInt(Deno.env.get("GPS_SERVER_PORT") || "5023", 10);

    if (!GPS_SERVER_HOST) {
      return new Response(JSON.stringify({ 
        error: "GPS_SERVER_HOST no configurado" 
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { alarm_type, imei, command: customCommand } = await req.json();

    if (!alarm_type && !customCommand) {
      return new Response(JSON.stringify({ error: "alarm_type o command requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get command string
    const command = customCommand || getCommandForAlarmType(alarm_type);
    
    // Build the protocol packet
    const packet = buildOnlineCommandPacket(command, 1);
    
    console.log(`[GPS] Sending command "${command}" to ${GPS_SERVER_HOST}:${GPS_SERVER_PORT}`);
    console.log(`[GPS] Packet: ${toHexString(packet)}`);

    // If IMEI provided, we can try to get all devices or target specific one
    // The TCP server should handle routing to the correct device based on IMEI
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get target devices
    let targetDevices: { imei: string }[] = [];
    
    if (imei) {
      targetDevices = [{ imei }];
    } else {
      // Send to all registered GPS devices
      const { data: devices } = await supabase.from("gps_devices").select("imei");
      targetDevices = devices || [];
    }

    if (targetDevices.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No hay dispositivos GPS registrados" 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: { imei: string; success: boolean; error?: string }[] = [];

    for (const device of targetDevices) {
      try {
        // Connect to TCP server
        const conn = await Deno.connect({ 
          hostname: GPS_SERVER_HOST, 
          port: GPS_SERVER_PORT 
        });
        
        // Some TCP servers expect the IMEI prefix to route the command
        // Format: *HQ,{IMEI},S20,{time},{0|1}# (common ProTrack relay command)
        // Or raw protocol 0x80 packet
        // We'll send both formats for compatibility
        
        // Method 1: ProTrack SMS-compatible command via TCP
        // Format: *HQ,IMEI,S20,TIME,1,0# (activate output 1)
        const now = new Date();
        const timeStr = [
          now.getHours().toString().padStart(2, '0'),
          now.getMinutes().toString().padStart(2, '0'),
          now.getSeconds().toString().padStart(2, '0')
        ].join('');
        
        // S20 command: activate/deactivate output
        // *HQ,{IMEI},S20,{HHMMSS},{output_state},{duration}#
        // output_state: 1=activate, 0=deactivate
        // duration: 0=permanent until deactivated
        const smsCommand = `*HQ,${device.imei},S20,${timeStr},1,0#`;
        
        console.log(`[GPS] Sending SMS command to device ${device.imei}: ${smsCommand}`);
        
        const encoder = new TextEncoder();
        await conn.write(encoder.encode(smsCommand));
        
        // Wait briefly for response
        const buf = new Uint8Array(1024);
        const timer = setTimeout(() => conn.close(), 5000);
        
        try {
          const n = await conn.read(buf);
          clearTimeout(timer);
          if (n) {
            const response = new TextDecoder().decode(buf.subarray(0, n));
            console.log(`[GPS] Response from device ${device.imei}: ${response}`);
          }
        } catch {
          clearTimeout(timer);
          console.log(`[GPS] No response from device ${device.imei} (timeout)`);
        }
        
        try { conn.close(); } catch { /* already closed */ }
        
        results.push({ imei: device.imei, success: true });
      } catch (err) {
        console.error(`[GPS] Error sending to device ${device.imei}:`, err);
        results.push({ 
          imei: device.imei, 
          success: false, 
          error: err instanceof Error ? err.message : "Error desconocido" 
        });
      }
    }

    // Also try sending the raw binary protocol 0x80 packet to each device
    for (const device of targetDevices) {
      try {
        const conn = await Deno.connect({ 
          hostname: GPS_SERVER_HOST, 
          port: GPS_SERVER_PORT 
        });
        
        console.log(`[GPS] Sending binary 0x80 packet to ${device.imei}`);
        await conn.write(packet);
        
        const buf = new Uint8Array(1024);
        const timer = setTimeout(() => conn.close(), 3000);
        try {
          const n = await conn.read(buf);
          clearTimeout(timer);
          if (n) {
            console.log(`[GPS] Binary response: ${toHexString(buf.subarray(0, n))}`);
          }
        } catch {
          clearTimeout(timer);
        }
        try { conn.close(); } catch { /* */ }
      } catch (err) {
        console.error(`[GPS] Binary packet error for ${device.imei}:`, err);
      }
    }

    const allSuccess = results.every(r => r.success);
    
    return new Response(JSON.stringify({
      success: allSuccess,
      command,
      alarm_type,
      devices_targeted: targetDevices.length,
      results,
      packet_hex: toHexString(packet),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (err) {
    console.error("[GPS] Error:", err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : "Error interno" 
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
