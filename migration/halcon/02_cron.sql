-- =====================================================================
-- SmartSOS: Realtime + cron de apagado automático de sirenas
-- Ejecutar DESPUÉS de 01_schema.sql
-- Reemplaza <PROJECT_REF> y <SERVICE_ROLE_KEY> antes de ejecutar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Realtime: el panel de operador escucha las alarmas nuevas
-- ---------------------------------------------------------------------
ALTER TABLE smartsos.alarms REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'smartsos' AND tablename = 'alarms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE smartsos.alarms;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Cron: procesa los trabajos de apagado de sirena cada minuto
--    (invoca la Edge Function process-relay-jobs)
-- ---------------------------------------------------------------------
SELECT cron.unschedule('smartsos-process-relay-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'smartsos-process-relay-jobs');

SELECT cron.schedule(
  'smartsos-process-relay-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/process-relay-jobs',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{"source":"cron"}'::jsonb
  );
  $$
);

-- Verificar:
-- SELECT jobname, schedule, active FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
