Custom GPS server configuration and API details

## Server
- IP: 192.99.16.163
- Port 8821/TCP - GPS devices connect here (internal)
- Port 3000/TCP - REST API for app commands
- Port 8080/TCP - WebSocket for realtime
- Auth: Bearer protrack2026

## REST API Endpoints
- POST /api/device/{imei}/power-on → Energize relay (poweron#) → SIREN SOUNDS
- POST /api/device/{imei}/power-off → Cut power (poweroff#) → SIREN STOPS
- POST /api/device/{imei}/nosleep → Always active mode (nosleep#)
- Headers: Authorization: Bearer protrack2026

## Siren Logic (IMPORTANT)
- Alarm triggered → send power-on → relay energized → siren sounds
- If alarm sent again while active → extend timer, show "siren already sounding"
- After relay_duration seconds → send power-off → relay cuts → siren stops
- Device stays in power-off state until next alarm

## Device
- Model: VT08F
- IMEI: 355468592594287
- Protocol: GT06 binary (0x78 0x78 start)
- Commands: ASCII in 0x80 packet
