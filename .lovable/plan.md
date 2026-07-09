## Contexto

- La alarma real SÍ activa la sirena de IMEI `355468593809965` ("Porteria Casa Vieja" / parcela "Casa Vieja").
- El botón "Prueba de Sirenas" muestra el toast "Sirena activada…" pero la sirena física no suena.
- Revisé los logs recientes de `send-gps-command`: las pruebas registradas van a otro dispositivo (Teleguardia, IMEI `...94287`, Traccar id=2). No hay actividad de test para el IMEI `...09965`. Sospechoso: o el request no llega al backend, o llega y falla antes de contactar a Traccar, o un job de `engineResume` viejo apaga el relé casi inmediato.

## Cambios

### 1. Frontend — `src/components/TestSirenDialog.tsx`

- Capturar `data` y `error` reales del `supabase.functions.invoke("send-gps-command", …)` y:
  - Si `error` → mostrar toast rojo con el mensaje.
  - Si `data?.success === false` → mostrar toast rojo con `data.reason ?? data.error` y NO marcar como éxito.
  - Solo mostrar "Sirena activada" cuando `data?.success === true`.
- Añadir `console.info("[TestSiren] response", data, error)` para diagnóstico visible en el móvil vía USB debugging.
- Log del IMEI exacto que se está enviando al invocar.

### 2. Edge function — `supabase/functions/send-gps-command/index.ts` (rama test)

Actualmente la rama `if (action && imei)` no:
- cancela `engineResume` pendientes,
- ni loguea con prefijo consistente.

Cambios en esa rama:

- Log `[GPS-TEST] request: imei=<>, action=<>, mode=<>`.
- Después de `findDeviceId`: log `[GPS-TEST] traccar deviceId=<> for IMEI=<>` (o warning si no se encuentra).
- Log `[GPS-TEST] engineStop success=<> (attempts=…)` con detalle.
- Antes de programar el nuevo job de auto-off, **cancelar todos los `engineResume` pendientes/en proceso del mismo IMEI** (mismo patrón que la rama de alarma real). Esto previene la carrera donde un job viejo dispara `engineResume` (RELAY,0#) segundos después del test y apaga la sirena antes de tiempo — hipótesis principal del "no suena" cuando el toast dice éxito.
- En la respuesta JSON del edge function incluir `success`, `deviceId`, `attempts` y `duration` para que el cliente pueda leerlos.

### 3. Diagnóstico

Con estos cambios, pedirle al usuario reproducir la prueba una vez y luego:
- Compartir screenshot de consola móvil o los logs recientes de `send-gps-command`.
- Ahí veremos si Traccar rechaza el comando para ese IMEI en test, o si el request ni siquiera llega.

## Archivos tocados

- `src/components/TestSirenDialog.tsx`
- `supabase/functions/send-gps-command/index.ts`

## Sin tocar

- DB / migraciones
- `process-relay-jobs`
- Flujo de alarma real
- WhatsApp / SIA
