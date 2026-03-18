
Objetivo: asegurar que cualquier alarma (pánico, médica, incendio, desastre) ejecute exactamente este flujo: resolver parcela por teléfono del remitente → ubicar GPS por IMEI en esa parcela → enviar `engineStop` → esperar `relay_duration` → enviar `engineResume`, sin tocar lo que ya funciona de WhatsApp.

Resumen de hallazgos actuales:
- Hoy el backend ya está enviando comandos a Traccar y recibe HTTP 200.
- Pero la lógica todavía depende de `parcel_name` del cliente y no toma como fuente principal el número telefónico registrado.
- Además, el envío actual manda dos formatos de comando aunque el primero ya haya sido exitoso (puede generar comportamiento no deseado).
- El `engineResume` depende de `setTimeout` dentro de la función; si el runtime se corta, puede perderse en algunos casos.

Plan de implementación:

1) Resolver parcela desde el teléfono (fuente de verdad en backend)
- Mantener el insert en `alarms` como está, pero al invocar GPS enviar `alarm_id` y `phone_number`.
- En `send-gps-command`, cargar la alarma por `alarm_id`, normalizar teléfono (solo dígitos) y buscar coincidencia en `registered_numbers`.
- Tomar `parcel_name` desde `registered_numbers` (no desde localStorage) como prioridad.
- Buscar GPS en `gps_devices` por `parcel_name` case-insensitive y usar sus IMEI.
- Si no hay match por teléfono/parcela, devolver razón clara (`phone_not_registered`, `parcel_not_found`, `no_devices_for_parcel`).

2) Corregir envío de comandos para que sea exactamente stop -> resume
- Ajustar `sendDeviceCommand` para:
  - intentar primero `type: "engineStop"` / `type: "engineResume"`;
  - usar fallback `type: "command"` **solo si falla** el primero.
- Evitar doble envío cuando el primer intento ya fue exitoso.
- Mantener soporte manual por IMEI (`action + imei`) sin romper lo existente.

3) Garantizar `engineResume` tras el tiempo configurado
- Fase inmediata: mantener espera por `relay_duration` para comportamiento actual.
- Fase robusta: agregar cola persistente `gps_relay_jobs` (pendiente/procesando/completado/error) con `execute_resume_at`.
- Crear worker backend programado que procese vencidos y envíe `engineResume` aunque la función original ya no esté viva.
- Esto elimina dependencia total de `setTimeout` en memoria para la restauración.

4) No tocar WhatsApp y mejorar feedback de operador/usuario
- No modificar `send-whatsapp` ni su formato de mensaje.
- En `ConfirmDialog`, mostrar resultado GPS real:
  - activado correctamente;
  - o motivo exacto de falla (teléfono sin registro, parcela sin GPS, comando rechazado).
- Corregir texto de éxito para no afirmar “sirena activada” si GPS falló.

Cambios técnicos previstos:

- `src/components/ConfirmDialog.tsx`
  - invocar GPS con `alarm_id`, `phone_number`, `alarm_type`.
  - mantener flujo WhatsApp intacto.

- `supabase/functions/send-gps-command/index.ts`
  - resolver parcela por teléfono registrado.
  - filtrar dispositivos por parcela normalizada.
  - envío de comando con fallback condicional (no doble envío en éxito).
  - estructurar respuestas con `reason` explícito.
  - preparar integración con cola de `engineResume`.

- Nuevo esquema backend (migración)
  - tabla `gps_relay_jobs` + índices por estado/fecha.
  - RLS habilitado con políticas restringidas a roles administrativos (servicio interno seguirá funcionando con rol de servicio).

- Nuevo worker backend programado
  - procesa jobs vencidos y emite `engineResume`.
  - limpia `relay_active_until` al completar.

Validación end-to-end (obligatoria):
1. Disparar una alarma de cada tipo (pánico, médica, incendio, desastre).
2. Confirmar en logs:
   - resolución teléfono -> parcela correcta,
   - envío `engineStop` (un comando efectivo),
   - creación/programación de `engineResume`.
3. Esperar `relay_duration` configurado y validar envío de `engineResume`.
4. Verificar caso negativo: teléfono no registrado / parcela sin GPS -> mensaje claro y sin falso positivo.
5. Confirmar que WhatsApp sigue enviándose exactamente igual.
