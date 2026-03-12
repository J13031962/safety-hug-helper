Custom GPS server configuration and API details

## Server
- IP: 192.99.16.163
- Port 8821/TCP - GPS devices connect here (internal)
- Port 3000/TCP - REST API for app commands
- Port 8080/TCP - WebSocket for realtime
- Auth: Bearer protrack2026

## REST API Endpoints
- POST /api/device/{imei}/power-off → Cut power (activate relay)
- POST /api/device/{imei}/power-on → Restore power (deactivate relay)
- Headers: Authorization: Bearer protrack2026

## Flow
1. App → HTTP POST to API (port 3000)
2. API server → finds device socket → builds 0x80 binary packet
3. API server → writes packet via TCP to device
4. Device responds with 0x21 packet ("OK" or "ERROR")

## Device
- Model: VT08F
- IMEI: 355468592594287
- Protocol: GT06 binary (0x78 0x78 start)
- Commands: poweroff# / poweron# (ASCII in 0x80 packet)
