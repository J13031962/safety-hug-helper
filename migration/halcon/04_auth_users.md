# Recrear los usuarios en Auth del proyecto destino

Auth **no se puede migrar por SQL**: hay que crear cada usuario de nuevo (con contraseña nueva)
y luego remapear su `user_id` en `smartsos.profiles`, `smartsos.user_roles` y `smartsos.operator_parcels`.

## 1. Usuarios actuales

| Email | Nombre | Rol | user_id actual (Cloud) |
|---|---|---|---|
| admin@teleguardia.com | Administrador Principal | admin | 5855873a-73c9-4e84-a900-5f96ac5ab582 |
| santiago.barrientos@teleguardia.com | Santiago Barrientos | director_monitoreo | 2158229d-fa08-4308-b7d5-47f28fd13504 |
| harol.murcia@teleguardia.com | Harol Murcia | director_monitoreo | 419ad2d4-cb9c-4af3-97c5-89d1d2631a5d |
| ast1@teleguardia.com | FEDERMAN CHAVERRA | director_monitoreo | f7fca85e-072f-43f5-bd3e-f71d46d8f0bc |
| luis.perez@teleguardia.com | luis perez | operator | 0093d7d4-c2e1-429a-9b4f-4bbf94f4d225 |
| porteria@casavieja.com | Portería Casa Vieja | operator | 5643bffd-70fa-4fbd-b38b-ae49e6daab56 |

Asignaciones de parcelación de operadores (tabla `operator_parcels`):

- `luis.perez@teleguardia.com` y `porteria@casavieja.com`: ver `03_data.sql`; las filas apuntan a
  `parcels.id`, que **no cambia** porque se migran con el mismo UUID. Solo cambia `user_id`.

## 2. Crear los usuarios

En el dashboard del proyecto destino: **Authentication → Users → Add user**, con
*Auto Confirm User* activado, y una contraseña temporal por usuario. Crea los 6 emails de la tabla.

> No habilites registro público (sign-ups) si no lo necesitas: los usuarios se crean desde /admin.

## 3. Remapear los IDs

Después de crearlos, ejecuta esto en el SQL Editor. Toma el `id` nuevo desde `auth.users` por email,
así que no hace falta copiar UUIDs a mano:

```sql
-- Perfiles: apunta cada perfil al nuevo usuario con el mismo email
UPDATE smartsos.profiles p
SET user_id = u.id
FROM auth.users u
WHERE lower(u.email) = lower(p.email)
  AND p.user_id <> u.id;

-- Roles: remapea por el email del perfil
UPDATE smartsos.user_roles r
SET user_id = u.id
FROM smartsos.profiles p
JOIN auth.users u ON lower(u.email) = lower(p.email)
WHERE r.user_id IS DISTINCT FROM u.id
  AND r.user_id IN (
    '5855873a-73c9-4e84-a900-5f96ac5ab582',
    '2158229d-fa08-4308-b7d5-47f28fd13504',
    '419ad2d4-cb9c-4af3-97c5-89d1d2631a5d',
    'f7fca85e-072f-43f5-bd3e-f71d46d8f0bc',
    '0093d7d4-c2e1-429a-9b4f-4bbf94f4d225',
    '5643bffd-70fa-4fbd-b38b-ae49e6daab56'
  )
  AND p.user_id = u.id
  AND r.user_id = CASE lower(p.email)
    WHEN 'admin@teleguardia.com'               THEN '5855873a-73c9-4e84-a900-5f96ac5ab582'::uuid
    WHEN 'santiago.barrientos@teleguardia.com' THEN '2158229d-fa08-4308-b7d5-47f28fd13504'::uuid
    WHEN 'harol.murcia@teleguardia.com'        THEN '419ad2d4-cb9c-4af3-97c5-89d1d2631a5d'::uuid
    WHEN 'ast1@teleguardia.com'                THEN 'f7fca85e-072f-43f5-bd3e-f71d46d8f0bc'::uuid
    WHEN 'luis.perez@teleguardia.com'          THEN '0093d7d4-c2e1-429a-9b4f-4bbf94f4d225'::uuid
    WHEN 'porteria@casavieja.com'              THEN '5643bffd-70fa-4fbd-b38b-ae49e6daab56'::uuid
  END;

-- Asignaciones de operador: igual criterio
UPDATE smartsos.operator_parcels op
SET user_id = u.id
FROM auth.users u
WHERE (op.user_id = '0093d7d4-c2e1-429a-9b4f-4bbf94f4d225' AND lower(u.email) = 'luis.perez@teleguardia.com')
   OR (op.user_id = '5643bffd-70fa-4fbd-b38b-ae49e6daab56' AND lower(u.email) = 'porteria@casavieja.com');
```

## 4. Verificar

```sql
SELECT p.email, r.role, count(op.id) AS parcelaciones
FROM smartsos.profiles p
JOIN auth.users u ON u.id = p.user_id
LEFT JOIN smartsos.user_roles r ON r.user_id = p.user_id
LEFT JOIN smartsos.operator_parcels op ON op.user_id = p.user_id
GROUP BY p.email, r.role
ORDER BY p.email;
```

Debe devolver los 6 usuarios con su rol y, para los dos operadores, sus parcelaciones asignadas.

## 5. Nota sobre `alarms.processed_by` y `gps_devices.created_by`

Son referencias históricas a `auth.users`. Como los UUID cambian, `03_data.sql` puede fallar en esas
columnas si el usuario no existe. Si ocurre, límpialas antes de insertar el histórico:

```sql
-- Opción segura: dejar el histórico sin autor
UPDATE smartsos.alarms       SET processed_by = NULL WHERE processed_by IS NOT NULL;
UPDATE smartsos.gps_devices  SET created_by   = NULL WHERE created_by   IS NOT NULL;
```
