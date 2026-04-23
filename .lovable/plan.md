

## Plan: Habilitar/deshabilitar botón físico por dispositivo + blindaje de aislamiento por parcela

### Problema 1 — Activar/desactivar botón físico por GPS
Hoy CUALQUIER dispositivo registrado puede disparar alarma desde el botón físico. Quieres poder decidir, dispositivo por dispositivo, si su botón SOS está autorizado.

### Problema 2 — "Casa JuanGVasquez" se disparó cuando solo se presionó "Sirena patio"
"Sirena patio" está asociada solo a la parcela `Teleguardia`. "JuanG Vasquez" solo a `Casa JuanGVasquez`. Las asociaciones en BD son correctas. La causa más probable del cruce: Traccar reenvió 2 eventos casi seguidos (uno por cada device online en ese momento) o un evento sin IMEI específico. El plan refuerza el aislamiento para que sea matemáticamente imposible que un IMEI dispare la parcela de OTRO IMEI.

---

### Cambios

**1. Migración de base de datos**
- Agregar columna `panic_button_enabled BOOLEAN NOT NULL DEFAULT false` a `gps_devices`.
- Por defecto `false` para que NINGÚN botón físico dispare hasta que tú lo habilites explícitamente (modo seguro).

**2. Edge function `traccar-webhook` (endurecimiento)**
- Tras encontrar el `device` por IMEI, verificar `device.panic_button_enabled`. Si es `false` → loguear `panic_button_disabled` e ignorar (200 OK).
- Procesar SOLO los `parcel_name` asociados a ESE device específico (ya lo hace, pero añadir log explícito mostrando IMEI + parcelas exactas + alarma_id por cada inserción para auditar cruces).
- Garantizar idempotencia básica: si el mismo IMEI generó alarma SOS en los últimos 30 segundos, ignorar duplicados (evita doble inserción si Traccar reenvía).

**3. UI Admin — `GpsDevicesTab.tsx`**
- Nueva columna en la tabla: **"Botón físico"** con un Switch por fila (verde "Activo" / gris "Inactivo"). Toggle inmediato (update en BD + refetch).
- En el dialog de crear/editar dispositivo: nuevo campo Switch "Permitir botón físico de pánico (SOS)" con texto de ayuda: *"Si está desactivado, presionar el SOS en este GPS NO disparará alarma."*
- Indicador visual en la fila (badge rojo "SOS habilitado" cuando esté activo) para que sea obvio cuáles equipos están armados.

**4. Sin cambios en frontend de alarmas, send-gps-command, send-whatsapp ni send-sia-event**
El bloqueo se hace en el punto de entrada (webhook). Si un GPS está deshabilitado, nunca se inserta la alarma → nada se dispara.

---

### Comportamiento esperado tras el cambio
- Tras desplegar: TODOS los dispositivos quedan con botón físico **desactivado** por defecto. Tú activas manualmente "Sirena patio" desde el panel.
- Presionar SOS en "JuanG Vasquez" (deshabilitado) → webhook responde `ignored: panic_button_disabled`, no pasa nada.
- Presionar SOS en "Sirena patio" (habilitado) → solo se inserta alarma para `Teleguardia`, solo suena la sirena de `Teleguardia`, solo llega WhatsApp al grupo de `Teleguardia`.
- Si Traccar reenvía el mismo evento dos veces en <30s, se ignora la segunda.

### Archivos
- **Migración nueva**: añadir columna `panic_button_enabled` a `gps_devices`.
- **Modificar**: `supabase/functions/traccar-webhook/index.ts`
- **Modificar**: `src/components/admin/GpsDevicesTab.tsx`

