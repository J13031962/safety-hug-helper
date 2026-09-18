# Casa Vieja: por qué CASA VIEJA 2 no suena y por qué el botón se queda cargando

## Lo que verifiqué (sin activar nada)

**CASA VIEJA 2 (IMEI 355468594693400):**
- Está **en línea** en el servidor GPS, reportando ahora mismo, y no está deshabilitado.
- El servidor lo reconoce con las órdenes de sirena disponibles (`engineStop`, `engineResume`, `custom`).
- Su **cola de comandos está vacía**: no hay órdenes atascadas esperando entrega. Es decir, el servidor aceptó y entregó las órdenes que le enviamos.
- En el historial de hoy, la orden de encendido y la de apagado para ese equipo quedaron registradas como **completadas** a las 22:12–22:13.

Conclusión: del lado del software y del servidor GPS la orden sale bien y el equipo la recibe. Que la sirena no suene apunta al **equipo mismo**: la salida de relé de esa unidad o su cableado a la sirena (relé no conectado/quemado, cable suelto, o alimentación de la sirena). Es lo único que explica que las otras 5 sí suenen con la misma orden.

Recomendación: revisar en sitio el relé y el cableado de la sirena de CASA VIEJA 2, o probar ese mismo equipo con otra sirena conocida.

**El botón que se queda cargando** sí es un problema nuestro, y es independiente:
por cada equipo el sistema hace 8 intentos de comando en fila, y varios siempre fallan (envío por SMS, que el servidor rechaza por no tener SMS configurado). Con 6 equipos son 48 llamadas seguidas: hoy un solo equipo tardó **56 segundos**. La app queda esperando y el proceso se corta antes de alcanzar a los demás equipos. Por eso la alarma de las 22:14 no dejó registro de ningún equipo. Teleguardia no lo nota porque tiene un solo equipo.

## Qué voy a cambiar

1. Enviar solo las órdenes que el servidor acepta (la orden nativa y la orden de relé por datos) y quitar los intentos que siempre fallan. De 8 intentos por equipo a 2.
2. Atender los equipos de una parcelación **en paralelo**, para que 6 equipos tarden casi lo mismo que uno.
3. Responder a la app de inmediato y terminar el envío en segundo plano, para que el botón nunca quede cargando.
4. Encolar el encendido de cada sirena: si un equipo no alcanza a recibir la orden, el proceso que corre cada 20 segundos lo reintenta.
5. Aplicar los mismos recortes al apagado automático, para que las 6 se apaguen a tiempo.
6. Registrar por alarma cuántos equipos recibieron la orden y cuáles no, para detectar rápido un equipo con falla física como el de ahora.

## Cómo lo verifico

- Una alarma de Casa Vieja debe generar órdenes para los 6 equipos en pocos segundos, y el botón debe dejar de cargar de inmediato.
- Las sirenas deben apagarse solas al cumplirse los 30 segundos configurados.
- Teleguardia y Santa Paula deben seguir igual.

## Detalles técnicos

- `supabase/functions/send-gps-command/index.ts`: recortar `sendDeviceCommand` a los intentos con respuesta 200 (`native` + `custom` GPRS `RELAY,1#`/`RELAY,0#`), eliminar `textChannel: true` y `type: "command"`; reemplazar el bucle sobre `targetDevices` por `Promise.allSettled`; devolver la respuesta HTTP temprano y continuar el trabajo con `EdgeRuntime.waitUntil`; encolar también el `engineStop` en `gps_relay_jobs` con `execute_at = now()` e idempotencia por `imei` + `alarm_id`.
- `supabase/functions/process-relay-jobs/index.ts`: mismos recortes, lote procesado en paralelo y soporte de jobs `engineStop` respetando `relay_active_until`.
- Sin cambios de esquema, salvo un índice para la idempotencia de jobs si hace falta.
