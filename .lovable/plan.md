

## Plan: Vista WhatsApp agrupada por parcelación + botón físico como usuario

### Cambios solicitados
1. **Vista jerárquica**: la pestaña "Números WhatsApp" en `/admin` deja de mostrar una fila por persona y pasa a mostrar **una fila por parcelación**. Al expandir, se ven los usuarios que pertenecen a esa parcelación, con sus controles de edición/eliminación intactos.
2. **Usuarios en múltiples parcelaciones**: aparecen en cada parcelación a la que pertenecen (ya están duplicados en BD por parcela, así que solo es agruparlos por `parcel_name`).
3. **Renombrar etiqueta del botón físico**: en los mensajes WhatsApp, el remitente actual `"Botón físico GPS (Sirena patio)"` pasa a `"Botón físico (Sirena patio)"` (se elimina la palabra "GPS").
4. **Botón físico como "usuario virtual" fijo**: para cada parcelación que tenga al menos un dispositivo GPS asociado con `panic_button_enabled = true`, en su grupo expandido aparece una fila ESPECIAL "Botón físico - {nombre sirena}" con un campo editable para el **número de usuario/zona CRA**. Esto permite asignarle un código (ej. "099") que el sistema usará en SIA al disparar la alarma desde el botón físico.

---

### Detalles técnicos

#### 1. UI — `src/components/admin/RegisteredNumbersTab.tsx`
- Reemplazar la `Table` plana por un `Accordion` de Radix (ya disponible en `src/components/ui/accordion.tsx`).
- Estructura nueva:
  ```
  ┌─ Parcelación: Teleguardia (5 personas + 1 botón físico)
  │    ┌────────────────────────────────────────────────┐
  │    │ Tabla de usuarios de Teleguardia               │
  │    │ - Juan Pérez | +57... | Casa A-12 | [edit][x]  │
  │    │ - ...                                          │
  │    │ ─────────────────────────────────────────────  │
  │    │ 🔴 BOTÓN FÍSICO — Sirena patio                 │
  │    │   Nº usuario CRA: [____] [Guardar]             │
  │    └────────────────────────────────────────────────┘
  ├─ Parcelación: Casa JuanGVasquez (2 personas)
  │    ...
  ```
- Se construye un nuevo `groupedByParcel`: `Map<parcel_name, { users: GroupedNumber[], physicalButtons: GpsDevice[] }>`.
- Se reusa el agrupamiento por teléfono existente, pero se filtra por parcela dentro de cada acordeón.
- Botones "Nuevo" y "Renombrar parcela" se mantienen en el header.

#### 2. Botón físico como entrada virtual
- Se carga `gps_devices` (filtrado por `panic_button_enabled = true`) + `gps_device_parcels` para saber qué dispositivo pertenece a qué parcela.
- Por cada `(device, parcel)` con SOS activo, se renderiza una fila destacada (fondo rojo suave + ícono `AlertTriangle`) dentro del acordeón de esa parcela.
- Campo editable: `user_number` (código CRA). Persistido en una **nueva columna `cra_user_number TEXT NULL`** en la tabla `gps_devices` — un número por dispositivo (no por parcela, ya que el botón pertenece físicamente al GPS).
- Botón "Guardar" hace `UPDATE gps_devices SET cra_user_number = ... WHERE id = ...`.

#### 3. Renombre en `traccar-webhook`
- Cambiar la línea 193:
  ```ts
  const senderName = `Botón físico${deviceName ? ` (${deviceName})` : ""}`;
  ```

#### 4. Uso del `cra_user_number` en SIA (futuro)
- Esta migración + el campo dejan listo el dato. Se debe propagar a `send-sia-event` para que cuando una alarma venga del botón físico, use ese código como "user number" del SIA-DCS. **Lo incluyo en este plan**: modificar `traccar-webhook` para leer `device.cra_user_number` e incluirlo en el body que envía a `send-sia-event`, y modificar `send-sia-event` para anteponerlo al evento si está presente.

---

### Migración de base de datos
- `ALTER TABLE gps_devices ADD COLUMN cra_user_number TEXT NULL;`

### Archivos a modificar
- **Migración nueva**: añadir `cra_user_number` a `gps_devices`.
- **`src/components/admin/RegisteredNumbersTab.tsx`**: reestructurar a acordeón por parcela + filas de botón físico.
- **`supabase/functions/traccar-webhook/index.ts`**: quitar "GPS" del `senderName` + pasar `cra_user_number` a `send-sia-event`.
- **`supabase/functions/send-sia-event/index.ts`**: aceptar y usar `cra_user_number` opcional cuando venga del webhook.

### Comportamiento esperado tras el cambio
- En `/admin → WhatsApp` ves 2 filas (una por parcelación). Al expandir "Teleguardia", ves Juan, Santiago, etc. + una fila especial "Botón físico - Sirena patio" con campo para Nº CRA.
- Si activas el botón físico de "JuanG Vasquez" en Dispositivos GPS, automáticamente aparece su fila virtual al expandir "Casa JuanGVasquez".
- WhatsApp grupal mostrará: `👤 Botón físico (Sirena patio)` en vez de `👤 Botón físico GPS (Sirena patio)`.
- Al disparar SOS físico, el evento SIA enviado a la CRA llevará el código que configuraste.

