
-- 1. Create many-to-many table for GPS devices <-> parcels
CREATE TABLE public.gps_device_parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.gps_devices(id) ON DELETE CASCADE,
  parcel_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(device_id, parcel_name)
);

ALTER TABLE public.gps_device_parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view device parcels"
  ON public.gps_device_parcels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Anyone can view device parcels"
  ON public.gps_device_parcels FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins can insert device parcels"
  ON public.gps_device_parcels FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update device parcels"
  ON public.gps_device_parcels FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete device parcels"
  ON public.gps_device_parcels FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Directors can insert device parcels"
  ON public.gps_device_parcels FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'director_monitoreo'::app_role));

CREATE POLICY "Directors can update device parcels"
  ON public.gps_device_parcels FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role));

CREATE POLICY "Directors can delete device parcels"
  ON public.gps_device_parcels FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role));

CREATE POLICY "Public can insert device parcels"
  ON public.gps_device_parcels FOR INSERT
  TO public WITH CHECK (true);

-- 2. Migrate existing data
INSERT INTO public.gps_device_parcels (device_id, parcel_name)
SELECT id, parcel_name FROM public.gps_devices WHERE parcel_name IS NOT NULL;

-- 3. Drop old column
ALTER TABLE public.gps_devices DROP COLUMN parcel_name;

-- 4. Add is_parcel_admin to registered_numbers
ALTER TABLE public.registered_numbers ADD COLUMN is_parcel_admin boolean DEFAULT false;
