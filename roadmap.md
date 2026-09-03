# Roadmap — SmartSOS conectado a Supabase Halcón

## Hecho
- [x] Proyecto Supabase Halcón conectado (`junctwbyjtjhwjjioytc`)
- [x] `.env` y `supabase/config.toml` sincronizados con la nueva referencia
- [x] Documentación BLE actualizada a la URL de Halcón
- [x] Artefactos SQL de migración en `migration/halcon/` (schema, datos, cron, usuarios, guía)
- [x] Frontend con schema configurable (`src/integrations/supabase/db.ts`, `VITE_DB_SCHEMA`)
- [x] 9 Edge Functions con schema configurable (`supabase/functions/_shared/dbSchema.ts`, secreto `DB_SCHEMA`)

## Pendiente (decisión tuya)
- [ ] Ejecutar `01_schema.sql` y `03_data.sql` en el SQL Editor del proyecto destino (solo si quieres schema aislado `smartsos`)
- [ ] Crear los 6 usuarios en Auth + bloque SQL de `04_auth_users.md` (solo si usas `smartsos`)
- [ ] Exponer el schema `smartsos` en la Data API (solo si usas `smartsos`)
- [ ] Ejecutar `02_cron.sql` (realtime + cron de sirenas; solo si usas `smartsos`)
- [ ] Definir `VITE_DB_SCHEMA=smartsos` y el secreto `DB_SCHEMA=smartsos` (solo si usas `smartsos`)
- [ ] Recrear los 7 secretos de funciones y desplegar las 9 funciones en Halcón
- [ ] Reapuntar Traccar y SmartSOS Mobile a la nueva URL
- [ ] Checklist de verificación del README

