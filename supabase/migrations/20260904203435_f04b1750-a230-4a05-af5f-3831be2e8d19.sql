-- lovable-cron-fallback-reviewed: 288 runs/day; WhatsApp puede desconectarse en cualquier momento, la CRA requiere notificación en minutos si el canal masivo falla, y TextMeBot no ofrece webhooks de desconexión, por lo que el polling es el único mecanismo fiable además del reporte por fallo de envío.

CREATE SCHEMA IF NOT EXISTS smartsos;

-- =====================================================================
-- Tablas de estado de servicios (WhatsApp)
-- =====================================================================

CREATE TABLE IF NOT EXISTS smartsos.service_status (
  service TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'up' CHECK (status IN ('up', 'down')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smartsos.service_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('up', 'down')),
  reason TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smartsos.service_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- Permisos (GRANTs) y RLS
-- =====================================================================

GRANT SELECT ON smartsos.service_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.service_status TO service_role;

GRANT SELECT ON smartsos.service_status_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.service_status_log TO service_role;

GRANT SELECT ON smartsos.service_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.service_config TO service_role;

ALTER TABLE smartsos.service_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.service_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.service_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read service status"
  ON smartsos.service_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read service status log"
  ON smartsos.service_status_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read service config"
  ON smartsos.service_config FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- Trigger updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION smartsos.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = smartsos, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_service_status_updated_at ON smartsos.service_status;
CREATE TRIGGER update_service_status_updated_at
  BEFORE UPDATE ON smartsos.service_status
  FOR EACH ROW EXECUTE FUNCTION smartsos.touch_updated_at();

DROP TRIGGER IF EXISTS update_service_status_log_updated_at ON smartsos.service_status_log;
CREATE TRIGGER update_service_status_log_updated_at
  BEFORE UPDATE ON smartsos.service_status_log
  FOR EACH ROW EXECUTE FUNCTION smartsos.touch_updated_at();

DROP TRIGGER IF EXISTS update_service_config_updated_at ON smartsos.service_config;
CREATE TRIGGER update_service_config_updated_at
  BEFORE UPDATE ON smartsos.service_config
  FOR EACH ROW EXECUTE FUNCTION smartsos.touch_updated_at();

-- =====================================================================
-- Función de limpieza de historial
-- =====================================================================

CREATE OR REPLACE FUNCTION smartsos.cleanup_service_status_log()
RETURNS void
LANGUAGE plpgsql
SET search_path = smartsos, public
AS $$
BEGIN
  DELETE FROM smartsos.service_status_log
  WHERE checked_at < now() - interval '7 days';
END;
$$;

-- =====================================================================
-- Datos iniciales
-- =====================================================================

INSERT INTO smartsos.service_status (service, status, changed_at, last_reason)
VALUES ('whatsapp', 'up', now(), 'initial')
ON CONFLICT (service) DO NOTHING;

INSERT INTO smartsos.service_config (key, value)
VALUES ('whatsapp_health_cron_token', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- Cron: limpieza diaria del historial
-- =====================================================================

SELECT cron.unschedule('smartsos-cleanup-service-log')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'smartsos-cleanup-service-log');

SELECT cron.schedule(
  'smartsos-cleanup-service-log',
  '0 3 * * *',
  $$
    SELECT smartsos.cleanup_service_status_log();
  $$
);

-- =====================================================================
-- Cron: chequeo de salud de WhatsApp cada 5 minutos
-- =====================================================================

SELECT cron.unschedule('smartsos-whatsapp-health')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'smartsos-whatsapp-health');

SELECT cron.schedule(
  'smartsos-whatsapp-health',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://junctwbyjtjhwjjioytc.supabase.co/functions/v1/whatsapp-health',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bmN0d2J5anRqaHdqamlveXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxODY2MjQsImV4cCI6MjA3MDc2MjYyNH0.8atLoOXuQXwDUnFog-rhYBBdCK_Cp3vi6TZAyNdqtG0',
        'x-cron-token', (SELECT value FROM smartsos.service_config WHERE key = 'whatsapp_health_cron_token')
      ),
      body := '{"source":"cron"}'::jsonb
    );
  $$
);

-- =====================================================================
-- Realtime para service_status (panel de admin)
-- =====================================================================

ALTER TABLE smartsos.service_status REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'smartsos' AND tablename = 'service_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE smartsos.service_status;
  END IF;
END $$;