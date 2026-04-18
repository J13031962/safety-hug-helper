
## Plan: Recibir alarmas de pánico físicas desde GPS Traccar

### Contexto
Actualmente el flujo de alarmas funciona así:
- Usuario abre la app → presiona botón → se inserta en `alarms` → dispara `send-gps-command` (siren ON) + `send-whatsapp` + `send-sia-event` (CRA).

Lo que pides: cuando alguien presione el **botón físico de pánico** del GPS (sin app), Traccar reciba el evento y nosotros también lo procesemos para disparar el mismo flujo (sirena, WhatsApp, CRA, registro en `/operador` y `/admin`).

### ¿Tenemos la estructura? Parcialmente.
Lo que ya existe:
- `gps_devices` con IMEI y `gps_device_parcels` (multi-parcela).
- `send-gps-command`, `send-whatsapp`, `send-sia-event`.
- Tabla `alarms` con `alarm_type`.

Lo que falta: un **endpoint público (webhook)** que Traccar pueda llamar cuando detecta el evento de pánico, y configurar Traccar para que lo llame.

---

### Cambios propuestos

#### 1. Nueva edge function `traccar-webhook` (pública, `verify_jwt = false`)
- Recibe POST de Traccar con el payload de evento/posición.
- Traccar envía algo como:
  ```json
  {
    "event": { "type": "alarm", "deviceId": 123, "attributes": { "alarm": "sos" } },
    "device": { "uniqueId": "355468592594287", "name": "..." },
    "position": { "latitude": ..., "longitude": ... }
  }
  ```
- Lógica:
  1. Validar que sea evento de tipo `alarm` con `alarm == "sos"` (o similar — GT06 reporta SOS como "sos"/"panic").
  2. Validar token compartido en header (ej. `X-Traccar-Token` con valor secreto `TRACCAR_WEBHOOK_TOKEN`) para evitar abuso público.
  3. Buscar IMEI en `gps_devices` → obtener parcelas asociadas vía `gps_device_parcels`.
  4. Para cada parcela, insertar fila en `alarms` con:
     - `alarm_type: "panic"`
     - `parcel_name: <parcela>`
     - `sender_name: "Botón físico GPS"` (o nombre del device si tiene)
     - `phone_number: null`
     - `latitude`/`longitude` del payload si vienen
     - `observations: "Activado desde botón físico del GPS <imei/name>"`
  5. Llamar `send-gps-command` (con `imei` directo, modo no-test) → activa la sirena en esa parcela.
  6. Llamar `send-whatsapp` por cada parcela.
  7. Llamar `send-sia-event` con el evento PA.

#### 2. Secreto nuevo
- `TRACCAR_WEBHOOK_TOKEN` — token compartido para validar que la llamada viene de Traccar y no de un atacante.

#### 3. Configuración en Traccar (instrucciones para el usuario, fuera del código)
Después de desplegar la función, te daré:
- URL del webhook: `https://xvojmfakqlzplbzaoqdi.supabase.co/functions/v1/traccar-webhook`
- Cómo configurarla en Traccar: en `traccar.xml` agregar:
  ```xml
  <entry key='forward.enable'>true</entry>
  <entry key='forward.type'>json</entry>
  <entry key='forward.url'>https://.../functions/v1/traccar-webhook</entry>
  <entry key='forward.header'>X-Traccar-Token: <token></entry>
  ```
  O mediante notificaciones por tipo (`alarm`) hacia un webhook.

#### 4. Ajuste menor en `send-gps-command`
Ya soporta `{ imei, action }` directo, así que el webhook puede invocarlo sin cambios. Pero necesitamos también disparar el flujo "alarma real" (programar engineResume con `relay_duration`). Para eso, el webhook insertará en `alarms` y llamará `send-gps-command` con el formato `{ alarm_type, alarm_id }` como hace el frontend hoy → reutiliza la lógica existente de scheduling.

### Archivos
- **Nuevo**: `supabase/functions/traccar-webhook/index.ts`
- **Nuevo secreto**: `TRACCAR_WEBHOOK_TOKEN`
- Sin cambios en frontend ni en otras funciones.

### Después de implementar
Te paso la URL exacta y el bloque de configuración para pegar en Traccar (sección "Computed Attributes" o "Notifications → Webhook" según versión).
