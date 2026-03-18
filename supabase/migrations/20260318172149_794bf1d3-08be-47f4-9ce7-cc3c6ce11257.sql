
CREATE TABLE public.gps_relay_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imei text NOT NULL,
  device_id_traccar integer NOT NULL,
  action text NOT NULL DEFAULT 'engineResume',
  status text NOT NULL DEFAULT 'pending',
  execute_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  error_message text,
  alarm_id uuid
);

CREATE INDEX idx_relay_jobs_pending ON public.gps_relay_jobs (status, execute_at) WHERE status = 'pending';

ALTER TABLE public.gps_relay_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.gps_relay_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view relay jobs" ON public.gps_relay_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can insert relay jobs" ON public.gps_relay_jobs FOR INSERT TO public WITH CHECK (true);
