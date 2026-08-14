# Contrato para SmartSOS Mobile + ajustes en este backend

El endpoint que pide el otro proyecto **ya existe** (`ble-button-event`). Aquí queda el contrato exacto y los pocos cambios que faltan para que el modo real de la app móvil funcione sin crear alarmas de prueba reales.

## 1. Contrato que hay que pegar en el otro proyecto

**URL base:** `https://xvojmfakqlzplbzaoqdi.supabase.co`
**Endpoint:** `POST /functions/v1/ble-button-event` (sin JWT; auth por header `x-ble-token`)

Header y payload:

```text
x-ble-token: <token>            # global (secreto BLE_GATEWAY_TOKEN) o token propio del dispositivo
Content-Type: application/json

{
  "event_id": "uuid",           # obligatorio, base de la deduplicación
  "device_id": "BLE-001",       # obligatorio (o device_identifier = MAC)
  "button": "panic",            # panic | medical | fire | disaster | domestic
  "phone_number": "3136880800", # opcional, resuelve portador y zona CRA
  "parcel_name": "Teleguardia", # opcional; si viene debe coincidir con la parcelación del dispositivo
  "latitude": 4.7, "longitude": -74.1,
  "pressed_at": "2026-08-14T15:00:00Z",   # ±10 min del reloj del servidor
  "battery": 87, "rssi": -52,
  "simulated": true             # nuevo: prueba de conectividad, no crea alarma
}
```

Identidad y aislamiento (importante para el contrato):
- La **parcelación NO la decide la app**: sale de `ble_devices.parcel_id` → `parcels.name`. `parcel_name` distinto → 403 `parcel_mismatch`.
- El **portador** se resuelve por `ble_devices.registered_number_id` o, si no, por `phone_number` contra `registered_numbers` limitado a esa parcelación (de ahí salen `sender_name`, `house_number`, zona CRA `user_number`).
- La app **no** inserta en `alarms` ni llama a WhatsApp/SIA/Traccar. El endpoint inserta la alarma y encadena `send-gps-command`, `send-whatsapp`, `send-sia-event`. No hay trigger de BD: el flujo es dentro de la función.

Códigos que la app debe manejar:
- 200 `{success:true, alarm_id, duplicate:false}` — aceptado
- 200 `{success:true, duplicate:true}` — duplicado (mismo `event_id`, o mismo botón del mismo dispositivo en 30 s). **No hay 409**: la dedup responde 200.
- 400 payload inválido (`missing_event_id`, `invalid_button`, `pressed_at_out_of_range`, …)
- 401 `unauthorized` (token) · 403 `device_disabled` / `parcel_mismatch` · 404 `device_not_registered`
- 500 → reintentar desde la cola offline

## 2. Cambios en este backend

1. **`simulated: true`** en `ble-button-event`: valida token, dispositivo, parcelación y payload, registra el evento en `ble_events` y responde `{success:true, simulated:true}` **sin** insertar alarma ni invocar GPS/WhatsApp/SIA. Así el botón "Probar backend" de la app no dispara sirena.
2. **Dispositivo para el token global**: alta de un dispositivo (`SMARTSOS-MOBILE-01`, parcelación de pruebas, `enabled = true`) **sin** `token_hash`, para que valide contra `BLE_GATEWAY_TOKEN`. El actual `BLE-TEST-001` tiene token propio y no sirve con el token global.
3. **`docs/ble-button-event.md`**: añadir el flag `simulated`, la nota de que la dedup devuelve 200 (no 409) y el bloque de contrato listo para pegar en `docs/BACKEND.md` del otro proyecto.

## 3. Fuera de alcance

No se toca `traccar-webhook`, `send-gps-command`, `send-whatsapp` ni `send-sia-event`. Tampoco se crea UI en /admin para dispositivos BLE (siguen dándose de alta por SQL) — se puede añadir después si lo quieres.

## Notas técnicas

- El token global lo genero/rotó aquí (`BLE_GATEWAY_TOKEN`); hay que copiarlo a `VITE_SMARTSOS_BLE_TOKEN` en el proyecto móvil. Ojo: en una app cliente ese token es visible; para producción conviene token por dispositivo (`ble_devices.token_hash`, SHA-256).
- No existen 409 ni `parcel_id` en el payload: el esquema trabaja con `parcel_name` derivado del dispositivo, así que la app puede omitirlo.
