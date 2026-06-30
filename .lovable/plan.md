# Plan: Operadores por parcelación + Notificaciones web

## 1. Asignación de parcelaciones a operadores

### Base de datos
Nueva tabla `operator_parcels` (many-to-many entre operadores y parcelas):
- `user_id` (uuid → auth.users)
- `parcel_id` (uuid → parcels)
- únicos: `(user_id, parcel_id)`
- RLS: admin/director leen y escriben; cada operador lee solo sus filas.
- Función `get_operator_parcels(_user_id uuid)` (SECURITY DEFINER) usada por el frontend y por las políticas RLS de `alarms` para evitar recursión.

### Política RLS de `alarms` (SELECT)
- admin / director_monitoreo / supervisor_central: ven todas.
- operator: solo ven alarmas cuyo `parcel_name` esté en sus parcelaciones asignadas (match por nombre, ya que `alarms.parcel_name` es texto).
- Mantener políticas existentes de UPDATE/INSERT.

### UI Admin (`/admin` → pestaña Usuarios)
- En el diálogo de editar usuario, si el rol es **operator**: nuevo bloque "Parcelaciones asignadas" con multiselect (checkbox list) de todas las parcelas.
- Al guardar, sincronizar `operator_parcels` (borrar + insertar diferencia) vía la edge `update-user` (extender para recibir `parcel_ids: string[]`).
- Al crear operador con `create-user`, también aceptar `parcel_ids`.
- Si el operador no tiene ninguna parcela asignada, mostrar aviso "No verá ninguna alarma hasta asignar al menos una parcelación".

### Frontend Operador (`OperatorDashboard.tsx`)
- Ya no se filtra en cliente (RLS lo hace), pero se añade aviso si la lista está vacía: "No tiene parcelaciones asignadas, contacte al administrador".
- La suscripción realtime sigue igual; Postgres aplicará RLS y solo recibirá inserts permitidos.

## 2. Notificaciones web + sonido en segundo plano

### Comportamiento
- Al cargar el dashboard del operador, pedir permiso de notificaciones (`Notification.requestPermission()`).
- En cada `INSERT` realtime de `alarms`:
  - Mostrar `new Notification("🚨 Nueva alerta: PÁNICO", { body, tag, requireInteraction: true, icon })` — funciona aunque la pestaña esté en segundo plano.
  - Reproducir sirena (`/sounds/police-siren.mp3`) — ya existe; añadir reintento al click del usuario si el navegador bloqueó autoplay.
  - Click en la notificación → enfoca la pestaña (`window.focus()`).
- Se aplica solo a operator / director_monitoreo / supervisor_central.

### Notas técnicas
- Notification API funciona con tab en background, pero **no** con la pestaña cerrada. Si en el futuro se requiere recibir notificaciones con navegador cerrado, sería necesario un Service Worker + Web Push (no incluido aquí; se puede planear aparte si lo pide).
- Sonido en segundo plano: la mayoría de navegadores permiten reproducir audio mientras la pestaña existe (aunque esté minimizada), siempre que haya habido una interacción previa del usuario en la página (login cuenta).

## Archivos a tocar
- **Migración SQL**: crear `operator_parcels` + GRANTs + RLS + función helper + actualizar políticas SELECT de `alarms`.
- `supabase/functions/create-user/index.ts` y `update-user/index.ts`: aceptar `parcel_ids`.
- `src/components/admin/UsersTab.tsx`: cargar parcelas, multiselect, guardar asignaciones.
- `src/pages/OperatorDashboard.tsx`: pedir permiso + disparar `Notification` en realtime + aviso si no hay parcelas.

## Preguntas pendientes (responder antes de implementar si difiere)
1. ¿El match operador↔alarma debe ser por **nombre exacto** de la parcela (texto actual en `alarms.parcel_name`) o quieres que migre a `parcel_id`? Sugiero por nombre exacto, es lo menos invasivo.
2. **director_monitoreo / supervisor_central** siguen viendo TODAS las alarmas (sin filtro), correcto?
