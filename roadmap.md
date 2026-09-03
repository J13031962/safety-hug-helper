# Roadmap — Migración a Supabase propio (Halcón)

## Hecho
- [x] Artefactos SQL de migración en `migration/halcon/` (schema, datos, cron, usuarios, guía)
- [x] Frontend con schema configurable (`src/integrations/supabase/db.ts`, `VITE_DB_SCHEMA`)
- [x] 9 Edge Functions con schema configurable (`supabase/functions/_shared/dbSchema.ts`, secreto `DB_SCHEMA`)

## Pendiente (lo haces tú en Halcón)
- [ ] Ejecutar `01_schema.sql` y `03_data.sql` en el SQL Editor del proyecto destino
- [ ] Crear los 6 usuarios en Auth + bloque SQL de `04_auth_users.md`
- [ ] Exponer el schema `smartsos` en la Data API
- [ ] Ejecutar `02_cron.sql` (realtime + cron de sirenas)
- [ ] Desconectar Lovable Cloud (irreversible)
- [ ] Conectar el conector Supabase por OAuth al proyecto `junctwbyjtjhwjjioytc`
- [ ] Definir `VITE_DB_SCHEMA=smartsos` y el secreto `DB_SCHEMA=smartsos`
- [ ] Recrear los 7 secretos de funciones y desplegar las 9 funciones
- [ ] Reapuntar Traccar y SmartSOS Mobile a la nueva URL
- [ ] Checklist de verificación del README
