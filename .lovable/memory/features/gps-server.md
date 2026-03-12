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
- POST /api/commands (send command to device)
  - preferred body: { deviceId, type: "engineStop" | "engineResume", attributes: {}, description }
  - fallback body (legacy): { deviceId, type: "command", data: { command: "engineStop" | "engineResume" } }

## Commands (CORRECT format for VT08F)
- engineStop → Cortar combustible / activar relay (siren sounds)
- engineResume → Restaurar combustible / desactivar relay (siren stops)

## Siren Logic (IMPORTANT)
- Alarm triggered → send engineStop via Traccar → relay closes → siren sounds
- If alarm sent again while active → extend timer, show "siren already sounding"
- After relay_duration seconds → send engineResume via Traccar → relay opens → siren stops

## Device
- Model: VT08F
- IMEI: 355468592594287
- Traccar deviceId: 2
- Protocol: GT06 binary (0x78 0x78 start)
