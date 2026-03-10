
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'director_monitoreo', 'supervisor_central');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create alarms table
CREATE TABLE public.alarms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alarm_type TEXT NOT NULL CHECK (alarm_type IN ('panic', 'medical', 'fire', 'disaster')),
  phone_number TEXT,
  sender_name TEXT,
  house_number TEXT,
  parcel_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed')),
  observations TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create registered_numbers table
CREATE TABLE public.registered_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  house_number TEXT,
  parcel_name TEXT,
  callmebot_apikey TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gps_devices table
CREATE TABLE public.gps_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  imei TEXT NOT NULL UNIQUE,
  model TEXT,
  sim_number TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registered_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_devices ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Alarms policies
CREATE POLICY "Anyone can insert alarms" ON public.alarms FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view alarms" ON public.alarms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update alarms" ON public.alarms FOR UPDATE TO authenticated USING (true);

-- Registered numbers policies
CREATE POLICY "Anyone can view registered numbers" ON public.registered_numbers FOR SELECT USING (true);
CREATE POLICY "Admins can insert numbers" ON public.registered_numbers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update numbers" ON public.registered_numbers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete numbers" ON public.registered_numbers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- GPS devices policies
CREATE POLICY "Authenticated can view devices" ON public.gps_devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert devices" ON public.gps_devices FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update devices" ON public.gps_devices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete devices" ON public.gps_devices FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for first admin setup
CREATE OR REPLACE FUNCTION public.setup_first_admin(_email TEXT, _password TEXT, _full_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RETURN json_build_object('error', 'Admin already exists');
  END IF;
  RETURN json_build_object('message', 'Use signup endpoint to create first admin');
END;
$$;
