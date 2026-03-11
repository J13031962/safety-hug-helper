
CREATE TABLE public.parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  whatsapp_group_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Admins full CRUD
CREATE POLICY "Admins can manage parcels" ON public.parcels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can view parcels (needed for alarm sending)
CREATE POLICY "Anyone can view parcels" ON public.parcels
  FOR SELECT TO public
  USING (true);

-- Seed existing parcel from registered_numbers
INSERT INTO public.parcels (name, whatsapp_group_id)
SELECT DISTINCT parcel_name, NULL
FROM public.registered_numbers
WHERE parcel_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Update the known group
UPDATE public.parcels SET whatsapp_group_id = '120363407230255450@g.us' WHERE name = 'Hacienda San Sebastian';
