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
- POST /api/commands/send (send command to device)

## Commands
- Preferred for relay: `{ deviceId, type: "engineStop" | "engineResume", attributes: {}, description: "..." }`
- Fallback compatibility: `{ deviceId, type: "command", data: { command: "engineStop" | "engineResume" }, description: "..." }`

## Siren Logic (IMPORTANT - INVERTED from Traccar perspective)
- Alarm triggered → send engineStop via Traccar → relay activates → siren sounds
- If alarm sent again while active → extend timer, show "siren already sounding"
- After relay_duration seconds → send engineResume via Traccar → relay deactivates → siren stops
- Parcel matching is case-insensitive (trim + lowercase)
- Final resting state: engineResume (NO "fuel cut" in Traccar)
- Commands mapping: engineStop=SIREN ON, engineResume=SIREN OFF

## Cron Worker
- process-relay-jobs runs every ~20 seconds (3 pg_cron jobs with 0/20/40s offsets)
- Checks relay_active_until to prevent premature engineResume from stale jobs

## Device
- Model: VT08F
- IMEI: 355468592594287
- Protocol: GT06 binary (0x78 0x78 start)
