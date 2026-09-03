# Mover SmartSOS a la base de datos de Halcón (schema `smartsos`)

## Lo primero: esto NO baja los 1,9 créditos/día

Tu objetivo declarado es reducir costos, y aquí hay que ser claro antes de mover nada:

- Los créditos de **Run** son de la infraestructura de Lovable (preview, ejecución del proyecto). No son cargos de base de datos.
- Lovable Cloud no se puede desconectar de este proyecto. Aunque la base viva en Halcón, Cloud sigue activo y sigue consumiendo lo mismo.
- Resultado esperado: **el consumo diario se mantiene igual**, y además pasas a cargar el tráfico de SmartSOS sobre el plan de Halcón.

Recomendación honesta: si el único motivo es el costo, esta migración no lo resuelve y sí añade riesgo operativo sobre un sistema de emergencias en producción. Aun así, abajo queda el plan completo por si decides avanzar (por unificar administración, tener SQL directo, backups propios).

## Qué implica realmente

Al no poder desconectar Cloud, la única vía es que el código apunte manualmente a Halcón. Eso significa salir del flujo gestionado:

- Los cambios de esquema ya no se harían por el chat con aprobación; los ejecutarías tú en el dashboard de Supabase de Halcón.
- `types.ts` deja de regenerarse solo; se mantiene a mano.
- Las 9 edge functions se despliegan con la CLI de Supabase desde tu máquina, no desde aquí.
- Los secretos (TRACCAR_*, TEXTMEBOT_API_KEY, BLE_GATEWAY_TOKEN, etc.) hay que recrearlos en Halcón.
- Los `pg_cron` de apagado de sirenas hay que recrearlos en Halcón.

## Riesgos concretos

| Riesgo | Impacto |
|---|---|
| Recursos compartidos con Halcón | Una tormenta de alarmas o el cron de sirenas puede degradar Halcón |
| Auth separado | Los usuarios (admin, operadores) viven en el `auth.users` de Cloud; hay que recrearlos en Halcón con nuevas contraseñas. Los `user_id` cambian y hay que remapear roles y asignaciones de parcelación |
| Ventana de corte | Durante la migración las alarmas no llegan; hay que hacerlo en horario de baja actividad |
| Mantenimiento manual permanente | Cada cambio futuro de esquema o función es trabajo tuyo, no del chat |
| Sin rollback automático | Si algo falla hay que revertir el código a Cloud a mano |

## Plan de migración (schema `smartsos` en Halcón)

### Fase 1 — Preparar Halcón
1. Crear el schema `smartsos` y exponerlo en la Data API de Halcón (Settings → API → Exposed schemas).
2. Recrear el esquema completo dentro de `smartsos`: 12 tablas (`alarms`, `parcels`, `registered_numbers`, `gps_devices`, `gps_device_parcels`, `gps_relay_jobs`, `ble_devices`, `ble_events`, `operator_parcels`, `profiles`, `user_roles`) más el enum `app_role` y las funciones `has_role`, `operator_parcel_names`, `handle_new_user`, `update_updated_at_column`.
3. Recrear GRANTs, RLS y todas las políticas tal como están hoy.
4. Recrear los `pg_cron` de apagado de sirenas.

### Fase 2 — Migrar datos
5. Exportar cada tabla de Cloud a CSV (Cloud → Advanced settings → Export data) e importarla en `smartsos.*` respetando el orden de llaves foráneas.
6. Recrear los usuarios de auth en Halcón y remapear `profiles`, `user_roles` y `operator_parcels` a los nuevos `user_id`.
7. Verificar conteos tabla por tabla contra el origen.

### Fase 3 — Apuntar el código
8. Añadir un cliente Supabase que apunte a Halcón con `db: { schema: "smartsos" }`, en un archivo propio (no se puede editar el cliente autogenerado de Cloud).
9. Cambiar los ~26 puntos de acceso a datos en frontend (13 archivos) a ese cliente. Con schema propio **no hay que renombrar ninguna tabla**: siguen siendo `alarms`, `gps_devices`, etc.
10. Ajustar las 9 edge functions para usar la URL/service key de Halcón y el schema `smartsos`, y desplegarlas con la CLI en Halcón.
11. Reapuntar los webhooks externos: `traccar-webhook` (en `traccar.xml`) y `ble-button-event` (en SmartSOS Mobile) al nuevo dominio de funciones.
12. Migrar `types.ts` a los tipos del schema `smartsos`.

### Fase 4 — Verificar
13. Login de admin y operador, filtrado por parcelación.
14. Alarma real de cada uno de los 5 botones: inserción, WhatsApp, SIA y sirena.
15. Botón físico GPS vía Traccar y botón BLE vía `ble-button-event`.
16. Apagado automático de sirena por `pg_cron`.

## Detalles técnicos

- El aislamiento por schema evita las colisiones que tendría el sufijo `_smartsos`: `has_role()` y el enum `app_role` ya existen en Halcón y en un mismo schema chocarían.
- `supabase-js` soporta un schema no público con `createClient(url, key, { db: { schema: "smartsos" } })`, siempre que el schema esté expuesto en la Data API.
- Las tablas del sistema (`auth.users`, `storage`) no se pueden mover a `smartsos`; por eso el auth queda como el punto más delicado de la migración.
- El código seguiría conviviendo con el cliente de Cloud autogenerado, que no se puede eliminar.

## Alternativa recomendada si el objetivo es el costo

En lugar de migrar, revisar qué está generando el consumo de Run: intervalos de polling (`useAutoUpdate` cada 60 s), suscripciones realtime abiertas y frecuencia del cron de relés. Ajustar eso es de bajo riesgo y sí afecta el consumo real. Puedo auditarlo si quieres.
