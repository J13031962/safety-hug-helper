# Backend para SmartSOS Mobile (Gateway BLE)

Objetivo de esta fase: que un `curl` a `ble-button-event` termine sonando la sirena, usando el flujo actual de SmartSOS. No se toca la app móvil.

## 1. Base de datos (una migración)

### `ble_devices`
Registro de dispositivos BLE, independiente del fabricante.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| device_id | text UNIQUE | identificador lógico, ej. `BLE-001` |
| device_identifier | text | MAC/UUID BLE, único cuando no es nulo |
| manufacturer, model, profile, name | text | opcionales |
| phone_number | text | teléfono del usuario portador (opcional) |
| registered_number_id | uuid → `registered_numbers.id` | opcional, fuente preferente de usuario/zona CRA |
| parcel_id | uuid → `parcels.id` NOT NULL | parcelación autorizada (única) |
| enabled | boolean default false | igual criterio de seguridad que `gps_devices.panic_button_enabled` |
| last_seen_at | timestamptz | actualizado en cada evento |
| battery, rssi | int | último valor reportado |
| created_by | uuid | |
| created_at, updated_at | timestamptz | trigger `update_updated_at_column` |

No se duplica nombre de parcela ni datos del usuario: se resuelven por relación (`parcels`, `registered_numbers`).

### `ble_events` (deduplicación en base de datos)
| Campo | Tipo |
|---|---|
| id | uuid PK |
| event_id | text UNIQUE NOT NULL |
| ble_device_id | uuid → `ble_devices.id` |
| button | text |
| alarm_id | uuid → `alarms.id` (nullable) |
| pressed_at | timestamptz |
| received_at | timestamptz default now() |
| payload | jsonb |

- Dedup por `event_id`: se inserta primero; si viola la única, se responde `duplicate: true`.
- Dedup temporal ~30 s: consulta a `ble_events` por mismo dispositivo + mismo botón en los últimos 30 s. Al estar en base de datos funciona con múltiples instancias.

### RLS / permisos
- Ambas tablas con RLS activo.
- `ble_devices`: lectura para `authenticated`; gestión solo admin/director (`has_role`). GRANT a `authenticated` + `service_role`.
- `ble_events`: sin acceso para `anon`/`authenticated` (solo `service_role`, usado por la función). Lectura opcional para admin.
- No se añade ninguna política pública de INSERT en `alarms`. La alarma la inserta la Edge Function con service role.

## 2. Edge Function `ble-button-event`

`POST /functions/v1/ble-button-event`, `verify_jwt = false` (autenticación propia por token BLE).

Autenticación: header `x-ble-token`, comparado contra el secreto nuevo **`BLE_GATEWAY_TOKEN`** (comparación de longitud constante). No se reutiliza `TRACCAR_WEBHOOK_TOKEN` ni la anon key. Diseño preparado para token por dispositivo: se añade `ble_devices.token_hash` (nullable); si el dispositivo tiene hash, se exige que el token recibido coincida con él, si no, se acepta el token global. Así se migra sin romper nada.

Validaciones, en orden: token → payload (zod) → tipo de evento permitido (`panic`, `medical`, `fire`, `disaster`, `domestic`, los mismos `alarm_type` existentes, sin crear tipos nuevos) → `pressed_at` válido y dentro de ±10 min → dispositivo existe por `device_id` o `device_identifier` → `enabled = true` → dedup por `event_id` → dedup temporal 30 s → resolución de parcelación.

Aislamiento de parcelación: la parcela **siempre** se toma de `ble_devices.parcel_id`. Si el payload trae `parcel_name` y no coincide, se rechaza con 403 (`parcel_mismatch`).

Resolución de usuario: `registered_number_id` si existe; si no, búsqueda por `phone_number` en `registered_numbers` limitada a esa parcela. De ahí salen `sender_name`, `house_number` y el número de zona CRA.

Luego:
1. INSERT en `alarms` con la estructura actual (`alarm_type`, `parcel_name`, `sender_name`, `phone_number`, `house_number`, `latitude`, `longitude`, `observations`, `status: 'pending'`).
2. Invoca, sin duplicar lógica, las funciones existentes tal cual: `send-gps-command` (`{ alarm_type, alarm_id, parcel_name }`), `send-whatsapp`, `send-sia-event`. Mismo patrón que `traccar-webhook`.
3. Actualiza `ble_events.alarm_id`, `last_seen_at`, `battery`, `rssi`.

Respuestas: 200 éxito / 200 duplicado / 400 payload inválido / 401 token / 403 deshabilitado o parcela no autorizada / 404 dispositivo inexistente.

Logs con `device_id`, `event_id`, `alarm_id`, botón, parcela, timestamp y resultado. Nunca tokens.

## 3. Funciones existentes

No se modifican `traccar-webhook`, `send-gps-command`, `send-whatsapp` ni `send-sia-event`. Único añadido posible: si `send-sia-event` no acepta zona para este origen, se usará el parámetro `cra_user_number` que ya soporta — no hace falta editarla.

## 4. Datos de prueba y documentación

- Se crea un dispositivo de prueba `BLE-TEST-001` ligado a la parcelación **Teleguardia** con `enabled = true` (inserción de datos aparte de la migración).
- Documento `docs/ble-button-event.md` con ejemplos `curl`, todos los códigos de respuesta y la tabla del payload.

Ejemplo:

```text
curl -X POST "https://<proyecto>.supabase.co/functions/v1/ble-button-event" \
  -H "Content-Type: application/json" \
  -H "x-ble-token: $BLE_GATEWAY_TOKEN" \
  -d '{"event_id":"<uuid>","device_id":"BLE-TEST-001","button":"panic",
       "phone_number":"3136880800","parcel_name":"Teleguardia",
       "pressed_at":"2026-08-14T15:00:00Z","battery":87,"rssi":-52}'
```

## 5. Limitaciones conocidas

- El envío SIA seguirá fallando si la CRA mantiene el filtro por IP (problema ya identificado, ajeno a esta fase).
- WhatsApp depende de la sesión activa de TextMeBot.
- Sin token por dispositivo en producción, cualquier gateway con el token global puede emitir eventos de cualquier dispositivo habilitado; por eso se deja lista la columna `token_hash`.

## 6. Entregables al terminar

Lista de archivos, migración, estructura final de `ble_devices`, mecanismo de autenticación, deduplicación, creación de alarma, camino hasta Traccar/sirena y el `curl` de prueba.
