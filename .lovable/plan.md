

## Plan: Agregar tema claro (light mode)

### Problema
El CSS solo define variables para el tema oscuro en `:root`. Cuando `SettingsTab` agrega la clase `.light` al `<html>`, no hay variables de colores claros definidas, así que nada cambia visualmente.

### Cambios

#### 1. `src/index.css` — Agregar bloque `.light` con variables de tema claro
Después del cierre de `:root` (línea 54), agregar un bloque `.light` con colores invertidos (fondos blancos/grises claros, texto oscuro, bordes claros, etc.). Se mantienen los colores de emergencia iguales.

#### 2. `src/index.css` — Aplicar tema al cargar
Mover la lógica de inicialización del tema desde `SettingsTab` a `index.html` o al `main.tsx` para que el tema se aplique antes del primer render (evitar flash de tema incorrecto).

#### 3. `index.html` — Script inline para aplicar tema antes del render
Agregar un pequeño script en el `<head>` que lea `sosalerta_settings` de localStorage y aplique la clase `.light` si `darkMode === false`. Esto evita el parpadeo al cargar.

### Colores del tema claro
```css
.light {
  --background: 0 0% 100%;
  --foreground: 220 20% 10%;
  --card: 0 0% 97%;
  --card-foreground: 220 20% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 220 20% 10%;
  --primary: 220 20% 10%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 93%;
  --secondary-foreground: 220 20% 10%;
  --muted: 220 14% 95%;
  --muted-foreground: 215 15% 45%;
  --accent: 220 14% 93%;
  --accent-foreground: 220 20% 10%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 14% 85%;
  --input: 220 14% 85%;
  --ring: 220 20% 10%;
  --sidebar-background: 0 0% 97%;
  --sidebar-foreground: 220 20% 15%;
  --sidebar-primary: 210 100% 45%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 220 14% 92%;
  --sidebar-accent-foreground: 220 20% 15%;
  --sidebar-border: 220 14% 88%;
  --sidebar-ring: 210 100% 45%;
}
```

### Sin cambios en SettingsTab
La lógica existente de toggle y localStorage ya funciona correctamente. Solo faltaban las variables CSS.

