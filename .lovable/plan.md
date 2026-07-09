## Diagnóstico

El botón sí está llamando a `send-gps-command` y el backend responde `success: true`, pero el flujo del botón ahora envía también eventos/registro con `alarm_type: "test"`. El registro en `alarms` está fallando por la restricción de tipos de alarma, y lo más importante: la prueba manual que sonó fue una llamada directa controlada al backend, mientras que el botón usa el flujo de parcela y no fuerza una ejecución exclusiva para el IMEI seleccionado.

## Plan

1. **Frontend: hacer que el botón use el modo directo comprobado**
   - En `TestSirenDialog.tsx`, cambiar la activación para enviar al backend:
     - `action: "engineStop"`
     - `imei: siren.imei`
     - `mode: "test"`
   - Esto usará exactamente la rama de prueba directa que ya tiene cancelación de apagados pendientes y programación automática de `engineResume`.

2. **Evitar que tareas no críticas interfieran con la sirena**
   - Ejecutar primero GPS/relé.
   - Solo después, y sin bloquear el resultado de la sirena, intentar WhatsApp/SIA si corresponde.
   - No mostrar “Sirena activada” por WhatsApp/SIA ni por inserciones en historial; solo por confirmación del comando GPS.

3. **Corregir el error de historial de pruebas**
   - Dejar de insertar `alarm_type: "test"` en `alarms`, porque la base de datos no lo permite.
   - Omitir ese insert para pruebas de sirena o registrarlo como observación en un tipo permitido si ya existe un patrón del proyecto. Para minimizar riesgo, lo omitiré.

4. **Backend: mantener y reforzar el modo directo de prueba**
   - Mantener la rama `action + imei + mode: "test"` en `send-gps-command`.
   - Asegurar que, al activar prueba, cancele apagados pendientes, envíe `engineStop`, actualice `relay_active_until` y programe `engineResume`.
   - Retornar un error claro si ningún intento válido fue aceptado.

5. **Validación**
   - Desplegar la función `send-gps-command` si cambia.
   - Probar una llamada directa con el IMEI `355468593809965` igual que lo hará el botón.
   - Confirmar en logs que sale `[GPS-TEST] request` y que se envía `engineStop` para ese IMEI.