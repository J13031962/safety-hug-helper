## Cambios solicitados

### 1. Código SIA de "Prueba de Sirenas": OP → TA
- En `supabase/functions/send-sia-event/index.ts`:
  - Cambiar `test: "OP"` por `test: "TA"` en `EVENT_CODES`.
  - Quitar la excepción que envía las pruebas **sin zona**. TA lleva zona (default `001`), mensaje: `"SIA-DCS"0001L0#9999[#9999|TA001]_`.

### 2. Nuevo botón "VIOLENCIA INTRAFAMILIAR" (código HA)

Nuevo tipo interno `domestic`, color verde, código SIA `HA` con zona → `HA001`.

**Frontend:**
- `src/components/EmergencyGrid.tsx`:
  - Añadir `"domestic"` al tipo `AlarmType`.
  - Añadir 5º botón verde con ícono adecuado (`HeartHandshake` o `Users`), mismas dimensiones que los otros 4.
  - Layout: mantener grid 2×2 y añadir el nuevo debajo, centrado entre las columnas de Incendio y Desastre (contenedor con `flex justify-center`, mismo `aspect-ratio` y ancho equivalente a una celda):
    ```text
    [ PÁNICO ]   [ MÉDICA  ]
    [ INCENDIO ] [ DESASTRE ]
          [ VIOLENCIA ]
    ```
- `src/pages/Index.tsx`: ampliar `AlarmType` con `"domestic"`. El botón "PRUEBA DE SIRENAS" queda debajo, sin cambios.
- `src/components/ConfirmDialog.tsx`: añadir textos/estilos para `domestic` (título, mensaje, color verde), reutilizando la lógica existente.
- `tailwind.config.ts` / `src/index.css`: añadir token semántico `emergency-domestic` (verde) y clase `bg-emergency-domestic`, coherente con la paleta.

**Backend:**
- `supabase/functions/send-sia-event/index.ts`: añadir `domestic: "HA"` en `EVENT_CODES` (se envía con zona normal, misma lógica que PA/MA/FA/BA).
- `supabase/functions/send-whatsapp/index.ts` y demás mapeos de `alarm_type` a etiqueta legible (dashboard operador, historial): añadir "Violencia Intrafamiliar" para `domestic`.
- Verificar el CHECK/enum de `alarms.alarm_type`. Si restringe a los 4 valores actuales, crear migración para incluir `'domestic'` y mantener registro histórico.

### 3. Validación
- **Las pruebas se harán ÚNICAMENTE con la parcela "Teleguardia" (cuenta 9999)** para no molestar a Casa Vieja ni Casa Juan Vásquez.
- Enviar prueba de sirenas y confirmar en logs de `send-sia-event`: `..."SIA-DCS"0001L0#9999[#9999|TA001]_`.
- Pulsar el nuevo botón Violencia Intrafamiliar sobre Teleguardia y confirmar: `...|HA001]_`, llegada a WhatsApp e inserción en `alarms`.
- Verificar visualmente en móvil que el 5º botón queda centrado bajo Incendio/Desastre y "PRUEBA DE SIRENAS" permanece debajo.

### Archivos a tocar
- `src/components/EmergencyGrid.tsx`
- `src/pages/Index.tsx`
- `src/components/ConfirmDialog.tsx`
- `tailwind.config.ts`, `src/index.css`
- `supabase/functions/send-sia-event/index.ts`
- `supabase/functions/send-whatsapp/index.ts` (etiqueta)
- Posible migración para `alarms.alarm_type` si hay CHECK/enum.
