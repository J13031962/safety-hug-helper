

## Plan: Corregir formato del mensaje SIA-DCS para que llegue a la CRA

### Problema
Los logs muestran que el mensaje se envía sin error TCP, pero no llega a la CRA. La diferencia con los comandos PowerShell que sí funcionan es:

1. **Salto de línea**: PowerShell `WriteLine` envía `\r\n` (CRLF). Nuestro código envía solo `\n` (LF). Muchos receptores SIA esperan CRLF.
2. **Cierre de conexión**: `conn.close()` se llama inmediatamente sin esperar que los datos se vacíen del buffer.

### Cambio

**`supabase/functions/send-sia-event/index.ts`** — Líneas 91 y 96-100:

```typescript
// Cambiar \n por \r\n (CRLF como PowerShell WriteLine)
const message = `"SIA-DCS"0001L0#${accountNumber}[#${accountNumber}|${eventCode}${zone}]_\r\n`;

// Usar closeWrite() para señalar fin de escritura y dar tiempo al flush
const conn = await Deno.connect({ hostname: SIA_HOST, port: SIA_PORT });
const encoder = new TextEncoder();
await conn.write(encoder.encode(message));

// Leer respuesta del servidor (si la hay) antes de cerrar
const buf = new Uint8Array(256);
try {
  await conn.read(buf);
} catch (_) {
  // Servidor puede no responder, está bien
}
conn.close();
```

### Detalle
- Se cambia `\n` → `\r\n` para que coincida exactamente con lo que envía PowerShell
- Se intenta leer una respuesta del servidor antes de cerrar, lo que garantiza que los datos se enviaron completamente antes del cierre de la conexión

