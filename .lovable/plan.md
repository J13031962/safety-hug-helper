

## Plan: Selector de parcelación cuando el usuario pertenece a más de una

### Situación actual
- En `PhoneGate`, al verificar el teléfono se busca UN solo match en `registered_numbers` y se guarda `parcelName` en localStorage
- En `Index`, se muestra directamente la grilla de botones de emergencia sin considerar múltiples parcelas
- En las capturas del usuario: cuando hay múltiples parcelas, aparecen botones debajo de la grilla (ej: "Loop", "La Selva") para cambiar entre parcelas

### Cambios necesarios

#### 1. `PhoneGate.tsx` — Guardar TODAS las parcelas del usuario
- En lugar de buscar un solo match, buscar TODOS los registros que coincidan con el número
- Guardar en localStorage un array `parcels` con `[{ parcelName, houseNumber, ownerName }]`
- Si hay una sola parcela, auto-seleccionarla como `parcelName` actual
- Si hay varias, guardar la primera como default pero mantener el array completo

#### 2. `Index.tsx` — Mostrar selector de parcelas
- Leer `parcels` del localStorage
- Si `parcels.length === 1`: mostrar la grilla de emergencia directamente (como ahora), con el nombre de la parcela arriba
- Si `parcels.length > 1`: mostrar la grilla de emergencia con la parcela activa, y debajo mostrar botones para las OTRAS parcelas (las que NO están seleccionadas actualmente)
- Al presionar un botón de otra parcela: cambiar `parcelName`, `houseNumber` en el estado y en localStorage, re-renderizar
- Los botones de parcela tendrán estilo outlined/border como en la captura del usuario

#### 3. `ConfirmDialog.tsx` — Usar la parcela activa
- Ya usa `parcelName` de localStorage, solo verificar que tome el valor actualizado cuando se cambia parcela

### Flujo visual
```text
┌─────────────────────────┐
│  SmartSOS               │
│  GPS activa • Juan      │
├─────────────────────────┤
│       [Logo]            │
│  Parcelación: Loop      │  ← parcela activa
│                         │
│  [PÁNICO]  [MÉDICA]     │
│  [INCENDIO][DESASTRE]   │
│                         │
│  [La Selva] [Teleguard] │  ← botones de las OTRAS parcelas
│                         │
│  Alertas vía WhatsApp   │
└─────────────────────────┘
```

### Detalles técnicos
- No requiere migración de base de datos
- Los cambios son solo en el frontend (PhoneGate, Index, posiblemente ConfirmDialog)
- El `parcelName` activo se actualiza en localStorage al cambiar, para que ConfirmDialog lo lea correctamente

