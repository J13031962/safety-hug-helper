# Recrear los usuarios en Auth del proyecto destino

Auth **no se migra por SQL**: hay que crear cada usuario de nuevo (con contraseña nueva) y luego
recrear sus perfiles, roles y asignaciones de parcelación. Todo se resuelve **por email**, así que
no hay que copiar UUIDs a mano.

## 1. Usuarios actuales

| Email | Nombre | Rol | Parcelaciones asignadas |
|---|---|---|---|
| admin@teleguardia.com | Administrador Principal | admin | — (ve todo) |
| santiago.barrientos@teleguardia.com | Santiago Barrientos | director_monitoreo | — (ve todo) |
| harol.murcia@teleguardia.com | Harol Murcia | director_monitoreo | — (ve todo) |
| ast1@teleguardia.com | FEDERMAN CHAVERRA | director_monitoreo | — (ve todo) |
| luis.perez@teleguardia.com | luis perez | operator | Casa Vieja |
| porteria@casavieja.com | Portería Casa Vieja | operator | Casa Vieja |

## 2. Crear los usuarios

Dashboard del proyecto destino → **Authentication → Users → Add user**, con *Auto Confirm User*
activado y una contraseña temporal por usuario. Crea los 6 emails de la tabla.

No habilites registro público: los usuarios se crean desde `/admin` con la función `create-user`.

## 3. Cargar perfiles, roles y asignaciones

Ejecuta este bloque en el SQL Editor **después** de crear los 6 usuarios y de ejecutar `03_data.sql`
(necesita que existan las parcelaciones):

```sql
BEGIN;

-- Perfiles (el trigger handle_new_user ya pudo crearlos; esto completa nombre y email)
INSERT INTO smartsos.profiles (user_id, email, full_name)
SELECT u.id, u.email, v.full_name
FROM (VALUES
  ('admin@teleguardia.com',               'Administrador Principal'),
  ('santiago.barrientos@teleguardia.com', 'Santiago Barrientos'),
  ('harol.murcia@teleguardia.com',        'Harol Murcia'),
  ('ast1@teleguardia.com',                'FEDERMAN CHAVERRA'),
  ('luis.perez@teleguardia.com',          'luis perez'),
  ('porteria@casavieja.com',              'Portería Casa Vieja')
) AS v(email, full_name)
JOIN auth.users u ON lower(u.email) = v.email
ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

-- Roles
INSERT INTO smartsos.user_roles (user_id, role)
SELECT u.id, v.role::smartsos.app_role
FROM (VALUES
  ('admin@teleguardia.com',               'admin'),
  ('santiago.barrientos@teleguardia.com', 'director_monitoreo'),
  ('harol.murcia@teleguardia.com',        'director_monitoreo'),
  ('ast1@teleguardia.com',                'director_monitoreo'),
  ('luis.perez@teleguardia.com',          'operator'),
  ('porteria@casavieja.com',              'operator')
) AS v(email, role)
JOIN auth.users u ON lower(u.email) = v.email
ON CONFLICT (user_id, role) DO NOTHING;

-- Asignaciones de parcelación para operadores
INSERT INTO smartsos.operator_parcels (user_id, parcel_id)
SELECT u.id, p.id
FROM (VALUES
  ('luis.perez@teleguardia.com', 'Casa Vieja'),
  ('porteria@casavieja.com',     'Casa Vieja')
) AS v(email, parcel)
JOIN auth.users u ON lower(u.email) = v.email
JOIN smartsos.parcels p ON p.name = v.parcel
ON CONFLICT (user_id, parcel_id) DO NOTHING;

COMMIT;
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

Debe devolver los 6 usuarios con su rol, y `1` parcelación para los dos operadores.

## 5. Nota

`alarms.processed_by` y `gps_devices.created_by` se migran en `NULL` a propósito: eran referencias a
UUIDs de Auth que ya no existen. No afecta ninguna funcionalidad, solo el "quién atendió" histórico.
