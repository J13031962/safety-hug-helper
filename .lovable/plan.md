## Diagnóstico

La prueba sí llegó al backend para el IMEI `355468593809965` y encontró el equipo en Traccar como `deviceId=4`, pero el modo de prueba está usando una rama directa (`action + imei`) distinta al flujo de alarma real. Como las alarmas reales sí suenan, la corrección más segura es hacer que “Prueba de Sirenas” reutilice el mismo flujo por parcela que usan los botones de pánico/alarma, en vez de una ruta GPS especial.

## Plan de implementación

1. **Cambiar la activación de prueba en `TestSirenDialog.tsx`**
   - Enviar a `send-gps-command` el `alarm_type: "test"` y `parcel_name` de la sirena, igual que una alarma real.
   - Mantener `imei` como dato de diagnóstico opcional, pero no depender de la rama directa `action + imei` para activar el relé.
   - Solo mostrar “Sirena activada” si el backend confirma que al menos un dispositivo respondió correctamente.

2. **Ajustar `send-gps-command/index.ts`**
   - Para `alarm_type: "test"`, resolver dispositivos por `parcel_name`, igual que pánico/médica/fuego/desastre.
   - Evitar que el modo test entre primero por la rama directa `action + imei` cuando se necesita el comportamiento real de relé.
   - Registrar en logs algo claro como `[GPS] test parcel=Casa Vieja imei=...` y los intentos de comando.

3. **Mantener el apagado automático**
   - Conservar la creación del trabajo `engineResume` para apagar la sirena después de `relay_duration`.
   - Mantener la cancelación de trabajos antiguos para evitar que una orden vieja apague la sirena inmediatamente.

4. **No tocar otros flujos**
   - No cambiar WhatsApp, SIA ni las alarmas reales.
   - No cambiar base de datos ni permisos.

5. **Verificación**
   - Desplegar la función backend modificada.
   - Revisar logs de `send-gps-command` para confirmar que la prueba de Casa Vieja ejecuta el mismo bloque que una alarma real y apunta al IMEI `355468593809965`.
   - Validar que la respuesta indique éxito solo si el relé recibió comando aceptado.