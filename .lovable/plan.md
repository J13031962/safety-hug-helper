## Diagnóstico probable (pantalla negra)

El síntoma en Android/Chrome PWA ("pantalla en negro/azul del fondo, sin diálogo, hay que refrescar") es el patrón clásico de **un error de JavaScript no capturado que rompe el árbol de React**. Como la app no tiene un `ErrorBoundary`, cuando algo revienta dentro del flujo de "Prueba de sirenas", React desmonta todo y sólo queda el `<body>` con el color de fondo del tema oscuro. Al recargar, vuelve a montar y funciona.

Que ocurra sólo en el móvil de Sebastián y sólo con "Prueba de sirenas" suele deberse a **datos específicos de ese usuario** (sirena huérfana, `sosalerta_settings` en formato viejo, `parcel_name` inexistente), combinado con que ese flujo encadena varias llamadas donde un `undefined` inesperado explota.

## Plan

### 1. Blindar la app contra pantalla negra (ErrorBoundary global)
- Crear `src/components/ErrorBoundary.tsx` que capture errores de render y muestre:
  - Mensaje amable ("Ocurrió un error inesperado").
  - Botón "Recargar".
  - Detalle técnico colapsable (mensaje + stack) para poder pedírselo al usuario.
- Envolver toda la app en `src/App.tsx` con `<ErrorBoundary>`.
- Beneficio inmediato: aunque no arreglemos la causa raíz hoy, Sebastián nunca más verá pantalla negra sin salida.

### 2. Endurecer `TestSirenDialog` para no romper con datos inconsistentes
En `src/components/TestSirenDialog.tsx`:
- **`fetchSirens`**: manejar caso `userParcels` vacío/`undefined`; envolver todo en try/catch.
- **`handleActivate`**: envolver todo el cuerpo en try/catch/finally para que `setActivating(null)` siempre corra y ningún error escape.
- Validar que `siren.parcel_names` no esté vacío antes del `for...of`.
- Añadir `console.info` / `console.warn` con prefijo `[TestSiren]` en cada paso (fetch, GPS, SIA, WhatsApp, insert) para diagnosticar en el móvil.
- Si el insert en `alarms` falla, registrar y continuar (no lanzar).

### 3. Reproducir causa raíz en el móvil de Sebastián
Una vez desplegado lo anterior, pedirle:
1. Conectar el móvil por USB al PC y abrir `chrome://inspect` en Chrome de escritorio.
2. Inspeccionar la PWA y reproducir el bug.
3. Copiar logs `[TestSiren]` y el error rojo para el fix quirúrgico definitivo.

---

### 4. Auto-actualización de la página para todos los usuarios cuando hagas deploy

Objetivo: cada vez que el script del servidor actualice el repo, todos los usuarios que tengan la PWA/pestaña abierta reciban la nueva versión sin tener que refrescar manualmente.

**Estrategia: versionado + polling ligero + recarga automática.**

Componentes a crear:

- **`public/version.json`** — archivo estático con un sello de versión, por ejemplo:
  ```json
  { "version": "2026-07-08T20:15:00Z" }
  ```
  Sirve el propio hosting como archivo estático, sin caché (ver más abajo).

- **Generación automática en build**: modificar `package.json` para que el script `build` ejecute antes un pequeño script Node (`scripts/gen-version.mjs`) que escriba `public/version.json` con la fecha ISO actual (o el hash corto de git si está disponible). Así, cada vez que tu script en el servidor haga `npm run build`, el `version.json` desplegado será distinto.

- **`src/hooks/useAutoUpdate.ts`** — hook que:
  1. Al montar, hace `fetch("/version.json", { cache: "no-store" })` y guarda el valor inicial.
  2. Cada 60 segundos (configurable) vuelve a pedir `/version.json` (también `no-store`).
  3. Si el `version` recibido difiere del inicial:
     - Muestra un `toast` corto ("Actualizando a la última versión…").
     - Espera 1-2 segundos y hace `window.location.reload()`.
  4. También revisa al recuperar foco (`visibilitychange` → `visible`) para el caso PWA que estuvo en background.
  5. Se auto-desactiva en desarrollo (`import.meta.env.DEV`) para no molestar.

- **Integración**: llamar `useAutoUpdate()` una sola vez dentro del `App` (por ejemplo en un componente pequeño `<AutoUpdater />` montado en `App.tsx`), para que aplique a toda ruta.

- **Cache-busting del index**: agregar `<meta http-equiv="Cache-Control" content="no-cache" />` en `index.html` para asegurar que al recargar tras detectar nueva versión, el navegador pida un `index.html` fresco (los assets JS/CSS ya vienen con hash en el nombre por Vite, así que no hay problema).

**Por qué NO usar service worker aquí**: el proyecto no tiene PWA offline configurada y añadir un service worker abre otra clase entera de bugs de caché (justo los que causan las pantallas blancas/negras después de deploy). El polling de un `version.json` es simple, robusto y suficiente para tu flujo (deploy vía script en el servidor).

**Comportamiento resultante**:
- Usuario A tiene la app abierta → tú desplegas → en menos de 60s (o al volver a la pestaña) ve un toast y la app se recarga sola con la versión nueva.
- No requiere interacción del usuario ni desinstalar la PWA.
- Coste de red mínimo (~100 bytes cada 60s).

### 5. Verificación
- Build limpia sin errores.
- Probar en preview: modificar `public/version.json` manualmente → tras <60s la pestaña se recarga sola.
- Probar `ErrorBoundary` forzando un throw temporal.
- Probar flujo normal de "Prueba de sirenas" sigue funcionando.

## Detalles técnicos

- **Archivos a crear**: `src/components/ErrorBoundary.tsx`, `src/hooks/useAutoUpdate.ts`, `scripts/gen-version.mjs`, `public/version.json` (placeholder inicial).
- **Archivos a modificar**: `src/App.tsx` (ErrorBoundary + AutoUpdater), `src/components/TestSirenDialog.tsx` (hardening + logs), `package.json` (script build), `index.html` (meta no-cache).
- **No se toca**: DB, edge functions, flujo de alarmas normales, ni se añaden dependencias.
- **Compatibilidad PWA instalada**: `window.location.reload()` funciona igual dentro de la PWA de Android; el usuario verá una recarga suave y quedará en la misma ruta.