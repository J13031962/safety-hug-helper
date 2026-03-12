Custom GPS server configuration and TCP command details

## Server
- IP: 192.99.16.163
- Port 8821/TCP - GPS devices connect here
- Port 3000/TCP - App connects here
- Port 8080/TCP - WebSocket for realtime
- All ports open by default
- Server emulates GPS signals (custom server, not Protrack365)

## Device
- Model: VT08F
- Protocol: HQ (Chinese GPS protocol)

## Current command format (may need fixing)
- Activate relay: `*HQ,{IMEI},V1,{timestamp},A,1#`
- Deactivate relay: `*HQ,{IMEI},V1,{timestamp},A,0#`
