

## Plan: Corregir que el selector de parcela se cierra solo

### Problema
En `ConfirmDialog.tsx`, cuando el diálogo abre con múltiples parcelas:
1. Línea 62: `setState("select_parcel")` — correcto
2. Línea 132: `checkRegistration()` se ejecuta en paralelo (async)
3. Línea 129: cuando termina, hace `setState("confirm")` — **sobreescribe** el estado `select_parcel`

Esto causa que el selector de parcela aparezca brevemente y luego sea reemplazado por la pantalla de confirmación con countdown.

### Cambio

**`src/components/ConfirmDialog.tsx`** — En `checkRegistration()`, cuando el usuario está registrado y tiene múltiples parcelas, NO cambiar el estado a `"confirm"`. Solo hacerlo si hay una sola parcela.

Línea 129, cambiar:
```typescript
setState("confirm");
```
por:
```typescript
const hasMultiple = parcels && parcels.length > 1;
if (!hasMultiple) {
  setState("confirm");
}
```

Esto preserva el estado `"select_parcel"` cuando hay múltiples parcelas, y solo pasa a `"confirm"` cuando hay una sola.

