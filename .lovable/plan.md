# Activar las 6 sirenas de Casa Vieja (hoy solo suena una)

## Qué encontré

Casa Vieja tiene 6 equipos registrados: Portería, Casa Vieja 1, 2, 3, 4 y 5.
Los seis están **en línea** en el servidor GPS ahora mismo (reportaron hace menos de 3 minutos), ninguno está deshabilitado. Así que no es un equipo dañado.

Lo que sí se ve en el historial de hoy:

- Alarma de pánico en Casa Vieja a las 22:11 → solo quedó registro de encendido/apagado de **un** equipo (Casa Vieja 2), y ese registro se creó **56 segundos después** de la alarma.
- Alarma de pánico en Casa Vieja a las 22:14 → **ningún** equipo quedó registrado.
- El 15 de septiembre, en cambio, sí aparecieron los 6 equipos.

Causa: por cada equipo el sistema hace 8 intentos de comando distintos, uno detrás del otro, y varios de esos intentos siempre fallan (por ejemplo el envío por SMS, que el servidor rechaza porque no tiene SMS configurado). Con 6 equipos son 48 llamadas en fila; el proceso se queda sin tiempo y se corta antes de alcanzar a los demás equipos. Teleguardia funciona bien porque tiene un solo equipo.

## Qué voy a cambiar

1. Enviar solo los comandos que el servidor acepta (el comando nativo y la orden de relé por datos), y quitar los intentos que siempre fallan (SMS y el comando no soportado por el protocolo del equipo). De 8 intentos por equipo pasamos a 2.
2. Atender los equipos de una parcelación **en paralelo** en lugar de uno tras otro, para que 6 equipos tarden casi lo mismo que uno.
3. Registrar el encendido de cada sirena como una tarea en la cola: si un equipo no alcanza a recibir la orden, el proceso que corre cada 20 segundos lo reintenta en vez de quedarse sin sonar.
4. Aplicar los mismos cambios al proceso de apagado automático, para que las 6 sirenas también se apaguen a tiempo.
5. Dejar visible en el registro de cada alarma cuántos equipos recibieron la orden y cuáles fallaron, para poder detectar a futuro un equipo puntual con problemas.

## Cómo lo verifico

- Revisar en el historial que una alarma de Casa Vieja genere tareas para los 6 equipos y que el tiempo entre la alarma y el último equipo sea de pocos segundos.
- Confirmar que las sirenas se apagan solas al terminar la duración configurada (30 segundos).
- Confirmar que Teleguardia y Santa Paula siguen funcionando igual.

## Detalles técnicos

- `supabase/functions/send-gps-command/index.ts`: reducir `sendDeviceCommand` a los intentos con respuesta 200 (`native` + `custom` GPRS con `RELAY,1#`/`RELAY,0#`), eliminar `textChannel: true` y `type: "command"`; convertir el bucle `for (const device of targetDevices)` en `Promise.allSettled`; encolar el `engineStop` en `gps_relay_jobs` (nueva acción con `execute_at = now()`) además de intentarlo en línea, con idempotencia por `imei` + `alarm_id`.
- `supabase/functions/process-relay-jobs/index.ts`: mismos recortes de intentos, procesar los jobs del lote en paralelo y soportar jobs `engineStop` (respetando `relay_active_until` para no reactivar tras el apagado).
- Sin cambios de esquema salvo, si hace falta, un índice/constraint para la idempotencia de jobs.
