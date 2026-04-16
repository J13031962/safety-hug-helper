
-- Add public SELECT policy to gps_devices
CREATE POLICY "Anyone can view devices"
ON public.gps_devices
FOR SELECT
TO public
USING (true);

-- Add name column
ALTER TABLE public.gps_devices ADD COLUMN name text;
