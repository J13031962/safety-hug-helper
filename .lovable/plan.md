
Objetivo: corregir que algunas alarmas no activen el relay GPS aunque el WhatsApp sí salga bien.

Diagnóstico confirmado en el código y backend:
1. `send-gps-command` filtra dispositivos por `parcel_name` con `.eq(...)` (comparación sensible a mayúsculas/minúsculas).
2. En base de datos, el dispositivo está en `Teleguardia`, pero hay alarmas recientes llegando como `teleguardia`; eso deja `targetDevices = 0` y no se envía `engineStop`.
3. La función está hardcodeada a `http://192.99.16.163:8082/api`; ahora tu plataforma está en `gps.smarturban.co`, conviene parametrizar/actualizar para evitar inconsistencias.
4. En `ConfirmDialog`, si GPS responde `success: false` (sin dispositivos), la UI no muestra error claro y puede parecer que “sí activó”.

Plan de implementación:

1) Robustecer `supabase/functions/send-gps-command/index.ts`
- Cambiar base URL de Traccar a configurable:
  - `Deno.env.get("TRACCAR_API_URL") || "https://gps.smarturban.co/api"` (con fallback seguro).
- Normalizar `parcel_name` antes de filtrar (trim + minúsculas) y hacer match case-insensitive.
- Mantener soporte por IMEI para acciones manuales.
- Agregar logs diagnósticos explícitos cuando no haya match (parcela solicitada vs parcelas disponibles).
- Devolver respuesta estructurada cuando no encuentra dispositivo (ej. `reason: "no_devices_for_parcel"`).

2) Mejorar feedback en `src/components/ConfirmDialog.tsx`
- Procesar `gpsData.success === false` y mostrar advertencia visible (toast o bloque en pantalla de éxito) con el motivo real.
- Ajustar texto de éxito para no afirmar “sirena activada” si el backend respondió que no activó relay.
- (Opcional recomendado) enviar también `phone_number` al function para futura resolución de parcela por número registrado.

3) Alinear UI administrativa (`src/components/admin/GpsDevicesTab.tsx`)
- Actualizar texto informativo de “Servidor” para mostrar `gps.smarturban.co` (evita confusión operativa).

Validación end-to-end (obligatoria):
1. Probar alarma con parcela `Teleguardia`.
2. Probar alarma con `teleguardia` (minúscula).
3. Confirmar en logs del backend que en ambos casos sale:
   - login OK
   - `POST /commands ... engineStop`
4. Verificar que, si no hay dispositivos para una parcela real, la app muestre advertencia clara y no un falso “activado”.
