Custom GPS server configuration and API details

## Server
- IP: 192.99.16.163
- Port 8821/TCP - GPS devices connect here (internal)
- Port 3000/TCP - REST API for app commands
- Port 8080/TCP - WebSocket for realtime
- Auth: Bearer protrack2026

## REST API Endpoints
- POST /api/device/{imei}/command  body: { command: "AT^GT_CM=RELAY,1#" } → Activate relay → SIREN ON
- POST /api/device/{imei}/command  body: { command: "AT^GT_CM=RELAY,0#" } → Deactivate relay → SIREN OFF
- Headers: Authorization: Bearer protrack2026

## AT Commands (from VT08F manual)
- AT^GT_CM=RELAY,1# → Activate relay (close circuit, siren sounds)
- AT^GT_CM=RELAY,0# → Deactivate relay (open circuit, siren stops)

## Siren Logic (IMPORTANT)
- Alarm triggered → send RELAY,1# → relay closes → siren sounds
- If alarm sent again while active → extend timer, show "siren already sounding"
- After relay_duration seconds → send RELAY,0# → relay opens → siren stops
- Device stays with relay open until next alarm

## Device
- Model: VT08F
- IMEI: 355468592594287
- Protocol: GT06 binary (0x78 0x78 start)
- Commands: ASCII in 0x80 packet
