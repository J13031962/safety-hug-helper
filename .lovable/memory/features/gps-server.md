Custom GPS server configuration and API details

## Server
- Domain: gps.smarturban.co
- Port 8822/TCP - GPS devices connect here (GT06 protocol)
- Port 8082/TCP - Traccar API (REST) — but use https://gps.smarturban.co/api
- Auth: Session-based (email/password via POST /api/session)
- Secrets: TRACCAR_EMAIL, TRACCAR_PASSWORD
- TRACCAR_API_URL env var (fallback: https://gps.smarturban.co/api)

## Traccar REST API
- POST /api/session (login, returns JSESSIONID cookie)
- GET /api/devices?uniqueId={imei} (lookup device by IMEI)
- GET /api/devices/{id} (get device status)
- POST /api/commands (send command to device)

## Commands (CORRECT format - VERIFIED WORKING)
- Payload: `{ deviceId, type: "command", data: { command: "engineStop" | "engineResume" }, description: "..." }`
- DO NOT use `type: "engineStop"` directly — must be `type: "command"` with `data.command`
- engineStop → Cortar combustible / activar relay (siren sounds)
- engineResume → Restaurar combustible / desactivar relay (siren stops)

## Siren Logic (IMPORTANT)
- Alarm triggered → send engineStop via Traccar → relay closes → siren sounds
- If alarm sent again while active → extend timer, show "siren already sounding"
- After relay_duration seconds → send engineResume via Traccar → relay opens → siren stops
- Parcel matching is case-insensitive (trim + lowercase)

## Device
- Model: VT08F
- IMEI: 355468592594287
- Protocol: GT06 binary (0x78 0x78 start)
