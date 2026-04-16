

## Plan: Corregir visibilidad de sirenas + reportes de prueba + renombrar GPS

### Problemas identificados

1. **Sirenas no aparecen en móvil/incógnito**: La tabla `gps_devices` tiene RLS que requiere `authenticated`, pero los usuarios del PhoneGate NO están autenticados con Supabase (solo usan localStorage). La tabla `gps_device_parcels` sí tiene política `public SELECT`, pero `gps_devices` no — por eso la segunda query falla silenciosamente y devuelve vacío.

2. **Eventos de prueba no aparecen** en `/operador` ni en la sección Alarmas de `/admin`.

3. **No se puede renombrar/identificar los GPS** — no hay campo `name` editable.

---

### Cambios

#### 1. Migración de base de datos
- Agregar política RLS `SELECT` pública a `gps_devices` (igual que `gps_device_parcels`) para que usuarios no autenticados puedan consultar dispositivos.
- Agregar columna `name` (text, nullable) a `gps_devices` para poder renombrar las sirenas.

#### 2. `TestSirenDialog.tsx` — Registrar evento de prueba en `alarms`
- Después de activar una sirena, insertar un registro en la tabla `alarms` con:
  - `alarm_type: "test"`
  - `sender_name`: nombre del usuario (de localStorage)
  - `parcel_name`: parcela(s) de la sirena
  - `status: "resolved"` (es prueba, no requiere atención)
  - Agregar campo extra con el nombre/IMEI de la sirena en `observations`

#### 3. `AlarmsHistoryTab.tsx` — Mostrar eventos de prueba
- Agregar `test` al mapa `typeLabels` con label "Prueba" y color gris/neutro.

#### 4. `OperatorDashboard.tsx` — Mostrar eventos de prueba
- Agregar `test` al mapa `typeConfig` para que aparezcan en el dashboard del operador.

#### 5. `GpsDevicesTab.tsx` — Campo de nombre
- Agregar campo "Nombre" al formulario de crear/editar GPS.
- Mostrar el nombre en la tabla de dispositivos.
- Guardar en la columna `name` de `gps_devices`.

#### 6. `TestSirenDialog.tsx` — Mostrar nombre del GPS
- En vez de "Sirena 1", "Sirena 2", mostrar `device.name || device.model || device.imei`.

#### 7. `send-sia-event/index.ts`
- Agregar `test` → `OP` al mapa de eventos (ya existe, sin cambios necesarios).

### Archivos a modificar
- **Migración SQL**: política pública SELECT en `gps_devices` + columna `name`
- **`GpsDevicesTab.tsx`**: campo nombre
- **`TestSirenDialog.tsx`**: insertar alarm de prueba + mostrar nombre
- **`AlarmsHistoryTab.tsx`**: tipo "test"
- **`OperatorDashboard.tsx`**: tipo "test"

