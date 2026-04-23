ALTER TABLE public.gps_devices
ADD COLUMN panic_button_enabled BOOLEAN NOT NULL DEFAULT false;