# Aviso a la CRA cuando WhatsApp se cae (UT001 / UR001)

## Objetivo

Si el servicio de WhatsApp (hoy TextMeBot, o cualquiera que se use en el futuro) queda desconectado, la CRA recibe de inmediato la señal de falla técnica `UT001` en todas las cuentas de parcelación. Cuando WhatsApp vuelve a funcionar, la CRA recibe `UR001` (restauración). No se repite la señal mientras el estado no cambie.

Ejemplo de lo que llega para la cuenta 9999:

```text
"SIA-DCS"0001L0#9999[#9999|UT001]_
"SIA-DCS"0001L0#9999[#9999|UR001]_
```

## Qué se va a construir

1. **Registro del estado de WhatsApp**: una tabla nueva que guarda si el servicio está "arriba" o "caído", desde cuándo y el último motivo. Es **una sola fila por servicio** (se actualiza, no crece).

2. **Bitácora de chequeos con limpieza diaria**: cada chequeo de 5 minutos deja un registro en una tabla de historial (para poder ver cuándo se cayó y cuánto duró). Esa tabla se limpia automáticamente **una vez al día**, borrando todo lo anterior a 7 días, para que no acumule basura.

3. **Detección al fallar un envío real**: cuando una alarma intenta mandar WhatsApp y el proveedor responde que el número está desconectado (u otro error de sesión), se marca el estado como caído y se disparan las señales `UT001`.

4. **Chequeo automático cada 5 minutos**: un proceso programado consulta el estado del número en el proveedor. Si está desconectado y antes estaba bien → `UT001`. Si está conectado y antes estaba caído → `UR001`. Si no cambió nada, no envía nada.

5. **Envío a todas las parcelaciones**: las señales se mandan una por cada parcelación que tenga número de abonado CRA configurado, con zona `001`.

6. **Visibilidad en el panel**: en /admin, en la sección de WhatsApp, se muestra el estado actual (Conectado / Desconectado desde tal hora) para que se sepa sin revisar registros.


## Detalles técnicos

- Migración: tabla `smartsos.service_status` (`service` texto único, `status`, `changed_at`, `last_reason`, `updated_at`) con GRANTs (`select` a `authenticated`, `all` a `service_role`), RLS activo y política de lectura para usuarios autenticados; escritura solo vía `service_role`. Fila inicial `('whatsapp','up')`. Esta tabla nunca crece: es 1 fila por servicio.
- Migración: tabla `smartsos.service_status_log` (`service`, `status`, `reason`, `checked_at`) con índice por `checked_at`, mismos GRANTs y RLS. Guarda cada chequeo de 5 min.
- Retención: función `smartsos.cleanup_service_status_log()` que hace `DELETE FROM smartsos.service_status_log WHERE checked_at < now() - interval '7 days'`, más un cron diario (`0 3 * * *`, `smartsos-cleanup-service-log`) que la ejecuta. Se documenta en `migration/halcon/02_cron.sql`.
- `send-sia-event`: agregar a `EVENT_CODES` → `trouble: "UT"` y `trouble_restore: "UR"`. Sin otros cambios de firma.
- Nueva función `whatsapp-health`:
  - `GET/POST` sin cuerpo → hace el chequeo de estado contra el proveedor de WhatsApp actual (TextMeBot: consulta con `apikey`; si en el futuro se cambia el proveedor, solo se ajusta esta comprobación).
  - Acepta también `{ service: "whatsapp", status: "down", reason }` desde `send-whatsapp` para reportar una falla detectada en un envío real.
  - Compara con `smartsos.service_status`; si hay transición, recorre `smartsos.parcels` con `account_number` no nulo e invoca `send-sia-event` con `alarm_type: "trouble" | "trouble_restore"`, `parcel_name`, `cra_user_number: "001"`, `source: "whatsapp-health"`.
  - Actualiza la fila de estado solo después de intentar el envío; registra el resultado en logs.
- `send-whatsapp`: tras el POST al proveedor, si la respuesta contiene indicios de sesión caída (`disconnected`, `411`, etc.), invoca `whatsapp-health` con `status: "down"` (fire-and-forget, sin bloquear la alarma). Si el envío fue exitoso, reporta `status: "up"` para permitir la restauración inmediata.
- Cron: agregar en Supabase un job cada 5 minutos que llame a `whatsapp-health` con `net.http_post` y la Service Role Key, igual al patrón ya usado por `process-relay-jobs`; se documenta en `migration/halcon/02_cron.sql`.
- Frontend: `SettingsTab.tsx` (sección WhatsApp) lee `smartsos.service_status` para mostrar el estado; sin cambios en la lógica de alarmas.

## Fuera de alcance

- No se cambia el proveedor de WhatsApp ni se resuelve la desconexión de TextMeBot; este trabajo solo garantiza que la CRA se entere cuando ocurra.
