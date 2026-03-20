

## Plan: Corregir duración del relay y resolución de parcela

### Problema raíz

En `send-gps-command/index.ts`, línea 259:
```
const finalParcel = resolvedParcel || clientParcel;
```

Cuando un usuario está registrado en múltiples parcelas, `regNumbers.find()` (línea 245) devuelve el **primer** registro del teléfono en la base de datos, ignorando la parcela que el usuario seleccionó en la app. Esto causa:

1. **Se activan los GPS de la parcela equivocada** — si la primera fila en BD es "Loop" pero el usuario seleccionó "La Selva", se activan los dispositivos de "Loop"
2. **La duración del relay parece no cambiar** — porque se están activando dispositivos de otra parcela que tienen 30s por defecto

### Cambio necesario

**Archivo: `supabase/functions/send-gps-command/index.ts`**

Invertir la prioridad de resolución de parcela: **preferir la parcela enviada por el cliente** (`clientParcel`) sobre la resuelta por teléfono (`resolvedParcel`). Solo usar la búsqueda por teléfono como fallback.

Cambiar línea 259 de:
```typescript
const finalParcel = resolvedParcel || clientParcel;
```
a:
```typescript
const finalParcel = clientParcel || resolvedParcel;
```

Además, validar que el teléfono esté registrado en esa parcela específica (seguridad): buscar un match que coincida tanto en teléfono como en parcela cuando `clientParcel` está presente.

### Resultado

- Si el usuario selecciona "La Selva", se activan solo los GPS de "La Selva" con su duración configurada
- Si el usuario cambia a "Loop", se activan solo los GPS de "Loop"
- La duración del relay respetará el valor configurado en cada dispositivo GPS

