# Arreglar el apagado automático de sirenas en Halcón

## Diagnóstico (verificado en la base de datos)

- El trabajo de cron `smartsos-process-relay-jobs` existe y está activo, pero **todas sus ejecuciones fallan** (una por minuto) con:
  `ERROR: function extensions.http_post(url => unknown, headers => jsonb, body => jsonb) does not exist`
- Motivo: en Halcón la extensión `http` no está instalada; lo que hay es **`pg_net`**, cuya función es `net.http_post(...)`. El script `02_cron.sql` usa `extensions.http_post`, que no existe en este proyecto.
- Consecuencia: `process-relay-jobs` nunca se invoca. Hay un trabajo `engineResume` para el IMEI `355468592594287` en estado `pending` con `execute_at` de las 16:52 UTC que nunca se ejecutó → la sirena de Teleguardia sigue sonando.

## Qué se hará

1. **Reprogramar el cron con la función correcta**: recrear `smartsos-process-relay-jobs` usando `net.http_post(url, headers, body)` (pg_net), cada minuto, apuntando a `https://junctwbyjtjhwjjioytc.supabase.co/functions/v1/process-relay-jobs` con la Service Role Key en el header `Authorization`.
2. **Actualizar `migration/halcon/02_cron.sql`** para que quede con `net.http_post` y no vuelva a fallar en futuros despliegues.
3. **Apagar ya la sirena pendiente**: invocar `process-relay-jobs` una vez de forma manual para que procese el trabajo `engineResume` atrasado y envíe el comando al GPS.
4. **Verificar**: revisar `cron.job_run_details` (estado `succeeded`), que el trabajo pase a `completed`, que `gps_devices.relay_active_until` quede en `NULL` y confirmar en los logs de la función el envío exitoso a Traccar (`RELAY,0#` / `engineResume`).

## Notas técnicas

- La Service Role Key se necesita para el header del cron; se guardará solo dentro de la definición del job en la base de datos (igual que en el diseño original), no en el código del frontend.
- El cron original en Lovable Cloud usaba 3 jobs desfasados (0/20/40 s) para reaccionar cada ~20 s. Con `pg_cron` en Halcón se puede replicar ese patrón si se quiere precisión de 20 segundos; propuesta base: mantener 1 job por minuto y, si el retardo de apagado molesta, añadir los dos jobs desfasados.
