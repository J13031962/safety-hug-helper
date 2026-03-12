Custom GPS server configuration and API details

## Server
- IP: 192.99.16.163
- Port 8821/TCP - GPS devices connect here (internal)
- Port 3000/TCP - REST API for app commands
- Port 8080/TCP - WebSocket for realtime
- Auth: Bearer protrack2026

## REST API Endpoints
- POST /api/device/{imei}/power-off → Cut power (poweroff#)
- POST /api/device/{imei}/power-on → Restore power (poweron#)
- POST /api/device/{imei}/nosleep → Always active mode (nosleep#)
- Headers: Authorization: Bearer protrack2026

## Active Commands
- poweroff# → Cortar energía (relay activation)
- poweron# → Restaurar energía (relay deactivation)
- nosleep# → Modo siempre activo

## Flow
1. Alarm created → edge function invokes send-gps-command
2. Edge function filters devices by parcel_name matching alarm's parcel
3. Sends power-off to each device, schedules power-on after relay_duration seconds
4. If alarm extends while relay active, timer is extended

## Device
- Model: VT08F
- IMEI: 355468592594287
- Protocol: GT06 binary (0x78 0x78 start)
- Commands: ASCII in 0x80 packet
