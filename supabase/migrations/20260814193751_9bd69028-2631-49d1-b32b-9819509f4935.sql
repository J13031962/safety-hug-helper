CREATE TABLE public.ble_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  device_identifier text,
  manufacturer text,
  model text,
  profile text,
  name text,
  phone_number text,
  registered_number_id uuid REFERENCES public.registered_numbers(id) ON DELETE SET NULL,
  parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  token_hash text,
  last_seen_at timestamptz,
  battery integer,
  rssi integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ble_devices_device_identifier_key
  ON public.ble_devices (lower(device_identifier))
  WHERE device_identifier IS NOT NULL;

CREATE INDEX ble_devices_parcel_id_idx ON public.ble_devices (parcel_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ble_devices TO authenticated;
GRANT ALL ON public.ble_devices TO service_role;

ALTER TABLE public.ble_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ble devices"
  ON public.ble_devices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and directors manage ble devices"
  ON public.ble_devices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'director_monitoreo'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'director_monitoreo'::app_role));

CREATE TRIGGER update_ble_devices_updated_at
  BEFORE UPDATE ON public.ble_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ble_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  ble_device_id uuid REFERENCES public.ble_devices(id) ON DELETE SET NULL,
  button text NOT NULL,
  alarm_id uuid REFERENCES public.alarms(id) ON DELETE SET NULL,
  pressed_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ble_events_device_button_received_idx
  ON public.ble_events (ble_device_id, button, received_at DESC);

GRANT SELECT ON public.ble_events TO authenticated;
GRANT ALL ON public.ble_events TO service_role;

ALTER TABLE public.ble_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and directors can view ble events"
  ON public.ble_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'director_monitoreo'::app_role));