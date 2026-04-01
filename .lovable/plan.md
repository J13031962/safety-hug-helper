

## Plan: Reemplazar ícono Shield por logo SmartSOS en PhoneGate

### Cambio

**`src/components/PhoneGate.tsx`** — Reemplazar el ícono Shield (líneas 137-140) por la imagen del logo SmartSOS que ya se subió.

1. Copiar `user-uploads://smart_sos.png` → `src/assets/smart_sos.png`
2. Importar la imagen en PhoneGate
3. Reemplazar el div circular con Shield por un `<img>` con el logo, manteniendo `w-20 h-20` como dimensiones
4. Eliminar el `<h1>SmartSOS</h1>` debajo ya que el logo ya contiene el texto

### Detalle técnico

Líneas 137-141 cambian de:
```tsx
<div className="w-20 h-20 rounded-full border-2 ...">
  <Shield className="w-10 h-10 text-emergency-panic" />
</div>
<h1 className="text-2xl ...">SmartSOS</h1>
```
a:
```tsx
<img src={smartSosLogo} alt="SmartSOS" className="w-20 h-20 object-contain" />
```

