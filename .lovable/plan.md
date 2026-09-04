# El botón físico no genera alarma: Traccar sigue avisando al servidor antiguo

## Qué está pasando (verificado)

- El equipo de Teleguardia ("Sirena patio", IMEI 355468592594287) está **habilitado** para botón físico y está correctamente asociado a la parcelación **Teleguardia**. La configuración en la base de datos está bien.
- Sin embargo, **el aviso del botón nunca llega**: en los últimos 30 días no existe ni una sola llamada al receptor de eventos (`traccar-webhook`) en el proyecto nuevo. Lo único que se ejecuta es el proceso que apaga sirenas, cada minuto.
- Las alarmas más recientes son todas enviadas desde la app por personas; ninguna proviene del botón físico.

Conclusión: al mudar la plataforma al nuevo servidor (Halcón), el servidor de GPS (Traccar) siguió enviando los avisos a la dirección **antigua**, que ya no existe. Por eso "en Traccar sí aparece el aviso" pero aquí no llega nada.

## Qué hay que hacer

1. **Actualizar la dirección de aviso en el servidor de GPS** (`gps.smarturban.co`, archivo de configuración de Traccar):
   - Dirección nueva: `https://junctwbyjtjhwjjioytc.supabase.co/functions/v1/traccar-webhook?token=<TRACCAR_WEBHOOK_TOKEN>`
   - Debe quedar activado el reenvío de eventos y reiniciar el servicio de Traccar.
   - El valor del token es el mismo secreto `TRACCAR_WEBHOOK_TOKEN` que ya está guardado en la plataforma. Yo no puedo leerlo ni entrar a tu servidor de GPS: ese cambio lo tienes que aplicar tú (o pasarme el acceso).
2. **Prueba real**: presionar el botón físico del equipo de Teleguardia y verificar en los registros que la llamada llega y que se crea la alarma únicamente en Teleguardia.
3. **Si tras el cambio la llamada llega pero es rechazada**, revisar en los registros el motivo exacto (token inválido, tipo de evento no reconocido, equipo no registrado) y corregir sobre ese dato concreto. Sólo en ese caso tocaría código.
4. **Documentar** en `docs/` y `roadmap.md` la dirección nueva de avisos de Traccar, para que no se pierda en futuras mudanzas.

## Detalle técnico

- `function_edge_logs` no registra ninguna invocación de `/functions/v1/traccar-webhook` en 30 días (proyecto `junctwbyjtjhwjjioytc`); un token inválido sí generaría un 401 registrado, por lo que el problema es anterior: Traccar no llama a esta URL.
- `smartsos.gps_devices`: `panic_button_enabled = true` para IMEI 355468592594287 y 355468593809965; `false` para los otros dos.
- `smartsos.gps_device_parcels` mapea 355468592594287 → Teleguardia (aislamiento correcto, una sola parcelación).
- Secretos presentes en el proyecto nuevo: `TRACCAR_WEBHOOK_TOKEN`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD`, `DB_SCHEMA=smartsos`.
- No se prevén cambios de código en `traccar-webhook` salvo que la prueba revele un rechazo por clasificación del evento.
