
-- Fix alarms UPDATE policy to restrict to operators/admins only
DROP POLICY "Authenticated can update alarms" ON public.alarms;
CREATE POLICY "Operators and admins can update alarms" ON public.alarms 
  FOR UPDATE TO authenticated 
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'operator') OR 
    public.has_role(auth.uid(), 'director_monitoreo') OR 
    public.has_role(auth.uid(), 'supervisor_central')
  );
