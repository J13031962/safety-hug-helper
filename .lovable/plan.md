# Botón físico: el webhook ya recibe eventos; falta verificar alerta completa y WhatsApp

## Qué encontré ahora (logs actualizados)

El receptor `traccar-webhook` **sí está recibiendo llamadas** y procesando el botón físico del equipo Teleguardia (IMEI 355468592594287). Los registros más recientes muestran:

- Evento `alarm` con `alarm=sos` → clasificado como pánico.
- También evento `ignitionOn` con `position.attributes.alarm=sos` → clasificado como pánico.
- Se insertaron alarmas en `smartsos.alarms` para la parcelación **Teleguardia**.
- `send-gps-command` respondió éxito: la sirena se activó vía `engineStop` + comando GPRS `RELAY,1#`.
- `send-sia-event` respondió éxito: mensaje `"SIA-DCS"0001L0#9999[#9999|PA004]_` enviado a la CRA.
- `send-whatsapp` **falló**: `Error: Phone number is disconnected from the API (DB)`.

Conclusión: el botón físico **sí dispara** la alarma, la sirena y SIA. Lo que no llega es el mensaje de WhatsApp porque la sesión de TextMeBot está desconectada.

## Qué hay que hacer

1. **Verificar que la alarma se ve en el panel de operador** (`/operador`). Si no aparece, revisar:
   - Filtro de parcelación del operador logueado.
   - Suscripción de realtime a `smartsos.alarms`.
2. **Reconectar WhatsApp**:
   - El error indica que el número emisor (`+573332789188`) se desconectó de TextMeBot. Hay que volver a vincularlo mediante el QR que ofrece TextMeBot.
   - Una vez reconectado, volver a probar el botón físico.
3. **Revisar duplicados**: en los logs se crearon dos alarmas separadas por el mismo botón con solo segundos de diferencia. Esto puede pasar porque la deduplicación de 30 s está en memoria y las Edge Functions son stateless. Si es un problema frecuente, mover la deduplicación a la base de datos (tabla `ble_events` ya lo hace; `traccar-webhook` aún usa Map en memoria).
4. **Documentar** en `roadmap.md` que Traccar ya apunta al proyecto Halcón.

## No se requieren cambios de código por ahora

La ruta del botón físico está funcionando: Traccar → webhook → alarma → sirena + SIA. Solo falta restablecer WhatsApp y confirmar la visualización en el panel.
