
-- Allow first admin to self-assign if no admins exist
CREATE OR REPLACE FUNCTION public.assign_first_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INT;
BEGIN
  -- Only allow self-assignment of admin role if no admins exist
  IF NEW.role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
    IF admin_count > 0 THEN
      -- If admins exist, only allow if caller is admin (handled by RLS)
      RETURN NEW;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add policy: allow first admin self-assignment when no admins exist
CREATE POLICY "First admin can self-assign" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND role = 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  );
