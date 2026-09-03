# Migración a Halcón: por qué la advertencia es segura

## Qué revisé en los archivos

Todos los objetos del script están escritos con el prefijo de schema `smartsos.`:

- `CREATE SCHEMA IF NOT EXISTS smartsos` y 11 tablas `CREATE TABLE IF NOT EXISTS smartsos.*`
- Enum `smartsos.app_role`
- Funciones `smartsos.has_role`, `smartsos.operator_parcel_names`, `smartsos.update_updated_at_column`, `smartsos.handle_new_user`
- GRANTs y `ENABLE ROW LEVEL SECURITY` solo sobre `smartsos.*`
- Los `DROP` presentes son únicamente `DROP POLICY IF EXISTS ... ON smartsos.<tabla>` y `DROP TRIGGER IF EXISTS update_ble_devices_updated_at ON smartsos.ble_devices`

No hay ningún `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, `DELETE` ni referencia a tablas del schema `public` de Halcón. La advertencia de Supabase aparece porque el editor detecta las palabras `DROP` (de políticas) y las considera "destructivas" de forma genérica.

## Los 3 únicos puntos que tocan objetos compartidos

1. `CREATE EXTENSION IF NOT EXISTS pg_cron` — si Halcón ya la tiene, no hace nada.
2. Trigger en `auth.users`: se llama `on_auth_user_created_smartsos` (nombre distinto al de Halcón) y el `DROP TRIGGER IF EXISTS` apunta solo a ese nombre. El trigger existente de Halcón no se toca. Si Supabase rechaza crearlo por permisos, se crea desde el dashboard.
3. `ALTER PUBLICATION supabase_realtime ADD TABLE smartsos.alarms` (en 02_cron.sql) — agrega una tabla a la publicación, no quita las de Halcón.

## Orden de ejecución sugerido

1. Respaldo/punto de restauración del proyecto Halcón (opcional pero recomendado).
2. Pegar el **contenido** de `01_schema.sql` en el SQL Editor y confirmar "Run query".
3. Verificar: `SELECT table_name FROM information_schema.tables WHERE table_schema='smartsos';` (deben salir 11 tablas) y confirmar que `public` sigue intacto.
4. Ejecutar `03_data.sql` (solo inserta en `smartsos.*`).
5. Ejecutar `02_cron.sql` reemplazando `<PROJECT_REF>` y `<SERVICE_ROLE_KEY>`.
6. Recrear usuarios de Auth según `04_auth_users.md` y remapear perfiles/roles.

Después de eso se adapta la app (`VITE_DB_SCHEMA=smartsos`, `DB_SCHEMA=smartsos`) y solo al final se desconecta Cloud.
