

# Plan: Migrar de CallMeBot a TextMeBot

## Cambios

### 1. Guardar la API key de TextMeBot como secreto
- Usar la herramienta `add_secret` para guardar `TEXTMEBOT_API_KEY` en el proyecto
- Se usa una sola key para enviar a todos los contactos

### 2. Actualizar `supabase/functions/send-whatsapp/index.ts`
- Cambiar la URL de `api.callmebot.com/whatsapp.php` a `api.textmebot.com/send.php`
- Usar `Deno.env.get("TEXTMEBOT_API_KEY")` en vez de la key por contacto
- Parámetros: `recipient`, `apikey`, `text` (en vez de `phone`, `apikey`, `text`)

### 3. Simplificar `src/components/admin/RegisteredNumbersTab.tsx`
- Eliminar el campo "API Key CallMeBot" del formulario de registro
- Quitar la columna/campo `callmebot_apikey` de la vista
- Ya no se necesita key individual por número

### 4. No se requieren cambios en la base de datos
- La columna `callmebot_apikey` se puede dejar nullable (sin uso), no es necesario migrarla

