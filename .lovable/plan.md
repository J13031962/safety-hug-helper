# Activar SmartSOS sobre el schema `smartsos` en Halcón

## Diagnóstico (verificado en la base de datos)

- El schema `smartsos` ya existe en Halcón con sus **11 tablas** y datos cargados: 3 parcelaciones, 21 números registrados, 6 perfiles, 5 roles.
- La app sigue leyendo el schema **`public`**, donde `registered_numbers`, `parcels` y `alarms` **no existen** en Halcón. Por eso falla el ingreso por número de celular (PhoneGate) y la pantalla de login no encuentra roles.
- Falta un usuario de Auth: el script esperaba `harol.murcia@teleguardia.com`, pero en Halcón el correo real es **`harold.murcia@teleguardia.com`** (con "d"). Por eso hay 5 roles en lugar de 6.

## Qué se hará

1. **Apuntar el frontend al schema correcto**: definir `VITE_DB_SCHEMA="smartsos"` en `.env`. El código ya está preparado (`src/integrations/supabase/db.ts`), no hay que tocar pantallas.
2. **Apuntar las Edge Functions**: crear el secreto `DB_SCHEMA=smartsos` y redesplegar las 9 funciones (`ble-button-event`, `traccar-webhook`, `send-whatsapp`, `send-sia-event`, `send-gps-command`, `process-relay-jobs`, `create-user`, `update-user`, `delete-user`).
3. **Completar el rol faltante**: insertar en `smartsos.user_roles` el rol `director_monitoreo` para `harold.murcia@teleguardia.com` (y su perfil si falta), sin tocar nada de Halcón en `public`.
4. **Verificar**: revisar que el schema `smartsos` esté expuesto en el Data API y comprobar en el navegador que (a) el ingreso por número de celular reconoce los 21 números y (b) el login por correo entra a `/admin` u `/operador` según el rol.

## Notas técnicas

- Las contraseñas de Auth no se migran: cada usuario entra con la contraseña temporal creada en Halcón (o "restablecer contraseña").
- Los roles de SmartSOS viven en `smartsos.user_roles`, totalmente separados de `public.user_roles` de Halcón; los permisos actuales de Halcón no cambian.
- Si tras el cambio aparecen errores de permisos de PostgREST, se corrigen con los `GRANT` que indique el `HINT`, siempre limitados al schema `smartsos`.
