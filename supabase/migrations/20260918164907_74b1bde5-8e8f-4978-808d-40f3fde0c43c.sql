CREATE TABLE smartsos.gps_command_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alarm_id uuid NULL,
  relay_job_id uuid NULL,
  gps_device_id uuid NULL REFERENCES smartsos.gps_devices(id) ON DELETE SET NULL,
  imei text NOT NULL,
  device_name text NULL,
  parcel_name text NULL,
  action text NOT NULL,
  source text NOT NULL DEFAULT 'alarm',
  status text NOT NULL DEFAULT 'pending',
  traccar_device_id bigint NULL,
  response_message text NULL,
  attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_review boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz NULL,
  confirmed_at timestamptz NULL,
  completed_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON smartsos.gps_command_events TO authenticated;
GRANT ALL ON smartsos.gps_command_events TO service_role;

ALTER TABLE smartsos.gps_command_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and directors can view GPS command events"
ON smartsos.gps_command_events
FOR SELECT
TO authenticated
USING (
  smartsos.has_role(auth.uid(), 'admin'::smartsos.app_role)
  OR smartsos.has_role(auth.uid(), 'director_monitoreo'::smartsos.app_role)
);

CREATE INDEX gps_command_events_alarm_idx ON smartsos.gps_command_events (alarm_id);
CREATE INDEX gps_command_events_imei_started_idx ON smartsos.gps_command_events (imei, started_at DESC);
CREATE INDEX gps_command_events_review_idx ON smartsos.gps_command_events (requires_review, started_at DESC);
CREATE INDEX gps_command_events_status_idx ON smartsos.gps_command_events (status, started_at DESC);

CREATE OR REPLACE FUNCTION smartsos.set_gps_command_event_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = smartsos, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_gps_command_event_updated_at
BEFORE UPDATE ON smartsos.gps_command_events
FOR EACH ROW
EXECUTE FUNCTION smartsos.set_gps_command_event_updated_at();

INSERT INTO smartsos.gps_command_events
  (gps_device_id, imei, device_name, parcel_name, action, source, status, response_message, requires_review, completed_at)
SELECT d.id, d.imei, d.name, dp.parcel_name, 'diagnostic', 'manual_diagnostic', 'requires_review',
  CASE
    WHEN d.imei = '355468594693400' THEN 'Sin confirmación del GPS desde el 17 de septiembre; posible salida o firmware bloqueado.'
    ELSE 'El GPS recibe la orden de activación pero la rechaza con ERROR:103.'
  END,
  true, now()
FROM smartsos.gps_devices d
LEFT JOIN smartsos.gps_device_parcels dp ON dp.device_id = d.id
WHERE d.imei IN ('355468594693400', '355468594691990');