Custom GPS server configuration and API details

## Server
- IP: 192.99.16.163
- Port 8822/TCP - GPS devices connect here (GT06 protocol)
- Port 8082/TCP - Traccar API (REST)
- Auth: Session-based (email/password via POST /api/session)
- Secrets: TRACCAR_EMAIL, TRACCAR_PASSWORD

## Traccar REST API
- POST /api/session (login, returns JSESSIONID cookie)
- GET /api/devices?uniqueId={imei} (lookup device by IMEI)
- POST /api/commands/send (send command to device)
  - body: { deviceId, type: "custom", description, attributes: { data: "AT command" } }
  - Headers: Cookie: JSESSIONID=xxx, Content-Type: application/json

## AT Commands (from VT08F manual)
- AT^GT_CM=RELAY,1# → Activate relay (close circuit, siren sounds)
- AT^GT_CM=RELAY,0# → Deactivate relay (open circuit, siren stops)

## Siren Logic (IMPORTANT)
- Alarm triggered → send RELAY,1# via Traccar → relay closes → siren sounds
- If alarm sent again while active → extend timer, show "siren already sounding"
- After relay_duration seconds → send RELAY,0# via Traccar → relay opens → siren stops

## Device
- Model: VT08F
- IMEI: 355468592594287
- Traccar deviceId: 2
- Protocol: GT06 binary (0x78 0x78 start)
