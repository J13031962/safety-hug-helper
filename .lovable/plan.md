

## Plan: GPS multi-parcela + Administradores de parcelación + Botón de prueba

### Resumen
Tres cambios principales:
1. Un GPS puede estar enlazado a **múltiples parcelaciones** (para que la central de monitoreo reciba todas las alarmas)
2. Usuarios WhatsApp pueden ser marcados como **administradores de parcelación**
3. Los administradores ven un **5to botón "Prueba"** que les permite activar sirenas individuales y enviar evento SIA OP

---

### 1. Base de datos

**Nueva tabla `gps_device_parcels`** (relación muchos-a-muchos):
```sql
CREATE TABLE gps_device_parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES gps_devices(id) ON DELETE CASCADE,
  parcel_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- RLS: mismas políticas que gps_devices (admin/director)
```

**Migración de datos**: copiar el `parcel_name` actual de cada `gps_devices` a la nueva tabla, luego eliminar la columna `parcel_name` de `gps_devices`.

**Nueva columna en `registered_numbers`**:
```sql
ALTER TABLE registered_numbers ADD COLUMN is_parcel_admin boolean DEFAULT false;
```

### 2. Admin UI — GPS (`GpsDevicesTab.tsx`)

- Reemplazar el `Select` de parcelación única por **checkboxes multi-select** (igual que RegisteredNumbersTab)
- La tabla mostrará badges con todas las parcelaciones asignadas
- Al guardar, insertar/actualizar filas en `gps_device_parcels`

### 3. Admin UI — WhatsApp (`RegisteredNumbersTab.tsx`)

- Agregar un **checkbox/switch "Admin de parcelación"** en el formulario de edición
- Mostrar un badge "Admin" en la tabla para los que lo tengan activado

### 4. Backend — `send-gps-command`

- Cambiar la consulta de dispositivos: en vez de filtrar por `gps_devices.parcel_name`, buscar en `gps_device_parcels` los device_id que tengan la parcela de la alarma
- Esto permite que un dispositivo suene para múltiples parcelaciones

### 5. Frontend — Botón de Prueba (Index.tsx + nuevo componente)

- En `PhoneGate`, al cargar datos del usuario, traer también `is_parcel_admin`
- Si `is_parcel_admin === true`, mostrar un **5to botón "PRUEBA"** (color gris/neutro) en la pantalla principal
- Al presionar "Prueba", abrir un diálogo que:
  - Lista todos los GPS (mostrados como "Sirena 1", "Sirena 2"... o por modelo/IMEI) asociados a las parcelaciones del usuario
  - Cada sirena tiene un botón "Activar" individual
  - Al activar, invoca `send-sia-event` con el evento `OP` (opening) y la cuenta de la parcela correspondiente
  - También activa la sirena física via `send-gps-command` con el IMEI específico

### 6. Edge Function — `send-sia-event`

- Agregar `OP` al mapa de eventos (o recibirlo directamente como código)
- Para prueba: `"SIA-DCS"0001L0#ACCOUNT[#ACCOUNT|OP]_\r\n`

### 7. Nuevo Edge Function o extensión de `send-gps-command`

- Agregar soporte para activar un dispositivo específico por IMEI (modo prueba), no por parcela completa
- Parámetro: `{ mode: "test", imei: "...", alarm_id: null }`

### Flujo del botón de prueba

```text
Admin parcela presiona "Prueba"
  → Diálogo muestra lista de sirenas de sus parcelaciones
  → Presiona "Activar" en sirena X
  → Llama send-gps-command con IMEI específico (activa sirena física)
  → Llama send-sia-event con evento OP (notifica CRA)
  → Sirena suena por relay_duration, luego se apaga automáticamente
```

### Archivos a modificar/crear
- **Migración SQL**: nueva tabla `gps_device_parcels`, columna `is_parcel_admin`, migrar datos
- **`GpsDevicesTab.tsx`**: multi-select parcelas
- **`RegisteredNumbersTab.tsx`**: checkbox admin
- **`send-gps-command/index.ts`**: consultar `gps_device_parcels` + modo test por IMEI
- **`send-sia-event/index.ts`**: agregar evento OP
- **`PhoneGate.tsx`**: cargar `is_parcel_admin`
- **`Index.tsx`**: agregar 5to botón + diálogo de prueba
- **`EmergencyGrid.tsx`**: o nuevo componente `TestSirenDialog.tsx`

