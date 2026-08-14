# SmartSOS — Endpoint `ble-button-event`

Punto de entrada único para la app **SmartSOS Mobile (Gateway BLE)**. La app no habla nunca con Traccar, SIA, WhatsApp ni con la tabla `alarms`: todo entra por aquí y reutiliza el flujo existente.

```text
SmartSOS Mobile / curl
        ↓
POST /functions/v1/ble-button-event
        ↓  validación → token → dedup (BD) → dispositivo/usuario/parcelación
   INSERT alarms
        ↓
send-gps-command (Traccar / relé / sirena)
send-whatsapp
send-sia-event (CRA)
```

## URL

```
POST https://xvojmfakqlzplbzaoqdi.supabase.co/functions/v1/ble-button-event
```

## Autenticación

Header obligatorio `x-ble-token`. No se usa la anon key ni `TRACCAR_WEBHOOK_TOKEN`.

1. Si el dispositivo tiene `ble_devices.token_hash`, el token recibido debe coincidir con ese hash SHA-256 (**token por dispositivo**).
2. Si no lo tiene, se valida contra el secreto global `BLE_GATEWAY_TOKEN`.

Para asignar un token propio a un dispositivo:

```sql
UPDATE public.ble_devices
SET token_hash = encode(digest('EL_TOKEN_DEL_DISPOSITIVO', 'sha256'), 'hex')
WHERE device_id = 'BLE-001';
```

## Payload

| Campo | Obligatorio | Notas |
|---|---|---|
| `event_id` | sí | identificador único del evento (UUID recomendado); base de la deduplicación |
| `device_id` | sí (o `device_identifier`) | identificador lógico, ej. `BLE-001` |
| `device_identifier` | alternativo | MAC/UUID BLE |
| `button` | sí | `panic`, `medical`, `fire`, `disaster`, `domestic` |
| `phone_number` | no | ayuda a resolver usuario y zona CRA |
| `parcel_name` | no | si se envía debe coincidir con la parcelación autorizada del dispositivo |
| `latitude`, `longitude` | no | |
| `pressed_at` | no | ISO-8601 UTC; se rechaza si difiere más de 10 min del reloj del servidor |
| `battery`, `rssi` | no | se guardan como último estado del dispositivo |

## Deduplicación (en base de datos, válida entre instancias)

- `ble_events.event_id` es único: un reintento con el mismo `event_id` responde `duplicate: true` sin crear otra alarma.
- Ventana temporal ~30 s: si el mismo dispositivo repite el mismo botón en 30 s, se reutiliza la alarma anterior.

## Respuestas

| Situación | HTTP | Body |
|---|---|---|
| Éxito | 200 | `{"success":true,"event_id":"...","alarm_id":"...","duplicate":false,"parcel_name":"...","alarm_type":"panic"}` |
| Duplicado | 200 | `{"success":true,"event_id":"...","duplicate":true,"reason":"duplicate_event_id"}` |
| Payload inválido | 400 | `invalid_json`, `missing_event_id`, `missing_device_identity`, `invalid_button`, `invalid_pressed_at`, `pressed_at_out_of_range` |
| Token inválido/ausente | 401 | `unauthorized` |
| Deshabilitado / parcelación no autorizada | 403 | `device_disabled`, `parcel_mismatch`, `parcel_not_found` |
| Dispositivo no registrado | 404 | `device_not_registered` |
| Error interno | 500 | `db_error`, `alarm_insert_failed`, `internal_error` |

## Prueba con curl

Dispositivo de prueba ya creado: `BLE-TEST-001`, parcelación **Teleguardia**, `enabled = true`, con token propio.

```bash
BLE_TOKEN="<token del dispositivo de prueba>"
EVENT_ID=$(uuidgen)

curl -i -X POST "https://xvojmfakqlzplbzaoqdi.supabase.co/functions/v1/ble-button-event" \
  -H "Content-Type: application/json" \
  -H "x-ble-token: $BLE_TOKEN" \
  -d "{
    \"event_id\": \"$EVENT_ID\",
    \"device_id\": \"BLE-TEST-001\",
    \"button\": \"panic\",
    \"phone_number\": \"3136880800\",
    \"parcel_name\": \"Teleguardia\",
    \"pressed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"battery\": 87,
    \"rssi\": -52
  }"
```

Repetir el mismo comando con el mismo `event_id` debe devolver `duplicate: true`.

## Alta de un dispositivo BLE real

```sql
INSERT INTO public.ble_devices
  (device_id, device_identifier, manufacturer, model, profile, name, phone_number, parcel_id, enabled)
SELECT 'BLE-001', 'AA:BB:CC:11:22:33', 'Fabricante', 'Modelo', 'single-button',
       'Botón de Juan', '3136880800', p.id, true
FROM public.parcels p
WHERE lower(trim(p.name)) = 'teleguardia';
```

Un dispositivo pertenece a **una sola** parcelación (`parcel_id`) y solo puede generar alarmas en ella.

## Limitaciones conocidas

- Las señales SIA fallan si la CRA mantiene filtro por IP de origen (las Edge Functions usan IPs dinámicas).
- WhatsApp depende de que la sesión de TextMeBot esté conectada.
- Sin `token_hash` por dispositivo, cualquiera con el token global puede emitir eventos de cualquier dispositivo habilitado.
