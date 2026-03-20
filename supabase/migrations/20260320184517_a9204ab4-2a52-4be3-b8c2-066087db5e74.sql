
-- gps_devices: director_monitoreo can insert, update, delete
CREATE POLICY "Directors can insert devices" ON public.gps_devices FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'director_monitoreo'::app_role));
CREATE POLICY "Directors can update devices" ON public.gps_devices FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role));
CREATE POLICY "Directors can delete devices" ON public.gps_devices FOR DELETE TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role));

-- parcels: director_monitoreo can manage
CREATE POLICY "Directors can manage parcels" ON public.parcels FOR ALL TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role)) WITH CHECK (has_role(auth.uid(), 'director_monitoreo'::app_role));

-- user_roles: director_monitoreo can insert, update, delete
CREATE POLICY "Directors can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'director_monitoreo'::app_role));
CREATE POLICY "Directors can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role));
CREATE POLICY "Directors can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role));

-- registered_numbers: director_monitoreo can insert, update, delete
CREATE POLICY "Directors can insert numbers" ON public.registered_numbers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'director_monitoreo'::app_role));
CREATE POLICY "Directors can update numbers" ON public.registered_numbers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role));
CREATE POLICY "Directors can delete numbers" ON public.registered_numbers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'director_monitoreo'::app_role));
