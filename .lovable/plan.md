
Los logs muestran que Traccar ahora SÍ está reenviando eventos al webhook y disparando alarmas correctamente. El problema: actualmente filtramos por nombres genéricos (`alarm`, `sos`, `panic`, `emergency`), pero `attributes.alarm` puede traer valores como `vibration`, `movement`, `geofenceExit`, `lowBattery`, `tow`, `shock`, etc., que NO son emergencias reales del botón SOS y podrían disparar la alarma por error.

## Plan: Restringir webhook solo a SOS real del botón físico

### Cambio en `supabase/functions/traccar-webhook/index.ts`

Endurecer `isPanicEvent()` para aceptar **solo SOS explícito** y rechazar cualquier otra alarma:

1. **Lista blanca estricta** — solo estos valores cuentan como pánico:
   - `sos`
   - `panic`  
   - `panicButton`
   - `sosButton`
   
   Quitar `"alarm"` y `"emergency"` (demasiado genéricos).

2. **Lista negra explícita** — rechazar siempre aunque el evento sea tipo `alarm`:
   - `vibration`, `movement`, `motion`, `shock`, `tow`, `tampering`
   - `geofenceEnter`, `geofenceExit`
   - `lowBattery`, `lowPower`, `powerCut`, `powerRestored`
   - `overspeed`, `hardAcceleration`, `hardBraking`, `hardCornering`
   - `ignitionOn`, `ignitionOff`
   - `fault`, `maintenance`

3. **Ignorar `commandResult`** explícitamente (ya se ignoran pero dejarlo claro en log).

4. **Logging mejorado**: cuando se ignore, loguear el motivo (`alarm_value=vibration`) para auditar.

### Recomendación adicional (configuración Traccar — opcional)
Si quieres reducir aún más el ruido en el webhook, en Traccar puedes filtrar la notificación para que SOLO reenvíe el tipo de evento `sos` en lugar de todos. Pero con el filtro estricto en código ya estamos seguros aunque Traccar reenvíe todo.

### Archivo a modificar
- `supabase/functions/traccar-webhook/index.ts` — endurecer `isPanicEvent()` con whitelist + blacklist.
