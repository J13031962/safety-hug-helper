

## Plan: Dar permisos de administrador al rol `director_monitoreo`

### Cambios necesarios

#### 1. Frontend — `src/pages/AdminPanel.tsx`
- Cambiar las verificaciones `role !== "admin"` para aceptar también `director_monitoreo`
- Línea 20: `if (!loading && (!user || (role !== "admin" && role !== "director_monitoreo")))`
- Línea 33: misma condición

#### 2. Frontend — `src/pages/Plataforma.tsx`
- Agregar `director_monitoreo` a la condición que redirige a `/admin` (línea 17):
  `if (role === "admin" || role === "director_monitoreo")`

#### 3. Edge Functions — Autorización del caller
Los 3 edge functions verifican que el caller sea admin. Se debe ampliar para aceptar `director_monitoreo`:

- **`supabase/functions/create-user/index.ts`**: Cambiar query de roles para buscar `role IN ('admin', 'director_monitoreo')`
- **`supabase/functions/update-user/index.ts`**: Igual
- **`supabase/functions/delete-user/index.ts`**: Igual

#### 4. RLS Policies — Base de datos
Las políticas de INSERT/UPDATE/DELETE en `gps_devices`, `user_roles`, `parcels` y `registered_numbers` solo permiten `admin`. Se deben agregar políticas adicionales (o modificar las existentes) para incluir `director_monitoreo`:

- `gps_devices`: insert, update, delete
- `parcels`: manage (ALL)
- `user_roles`: insert, update, delete
- `registered_numbers`: insert, update, delete

Se crearán nuevas políticas permisivas con `has_role(auth.uid(), 'director_monitoreo')` para cada tabla/operación afectada.

### Sin cambios
- No se modifica el esquema de tablas
- El rol `director_monitoreo` ya existe en el enum `app_role`

