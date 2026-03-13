

## Plan: Corregir envío de ubicación en alertas WhatsApp

### Problema
El `handleSend` en `ConfirmDialog.tsx` usa `useCallback` con dependencias `[type, state, location]` pero **falta `address`** en las dependencias. Esto causa que `address` siempre sea `null` cuando se envía el mensaje, por lo que la dirección nunca llega al WhatsApp.

Además, `location` podría no estar disponible si el countdown termina antes de que el GPS responda.

### Cambios

**`src/components/ConfirmDialog.tsx`**:
1. Agregar `address` a las dependencias del `useCallback` de `handleSend` (línea 194): `[type, state, location, address]`
2. Usar también `initialLocation` como fallback: si `location` es null al momento de enviar, usar `initialLocation` (que viene del `watchPosition` de Index.tsx y ya debería tener coordenadas)

### Resultado
- La dirección geocodificada se incluirá en el mensaje de WhatsApp
- Las coordenadas GPS se enviarán correctamente con el link de Google Maps
- Si el GPS del diálogo no resolvió a tiempo, se usa la ubicación que ya tenía la página principal

