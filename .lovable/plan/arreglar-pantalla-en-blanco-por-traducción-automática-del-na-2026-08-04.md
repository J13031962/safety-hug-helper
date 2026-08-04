# Arreglar pantalla en blanco por traducción automática del navegador

## Diagnóstico

El error `NotFoundError: removeChild ... no es hijo de este nodo` es un conflicto conocido entre React y el traductor automático de Chrome/Android: el traductor reemplaza los nodos de texto del DOM por sus propios nodos, y cuando React intenta actualizar o quitar el nodo original (al abrir/cerrar el diálogo de "Prueba de Sirenas") ya no existe, lo que rompe el árbol y deja la pantalla del color de fondo.

Confirma el diagnóstico el hecho de que al desactivar la traducción automática el error desaparece.

## Qué se va a hacer

1. **Declarar el idioma real y bloquear la traducción automática** (`index.html`):
   - `<html lang="es" translate="no">`
   - `<meta name="google" content="notranslate" />`
   - clase `notranslate` en `<body>` y en `#root`
   Con esto Chrome ya no ofrece ni aplica traducción sobre la app (la app está en español, así que no se pierde nada para el usuario).

2. **Blindaje adicional en el contenedor de la app** (`src/main.tsx` / `App.tsx`): marcar el árbol raíz con `translate="no"` para cubrir traductores que ignoran el meta.

3. **Recuperación automática del ErrorBoundary** (`src/components/ErrorBoundary.tsx`): si aun así ocurre un error de tipo `removeChild`/`insertBefore` (NotFoundError), en lugar de dejar la pantalla de error, recargar la vista automáticamente una sola vez para que el usuario no quede bloqueado.

4. **Limpieza de metadatos**: corregir `og:title`, `og:description` y `twitter:*` que hoy dicen "Lovable App" / "Lovable Generated Project" por los de SmartSOS.

## Notas técnicas

- No se cambia ninguna lógica de alarmas, sirenas, SIA ni WhatsApp.
- Los cambios son de presentación/robustez del frontend.
- Los usuarios recibirán el arreglo con el sistema de auto-actualización ya existente (`version.json` + `useAutoUpdate`) tras publicar.
