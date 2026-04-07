

## Plan: Corregir referencia a variable inexistente `resumeResult`

### Problema
En `supabase/functions/send-gps-command/index.ts`, línea 378, se referencia `resumeResult.attempts` pero esa variable no existe — al invertir la lógica, el resultado del comando se guardó en `stopResult` pero no se actualizó esta referencia. Esto causa el error 500 `"resumeResult is not defined"` y muestra el mensaje amarillo de que no se pudo activar el GPS.

### Cambio

**`supabase/functions/send-gps-command/index.ts`** — Línea 378, cambiar:
```typescript
attempts: resumeResult.attempts,
```
por:
```typescript
attempts: stopResult.attempts,
```

Un solo cambio de una palabra. El resto de la lógica está correcta.

