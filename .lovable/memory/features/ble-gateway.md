---
name: BLE Gateway (SmartSOS Mobile)
description: Endpoint ble-button-event, tablas ble_devices/ble_events, autenticación x-ble-token y deduplicación en BD
type: feature
---
# Gateway BLE

- Único punto de entrada: `POST /functions/v1/ble-button-event`. La app móvil NO habla con Traccar, SIA, WhatsApp ni inserta en `alarms`.
- Auth: header `x-ble-token`. Prioridad: `ble_devices.token_hash` (SHA-256) por dispositivo; si no existe, secreto global `BLE_GATEWAY_TOKEN`. Nunca reutilizar `TRACCAR_WEBHOOK_TOKEN` ni la anon key.
- `ble_devices`: device_id (único), device_identifier (MAC), manufacturer/model/profile/name, phone_number, registered_number_id, parcel_id (una sola parcelación autorizada), enabled (default false), token_hash, last_seen_at, battery, rssi.
- `ble_events`: event_id único → deduplicación en BD; además ventana temporal de 30 s por dispositivo+botón. No usar Map en memoria.
- Aislamiento: la parcela siempre sale de `ble_devices.parcel_id`; `parcel_name` del payload que no coincida → 403 `parcel_mismatch`.
- Botones permitidos = alarm_type existentes: panic, medical, fire, disaster, domestic.
- Tras insertar la alarma invoca sin modificar: `send-gps-command`, `send-whatsapp`, `send-sia-event`.
- Dispositivo de prueba: `BLE-TEST-001` (parcelación Teleguardia, habilitado, con token propio). Docs en `docs/ble-button-event.md`.
