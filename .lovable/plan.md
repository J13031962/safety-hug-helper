

## Plan: Paso intermedio de selección de parcela antes de confirmar alarma

### Problema
Cuando un usuario pertenece a múltiples parcelas, el sistema depende de localStorage para saber la parcela activa. Si por alguna razón el localStorage queda desactualizado o "enganchado" a una parcela equivocada, la alarma se envía a la parcela incorrecta.

### Solución
Agregar un paso obligatorio de selección de parcela en el flujo de alarma. Cuando el usuario presiona cualquier botón de emergencia:

- **Si tiene 1 sola parcela**: ir directo al diálogo de confirmación actual (sin cambios)
- **Si tiene 2+ parcelas**: mostrar primero un diálogo intermedio con el listado de parcelas para que elija explícitamente, y luego pasar al diálogo de confirmación

### Cambios

#### 1. `src/components/ConfirmDialog.tsx` — Agregar estado `select_parcel`
- Nuevo estado en `DialogState`: `"select_parcel" | "confirm" | "sending" | "success" | "not_registered"`
- Nuevas props: `parcels` (array de parcelas del usuario) y `onParcelSelected` (callback)
- Cuando `open` se activa y hay múltiples parcelas → mostrar pantalla de selección con botones grandes por cada parcela
- Al seleccionar una parcela: actualizar localStorage con esa parcela, luego pasar al estado `"confirm"` con el countdown normal

#### 2. `src/pages/Index.tsx` — Pasar parcelas al diálogo
- Eliminar los botones de cambio de parcela de la parte inferior (ya no son necesarios, la selección ocurre dentro del flujo de alarma)
- Pasar `parcels` como prop al `ConfirmDialog`
- Pasar callback `onParcelSelected` para actualizar el estado activo en Index

#### 3. Pantalla de selección de parcela (dentro del diálogo)
- Título: "Seleccione la parcelación"
- Subtítulo: tipo de alarma seleccionada con emoji y color
- Botones grandes (uno por parcela) con el nombre de la parcela
- Sin countdown en este paso — espera la acción del usuario

### Flujo visual
```text
[Usuario presiona PÁNICO]
         ↓
┌──────────────────────────┐
│  🔴 Alerta de PÁNICO     │
│                          │
│  Seleccione parcelación: │
│                          │
│  ┌────────────────────┐  │
│  │   Teleguardia      │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │   Loop             │  │
│  └────────────────────┘  │
│                          │
│  [Cancelar]              │
└──────────────────────────┘
         ↓ (elige Teleguardia)
┌──────────────────────────┐
│  Confirmar Emergencia    │
│  🔴 PÁNICO               │
│  📍 ubicación...         │
│  Countdown: 5...4...3... │
│  [Cancelar] [CONFIRMAR]  │
└──────────────────────────┘
```

### Resultado
- Se elimina la dependencia de localStorage para determinar la parcela — el usuario siempre confirma explícitamente
- Si solo tiene una parcela, el flujo no cambia
- Los botones de cambio de parcela en Index se eliminan (redundantes)

