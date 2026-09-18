# Envío simultáneo y diagnóstico de CASA VIEJA 2 y 3

## Diagnóstico verificado, sin activar las sirenas

Los dos GPS están en línea y reportando ubicación. El problema no es falta de conexión general.

### CASA VIEJA 2

- El 14 de septiembre confirmó correctamente un encendido (`Cut off the fuel supply: Success!`) y un apagado (`Restore fuel supply: Success!`).
- Desde que se reconectó el 17 de septiembre, el servidor muestra órdenes despachadas, pero el GPS no vuelve a emitir ninguna confirmación de ejecución.
- Esto coincide con lo observado en sitio: la salida negativa permanece energizada aunque el relé temporizado corte la sirena.

**Conclusión:** el servidor acepta y entrega la orden, pero el GPS ya no confirma ni cambia correctamente su salida. Lo más probable es que su estado interno haya quedado bloqueado o que la etapa física de salida esté dañada. Un HTTP 200 de Traccar no demuestra que el relé físico cambió.

### CASA VIEJA 3

- El GPS responde que está en estado normal/restaurado (`Already in the state of fuel supply to resume`).
- Al intentar encenderlo, devuelve `ERROR:103`.
- Ese código no está definido en el protocolo público GT06; viene del firmware/plataforma del fabricante. Confirma un rechazo del GPS, no un problema de conectividad.

**Conclusión:** CASA VIEJA 3 recibe la orden, pero rechaza el encendido. Las causas más probables son estado interno inconsistente, protección/configuración del firmware o falla de la salida. Para conocer el significado exacto de 103 hace falta la tabla del fabricante Protrack/VT08F.

### Revisión segura urgente en sitio

Sin volver a activar las salidas:

1. Desconectar la sirena y medir continuidad/voltaje de la salida de CASA VIEJA 2 con el GPS apagado y encendido.
2. Reiniciar eléctricamente el GPS 2 y consultar su estado antes de conectar la sirena. Si vuelve a energizar inmediatamente, la salida o el firmware está bloqueado.
3. En CASA VIEJA 3, comprobar contacto/ignición apagado, velocidad cero, conexión NC/NO y fusible. Luego consultar estado; no repetir encendidos hasta identificar `ERROR:103` con el proveedor.
4. Mantener el relé temporizado como protección independiente; el software no debe asumir que una respuesta HTTP 200 significa activación física.

## Cambios en SmartSOS

### 1. Activación realmente simultánea

- Enviar el comando a todos los GPS de la parcelación en paralelo, nunca uno detrás de otro.
- Un GPS lento o defectuoso no bloqueará los demás: cada equipo tendrá resultado y tiempo límite independientes.
- Quitar intentos inútiles que hoy alargan el proceso: SMS (no configurado), `type: command` (no soportado) y variantes duplicadas.
- Conservar únicamente el comando nativo y una orden GPRS compatible.

### 2. La alerta nunca esperará a las sirenas

- Después de guardar la alarma, WhatsApp, CRA y activación GPS se iniciarán en paralelo.
- La pantalla finalizará aunque un GPS falle o no confirme.
- La alarma a operadores/CRA conservará prioridad; una sirena física nunca podrá impedirla.
- El botón de prueba mantendrá resultado individual porque prueba un solo equipo, pero tendrá un límite corto y mostrará “sin confirmación” en vez de cargar indefinidamente.

### 3. Confirmación real y reintentos controlados

- Registrar por cada GPS: orden creada, aceptada por Traccar, confirmada por el equipo, rechazada, sin confirmación o apagada.
- No marcar “activado” solamente porque Traccar respondió 200.
- Procesar en paralelo los encendidos y apagados pendientes.
- Reintentar una cantidad limitada cuando no haya entrega; no reintentar automáticamente un rechazo explícito como `ERROR:103`.
- Mantener `relay_active_until` separado por equipo para que cada sirena se apague a los 30 segundos sin afectar a las demás.

### 4. Nueva sección “Estado de sirenas” para administradores y directores

Visible para cuentas como `santiago.barrientos@teleguardia.com` y todos los roles administrador/director:

- Parcelación, nombre, IMEI, última orden, hora y estado.
- Estados claros: Confirmada, Aceptada sin confirmación, Rechazada, Sin conexión y Pendiente.
- Motivo conocido, incluyendo `ERROR:103` o ausencia de respuesta.
- Historial de incidentes por GPS y filtro para mostrar solo equipos con problemas.
- CASA VIEJA 2 y CASA VIEJA 3 aparecerán inicialmente como “requiere revisión”, con el diagnóstico anterior.

## Verificación

- Una alarma de Casa Vieja crea seis envíos al mismo tiempo; una falla no cancela ni demora los otros cinco.
- La pantalla termina rápidamente y WhatsApp/CRA reciben la alarma aunque fallen todos los GPS.
- Cada equipo genera su propio resultado y apagado programado.
- Los dos equipos problemáticos quedan visibles en “Estado de sirenas” sin activarlos durante la implementación.
- Teleguardia y Santa Paula mantienen su funcionamiento actual.

## Detalles técnicos

- `send-gps-command`: `Promise.allSettled` por dispositivo, timeout individual, comandos mínimos y resultados persistidos.
- `ConfirmDialog`: ejecutar WhatsApp, GPS y SIA con `Promise.allSettled`, sin dependencia entre canales.
- `traccar-webhook`: además de ignorar `commandResult` como alarma, usarlo para actualizar la confirmación/rechazo de la orden correspondiente.
- `process-relay-jobs`: lotes paralelos, reintentos limitados e idempotencia; encendido y apagado por equipo.
- Nueva tabla `smartsos.gps_command_events` con permisos para usuarios autenticados, RLS restringida a admin/director y acceso total de service role.
- Nueva vista administrativa `Estado de sirenas`, reutilizando el control de acceso actual de `/admin`.
