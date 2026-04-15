

## Plan: Integración SIA-DCS con CRA

### Resumen
Agregar campos de número de abonado (parcelas) y número de usuario/zona (números registrados) para enviar eventos SIA-DCS por TCP a la CRA cuando se dispara una alarma.

### Formato SIA-DCS
```text
"SIA-DCS"0001L0#ACCOUNT[#ACCOUNT|XXZONE]_
```
- `ACCOUNT` = número de abonado de la parcela
- `XX` = código de evento (PA=pánico, FA=incendio, MA=médica, BA=desastre)
- `ZONE` = número de usuario (zona, 3 dígitos)

### Cambios

#### 1. Migración de base de datos
- Agregar columna `account_number` (text, nullable) a tabla `parcels`
- Agregar columna `user_number` (text, nullable) a tabla `registered_numbers`
- Insertar `account_number = '9999'` en parcela "Teleguardia" como datos de prueba

#### 2. Nueva Edge Function: `send-sia-event`
- Recibe: `alarm_type`, `parcel_name`, `phone_number`
- Busca el `account_number` de la parcela
- Busca el `user_number` del registered_number (matching phone + parcel)
- Mapea alarm_type → código SIA: panic→PA, fire→FA, medical→MA, disaster→BA
- Abre conexión TCP a `51.79.66.148:9558`
- Envía el mensaje SIA-DCS formateado
- Usa `Deno.connect()` para TCP nativo en Edge Functions

#### 3. Modificar `ConfirmDialog.tsx`
- Después de enviar WhatsApp y GPS, invocar `send-sia-event` con los datos de la alarma
- Manejar errores/warnings igual que GPS

#### 4. UI Admin — `ParcelsTab.tsx`
- Agregar campo "Número de abonado (CRA)" al formulario de crear/editar parcela

#### 5. UI Admin — `RegisteredNumbersTab.tsx`
- Agregar campo "Número de usuario (zona CRA)" al formulario de crear/editar número
- Como cada registro ya es por combinación phone+parcel, cada uno tendrá su propio user_number

#### 6. Actualizar documentación
- `.lovable/memory/features/gps-server.md` o nuevo archivo de memoria con la lógica SIA-DCS

### Detalle técnico: Edge Function TCP

```typescript
// Conexión TCP con Deno
const conn = await Deno.connect({ hostname: "51.79.66.148", port: 9558 });
const encoder = new TextEncoder();
const message = `"SIA-DCS"0001L0#${account}[#${account}|${eventCode}${zone}]_\n`;
await conn.write(encoder.encode(message));
conn.close();
```

### Datos de prueba
- Parcela "Teleguardia" → account_number: `9999`

