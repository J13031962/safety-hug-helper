
-- Operator-to-parcel assignment table
CREATE TABLE public.operator_parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, parcel_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_parcels TO authenticated;
GRANT ALL ON public.operator_parcels TO service_role;

ALTER TABLE public.operator_parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage operator parcels"
  ON public.operator_parcels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director_monitoreo'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'director_monitoreo'));

CREATE POLICY "Operators read own assignments"
  ON public.operator_parcels FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Helper: parcel names assigned to an operator
CREATE OR REPLACE FUNCTION public.operator_parcel_names(_user_id uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name
  FROM public.operator_parcels op
  JOIN public.parcels p ON p.id = op.parcel_id
  WHERE op.user_id = _user_id
$$;

-- Replace alarms SELECT policy with parcel-aware rule
DROP POLICY IF EXISTS "Authenticated can view alarms" ON public.alarms;

CREATE POLICY "View alarms by role/parcel"
  ON public.alarms FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'director_monitoreo')
    OR public.has_role(auth.uid(), 'supervisor_central')
    OR (
      public.has_role(auth.uid(), 'operator')
      AND parcel_name IN (SELECT public.operator_parcel_names(auth.uid()))
    )
  );
