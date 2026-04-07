

## Plan: Invertir la lógica de comandos GPS (engineStop ↔ engineResume)

### Contexto

Sí, los comandos los envía tu propio codigo en dos funciones backend:

1. **`send-gps-command`** — cuando se dispara una alarma, envía el comando inmediato (sirena ON) y programa el job de apagado
2. **`process-relay-jobs`** — cron worker que ejecuta los jobs programados (sirena OFF)

Cada función envía múltiples intentos por comando: el nativo de Traccar (`engineStop`/`engineResume`), un fallback, y comandos de texto RELAY por GPRS y SMS.

### Problema actual
- Alarma ON → `engineResume` + `RELAY,0#` + `333#`
- Alarma OFF → `engineStop` + `RELAY,1#` + `222#`
- Estado final de reposo: `engineStop` → Traccar muestra "Cut off fuel supply" permanentemente

### Cambio: invertir todo

Nuevo flujo:
- **Alarma ON** → `engineStop` + `RELAY,1#` + `222#` (sirena suena)
- **Alarma OFF** → `engineResume` + `RELAY,0#` + `333#` (sirena para)
- **Estado final de reposo**: `engineResume` → Traccar NO muestra "fuel cut"

### Archivos a modificar

#### 1. `supabase/functions/send-gps-command/index.ts`
- Linea 348-349: Cambiar `"engineResume"` por `"engineStop"` (comando inmediato al disparar alarma)
- Linea 339: Cambiar cancelación de jobs `"engineStop"` por `"engineResume"` (ahora el job programado es engineResume)
- Linea 361: Cambiar job programado de `"engineStop"` a `"engineResume"`
- Linea 371: Actualizar logs

#### 2. `supabase/functions/process-relay-jobs/index.ts`
- Linea 184-185: Cambiar la verificación de relay extendido de `"engineStop"` a `"engineResume"` (ahora el job de apagado es engineResume)
- Linea 218: Cambiar búsqueda de jobs futuros de `"engineStop"` a `"engineResume"`

#### 3. `.lovable/memory/features/gps-server.md`
- Actualizar la documentación de "Siren Logic" para reflejar la inversión:
  - Alarma → `engineStop` (sirena ON)
  - Apagar → `engineResume` (sirena OFF)

### Lo que NO cambia
- La función `getRelayTextCommands()` en ambos archivos NO se toca — ya mapea correctamente cada action a sus comandos de texto RELAY asociados
- La lógica de cancelación de jobs, el cron worker, y el flujo general siguen igual — solo se intercambian los nombres de los comandos

### Resultado
El dispositivo quedará en estado `engineResume` cuando esté en reposo, eliminando el mensaje "Cut off fuel supply" de Traccar.

