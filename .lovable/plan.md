# Migrar SmartSOS a tu Supabase (Halcón) vía conector Supabase

## Punto clave sobre el conector

Verifiqué el catálogo de conectores: el conector **Supabase** solo se puede usar en proyectos que **no** tienen un proyecto Supabase adjunto. Un proyecto corriendo en Lovable Cloud **no puede** conectarlo mientras Cloud esté activo.

Por lo tanto el orden obligatorio es:

```text
1. Preparar TODO (SQL + datos + funciones + secretos)   <- sin riesgo
2. Aplicar el schema y los datos en Halcón              <- sin riesgo
3. Desconectar Lovable Cloud (irreversible, borra la BD actual)
4. Conectar el conector Supabase apuntando a Halcón
5. Desplegar funciones, reapuntar webhooks y verificar
```

El paso 3 destruye la base actual (Cloud), por eso no se toca hasta que Halcón tenga todo cargado y probado.

## Proyecto destino y credenciales

- Proyecto destino: `https://junctwbyjtjhwjjioytc.supabase.co` (ref `junctwbyjtjhwjjioytc`).
- **No hace falta la contraseña de la base de datos ni la service role key en el chat**: el conector Supabase usa OAuth y Lovable recupera las claves de forma segura.
- La contraseña de `postgresql://postgres:[YOUR-PASSWORD]@db.junctwbyjtjhwjjioytc.supabase.co:5432/postgres` está en tu dashboard de Supabase → Project Settings → Database → Reset database password. Solo la necesitas si prefieres cargar el SQL con `psql` en lugar de pegarlo en el SQL Editor.
- El SQL de las fases 1 y 2 se puede aplicar entero desde el SQL Editor del proyecto, sin contraseña.


## Fase 1 — Artefactos (lo que preparo ahora)

- `migration/halcon/01_schema.sql`: schema `smartsos` completo — enum `app_role`, las 12 tablas (`parcels`, `profiles`, `user_roles`, `operator_parcels`, `registered_numbers`, `alarms`, `gps_devices`, `gps_device_parcels`, `gps_relay_jobs`, `ble_devices`, `ble_events`), índices, GRANTs, RLS con todas las políticas actuales y las 6 funciones (`has_role`, `handle_new_user`, `operator_parcel_names`, `update_updated_at_column`, etc.) con `search_path` al nuevo schema.
- `migration/halcon/02_cron.sql`: job de apagado de sirenas (`process-relay-jobs`).
- `migration/halcon/03_data.sql`: volcado de datos actuales (parcelaciones, números registrados, dispositivos GPS/BLE, asignaciones, histórico de alarmas).
- `migration/halcon/04_auth_users.md`: lista de usuarios y roles a recrear en Auth de Halcón, con el SQL de remapeo de `user_id` en `profiles`, `user_roles` y `operator_parcels`.
- `migration/halcon/README.md`: guía paso a paso, incluida la exposición del schema `smartsos` en la Data API y los secretos que hay que volver a crear (Traccar, TextMeBot, tokens BLE/webhook, grupo WhatsApp).

## Fase 2 — Código del proyecto

- Cliente Supabase y las 13 pantallas/hooks que consultan datos pasan a usar el schema `smartsos` (vía `db: { schema: 'smartsos' }` en el cliente, sin reescribir cada `.from()`).
- Las 9 Edge Functions (`ble-button-event`, `traccar-webhook`, `send-whatsapp`, `send-sia-event`, `send-gps-command`, `process-relay-jobs`, `create-user`, `update-user`, `delete-user`) se ajustan al schema y a las variables de entorno del nuevo proyecto.
- Sin cambios funcionales: los 5 botones, códigos SIA (`PA/MA/FA/BA/HA001`, prueba `TA001`), lógica invertida de Traccar y flujo WhatsApp quedan idénticos.

## Fase 3 — Corte y verificación

Después de desconectar Cloud y conectar Halcón:

- Redesplegar las 9 funciones y recrear los secretos.
- Reapuntar el webhook de Traccar y el endpoint BLE a la nueva URL.
- Checklist: login por teléfono (PhoneGate), login admin/operador, los 5 botones, WhatsApp, SIA a la CRA, sirena on/off, apagado automático, evento BLE y aislamiento por parcelación.

## Riesgos

- El desligue de Cloud es irreversible y borra la base actual: los datos deben estar ya en Halcón.
- Auth no se migra: hay que recrear usuarios (contraseñas nuevas) y remapear sus IDs.
- Halcón comparte CPU/conexiones con SmartSOS; el consumo de créditos Run de Lovable **no** baja por esto.
- Ventana de indisponibilidad durante el corte (minutos).

## Qué necesito de ti para arrancar la Fase 2/3

- Confirmar que quieres que prepare todos los artefactos ya.
- Confirmar que el schema se llamará `smartsos` (sin sufijos por tabla).
- Cuando llegue el paso 4, hacer tú el flujo OAuth del conector Supabase eligiendo el proyecto Halcón.
