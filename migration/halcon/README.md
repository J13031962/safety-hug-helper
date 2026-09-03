# Migración de SmartSOS a tu propio proyecto Supabase

Proyecto destino: `https://junctwbyjtjhwjjioytc.supabase.co` (ref `junctwbyjtjhwjjioytc`)
Schema de aislamiento: **`smartsos`** (no se renombra ninguna tabla; quedan como `smartsos.alarms`, etc.)

## Orden obligatorio

```text
1. Aplicar 01_schema.sql en el proyecto destino           <- sin riesgo
2. Aplicar 03_data.sql                                    <- sin riesgo
3. Crear usuarios en Auth + SQL de 04_auth_users.md       <- sin riesgo
4. Exponer el schema `smartsos` en la Data API            <- sin riesgo
5. Aplicar 02_cron.sql (realtime + cron de sirenas)       <- sin riesgo
6. Desconectar Lovable Cloud (IRREVERSIBLE: borra la BD actual)
7. Conectar el conector Supabase eligiendo este proyecto
8. Desplegar las 9 Edge Functions + recrear secretos
9. Reapuntar Traccar y la app móvil BLE a la nueva URL
10. Verificar con el checklist final
```

Los pasos 1–5 no tocan nada del sistema en producción: puedes hacerlos hoy y dejar el corte
(paso 6) para una ventana tranquila.

## Paso a paso

### 1–2. Schema y datos

En el dashboard del proyecto destino → **SQL Editor**:

1. Pega y ejecuta `01_schema.sql` completo.
2. Pega y ejecuta `03_data.sql` completo.

> Si `01_schema.sql` falla en el trigger `on_auth_user_created_smartsos` (schema `auth`), ejecuta el
> resto y crea ese trigger aparte; sin él simplemente no se autocrea el perfil al registrar usuarios
> (las funciones `create-user`/`update-user` ya insertan el perfil por su cuenta).

Contenido migrado: 3 parcelaciones, 21 números registrados, 4 dispositivos GPS y sus 4 asignaciones
de parcelación, 1 dispositivo BLE, 226 alarmas históricas y 1 evento BLE.

### 3. Usuarios

Sigue `04_auth_users.md`: crear los 6 usuarios en Auth y ejecutar el bloque SQL que carga
perfiles, roles y asignaciones de parcelación por email.

### 4. Exponer el schema en la Data API

Dashboard → **Project Settings → API → Exposed schemas**: añade `smartsos` a la lista
(deja `public` como está para no afectar al otro proyecto que ya vive ahí).
Sin este paso el frontend recibe `PGRST106 / schema must be one of the following`.

### 5. Realtime y cron

Ejecuta `02_cron.sql` reemplazando antes:

- `<PROJECT_REF>` → `junctwbyjtjhwjjioytc`
- `<SERVICE_ROLE_KEY>` → la service role key del proyecto destino (Project Settings → API)

Esto habilita las alarmas en tiempo real para el panel de operador y el apagado automático de sirenas.

### 6. Desconectar Lovable Cloud

En Lovable: **Cloud → Advanced → Disconnect**.
Es irreversible y borra la base de datos, Auth, storage y funciones actuales del Cloud.
Hazlo solo cuando los pasos 1–5 estén verificados.

### 7. Conectar el conector Supabase

En Lovable, tras desconectar Cloud, aparece la opción de conectar un proyecto Supabase externo
(Project Settings → Integrations → Supabase). Autoriza por OAuth y elige el proyecto
`junctwbyjtjhwjjioytc`. **No hace falta la contraseña de la base de datos**: Lovable obtiene las
claves por OAuth.

### 8. Secretos de las Edge Functions

Hay que volver a crearlos en el proyecto destino (Edge Functions → Secrets):

| Secreto | Para qué |
|---|---|
| `TRACCAR_EMAIL` | Login en Traccar (sirenas/relés) |
| `TRACCAR_PASSWORD` | Login en Traccar |
| `TRACCAR_WEBHOOK_TOKEN` | Autenticación del webhook de Traccar (botón físico GPS) |
| `TEXTMEBOT_API_KEY` | Envío de WhatsApp |
| `WHATSAPP_GROUP_ID` | Grupo por defecto de WhatsApp |
| `GPS_API_TOKEN` | Comandos GPS |
| `BLE_GATEWAY_TOKEN` | Token global del endpoint BLE |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta la plataforma.

### 9. Desplegar funciones y reapuntar integraciones

Las 9 funciones a desplegar: `ble-button-event`, `traccar-webhook`, `send-whatsapp`,
`send-sia-event`, `send-gps-command`, `process-relay-jobs`, `create-user`, `update-user`,
`delete-user`.

Reapuntar:

- Traccar (`traccar.xml` → `event.forward.url`) a
  `https://junctwbyjtjhwjjioytc.supabase.co/functions/v1/traccar-webhook`
- App móvil SmartSOS Mobile (`VITE_SMARTSOS_BACKEND_URL`) a
  `https://junctwbyjtjhwjjioytc.supabase.co`

### 10. Cambios de código (Fase 2, se aplican tras el paso 7)

- Cliente Supabase: añadir `db: { schema: 'smartsos' }` en `createClient`, de modo que **todos** los
  `.from('alarms')`, `.from('parcels')`, etc. de las 13 pantallas/hooks sigan igual sin reescribirse.
- Edge Functions: en cada `createClient(...)` del servidor añadir la misma opción
  `{ db: { schema: 'smartsos' } }`.
- Funciones de BD invocadas por RPC/RLS ya viven en `smartsos` (`has_role`, `operator_parcel_names`).
- Sin cambios funcionales: los 5 botones, los códigos SIA (`PA`, `MA`, `FA`, `BA`, `HA001`, prueba
  `TA001`), la lógica invertida de Traccar (`engineStop` activa, `engineResume` apaga) y el flujo de
  WhatsApp quedan idénticos.

## Checklist de verificación final

- [ ] Login por teléfono (PhoneGate) con un número de `registered_numbers`
- [ ] Login de admin y de operador; el operador solo ve alarmas de sus parcelaciones
- [ ] Los 5 botones crean alarma: pánico, médica, incendio, desastre, violencia intrafamiliar
- [ ] WhatsApp llega al grupo de la parcelación correcta
- [ ] SIA llega a la CRA (`PA/MA/FA/BA/HA001`) y la prueba con `TA001`
- [ ] Sirena se activa y se apaga automáticamente (cron `smartsos-process-relay-jobs`)
- [ ] Botón físico GPS por webhook de Traccar, con aislamiento por parcelación
- [ ] Evento BLE en `/functions/v1/ble-button-event` con `x-ble-token`
- [ ] Notificación + sonido en el panel de operador (realtime)

## Riesgos conocidos

- El paso 6 es irreversible: sin los pasos 1–5 verificados se pierden los datos.
- Las contraseñas de los 6 usuarios cambian (Auth no se migra).
- El proyecto destino comparte CPU, memoria y conexiones con lo que ya tienes ahí.
- El consumo de créditos **Run** de Lovable no baja por esta migración: corresponde a la
  infraestructura de Lovable, no a la base de datos.
