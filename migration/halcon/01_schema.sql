-- =====================================================================
-- SmartSOS -> schema `smartsos` en tu proyecto Supabase propio
-- Proyecto destino: junctwbyjtjhwjjioytc
-- Ejecutar COMPLETO en el SQL Editor del proyecto destino.
-- Idempotente: se puede reejecutar.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS smartsos;

GRANT USAGE ON SCHEMA smartsos TO anon, authenticated, service_role;

-- Extensiones necesarias (sirenas programadas / llamadas HTTP desde la BD)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- 1. Enum de roles
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'smartsos'
  ) THEN
    CREATE TYPE smartsos.app_role AS ENUM ('admin', 'operator', 'director_monitoreo', 'supervisor_central');
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------

-- 2.1 Parcelaciones
CREATE TABLE IF NOT EXISTS smartsos.parcels (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL UNIQUE,
  whatsapp_group_id    text,
  whatsapp_invite_link text,
  account_number       text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON smartsos.parcels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.parcels TO authenticated;
GRANT ALL ON smartsos.parcels TO service_role;

-- 2.2 Perfiles de usuario
CREATE TABLE IF NOT EXISTS smartsos.profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON smartsos.profiles TO authenticated;
GRANT ALL ON smartsos.profiles TO service_role;

-- 2.3 Roles (tabla separada: nunca en profiles)
CREATE TABLE IF NOT EXISTS smartsos.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    smartsos.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.user_roles TO authenticated;
GRANT ALL ON smartsos.user_roles TO service_role;

-- 2.4 Asignación de parcelaciones a operadores
CREATE TABLE IF NOT EXISTS smartsos.operator_parcels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parcel_id  uuid NOT NULL REFERENCES smartsos.parcels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, parcel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.operator_parcels TO authenticated;
GRANT ALL ON smartsos.operator_parcels TO service_role;

-- 2.5 Números registrados (identidad por teléfono / PhoneGate)
CREATE TABLE IF NOT EXISTS smartsos.registered_numbers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number     text NOT NULL,
  owner_name       text NOT NULL,
  house_number     text,
  parcel_name      text,
  callmebot_apikey text,
  user_number      text,
  is_parcel_admin  boolean DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS registered_numbers_phone_parcel_unique
  ON smartsos.registered_numbers (phone_number, parcel_name)
  WHERE (phone_number NOT LIKE '%3332840057%');
GRANT SELECT ON smartsos.registered_numbers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.registered_numbers TO authenticated;
GRANT ALL ON smartsos.registered_numbers TO service_role;

-- 2.6 Alarmas
CREATE TABLE IF NOT EXISTS smartsos.alarms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alarm_type   text NOT NULL CHECK (alarm_type IN ('panic','medical','fire','disaster','domestic')),
  phone_number text,
  sender_name  text,
  house_number text,
  parcel_name  text,
  address      text,
  latitude     double precision,
  longitude    double precision,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','resolved')),
  observations text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alarms_created_at_idx ON smartsos.alarms (created_at DESC);
CREATE INDEX IF NOT EXISTS alarms_parcel_name_idx ON smartsos.alarms (parcel_name);
GRANT INSERT ON smartsos.alarms TO anon;
GRANT SELECT, INSERT, UPDATE ON smartsos.alarms TO authenticated;
GRANT ALL ON smartsos.alarms TO service_role;

-- 2.7 Dispositivos GPS (sirenas / relés vía Traccar)
CREATE TABLE IF NOT EXISTS smartsos.gps_devices (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imei                 text NOT NULL UNIQUE,
  name                 text,
  model                text,
  sim_number           text,
  cra_user_number      text,
  relay_duration       integer NOT NULL DEFAULT 30,
  relay_active_until   timestamptz,
  panic_button_enabled boolean NOT NULL DEFAULT false,
  created_by           uuid REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON smartsos.gps_devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.gps_devices TO authenticated;
GRANT ALL ON smartsos.gps_devices TO service_role;

-- 2.8 Relación dispositivo GPS <-> parcelación
CREATE TABLE IF NOT EXISTS smartsos.gps_device_parcels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   uuid NOT NULL REFERENCES smartsos.gps_devices(id) ON DELETE CASCADE,
  parcel_name text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (device_id, parcel_name)
);
GRANT SELECT ON smartsos.gps_device_parcels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.gps_device_parcels TO authenticated;
GRANT ALL ON smartsos.gps_device_parcels TO service_role;

-- 2.9 Trabajos de apagado de sirena
CREATE TABLE IF NOT EXISTS smartsos.gps_relay_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imei              text NOT NULL,
  device_id_traccar integer NOT NULL,
  action            text NOT NULL DEFAULT 'engineResume',
  status            text NOT NULL DEFAULT 'pending',
  execute_at        timestamptz NOT NULL,
  completed_at      timestamptz,
  error_message     text,
  alarm_id          uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relay_jobs_pending
  ON smartsos.gps_relay_jobs (status, execute_at) WHERE status = 'pending';
GRANT INSERT ON smartsos.gps_relay_jobs TO anon;
GRANT SELECT, INSERT ON smartsos.gps_relay_jobs TO authenticated;
GRANT ALL ON smartsos.gps_relay_jobs TO service_role;

-- 2.10 Dispositivos BLE (botones físicos vía app móvil)
CREATE TABLE IF NOT EXISTS smartsos.ble_devices (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id            text NOT NULL UNIQUE,
  device_identifier    text,
  manufacturer         text,
  model                text,
  profile              text,
  name                 text,
  phone_number         text,
  registered_number_id uuid REFERENCES smartsos.registered_numbers(id) ON DELETE SET NULL,
  parcel_id            uuid NOT NULL REFERENCES smartsos.parcels(id) ON DELETE CASCADE,
  enabled              boolean NOT NULL DEFAULT false,
  token_hash           text,
  last_seen_at         timestamptz,
  battery              integer,
  rssi                 integer,
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ble_devices_device_identifier_key
  ON smartsos.ble_devices (lower(device_identifier)) WHERE device_identifier IS NOT NULL;
CREATE INDEX IF NOT EXISTS ble_devices_parcel_id_idx ON smartsos.ble_devices (parcel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON smartsos.ble_devices TO authenticated;
GRANT ALL ON smartsos.ble_devices TO service_role;

-- 2.11 Eventos BLE (auditoría + deduplicación)
CREATE TABLE IF NOT EXISTS smartsos.ble_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      text NOT NULL UNIQUE,
  ble_device_id uuid REFERENCES smartsos.ble_devices(id) ON DELETE SET NULL,
  button        text NOT NULL,
  alarm_id      uuid REFERENCES smartsos.alarms(id) ON DELETE SET NULL,
  pressed_at    timestamptz,
  received_at   timestamptz NOT NULL DEFAULT now(),
  payload       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ble_events_device_button_received_idx
  ON smartsos.ble_events (ble_device_id, button, received_at DESC);
GRANT SELECT ON smartsos.ble_events TO authenticated;
GRANT ALL ON smartsos.ble_events TO service_role;

-- ---------------------------------------------------------------------
-- 3. Funciones
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION smartsos.has_role(_user_id uuid, _role smartsos.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = smartsos, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM smartsos.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION smartsos.operator_parcel_names(_user_id uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = smartsos, public
AS $$
  SELECT p.name
  FROM smartsos.operator_parcels op
  JOIN smartsos.parcels p ON p.id = op.parcel_id
  WHERE op.user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION smartsos.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = smartsos, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_ble_devices_updated_at ON smartsos.ble_devices;
CREATE TRIGGER update_ble_devices_updated_at
  BEFORE UPDATE ON smartsos.ble_devices
  FOR EACH ROW EXECUTE FUNCTION smartsos.update_updated_at_column();

-- Crea el perfil al registrarse un usuario en Auth
CREATE OR REPLACE FUNCTION smartsos.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = smartsos, public
AS $$
BEGIN
  INSERT INTO smartsos.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- IMPORTANTE: este trigger vive en el schema auth y necesita rol privilegiado.
-- Si el SQL Editor lo rechaza, créalo desde el dashboard con el owner del proyecto.
DROP TRIGGER IF EXISTS on_auth_user_created_smartsos ON auth.users;
CREATE TRIGGER on_auth_user_created_smartsos
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION smartsos.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------
ALTER TABLE smartsos.parcels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.operator_parcels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.registered_numbers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.alarms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.gps_devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.gps_device_parcels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.gps_relay_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.ble_devices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartsos.ble_events          ENABLE ROW LEVEL SECURITY;

-- parcels
DROP POLICY IF EXISTS "Anyone can view parcels" ON smartsos.parcels;
CREATE POLICY "Anyone can view parcels" ON smartsos.parcels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage parcels" ON smartsos.parcels;
CREATE POLICY "Admins can manage parcels" ON smartsos.parcels FOR ALL TO authenticated
  USING (smartsos.has_role(auth.uid(),'admin')) WITH CHECK (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Directors can manage parcels" ON smartsos.parcels;
CREATE POLICY "Directors can manage parcels" ON smartsos.parcels FOR ALL TO authenticated
  USING (smartsos.has_role(auth.uid(),'director_monitoreo')) WITH CHECK (smartsos.has_role(auth.uid(),'director_monitoreo'));

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON smartsos.profiles;
CREATE POLICY "Users can view all profiles" ON smartsos.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON smartsos.profiles;
CREATE POLICY "Users can insert own profile" ON smartsos.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON smartsos.profiles;
CREATE POLICY "Users can update own profile" ON smartsos.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Authenticated can view roles" ON smartsos.user_roles;
CREATE POLICY "Authenticated can view roles" ON smartsos.user_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can insert roles" ON smartsos.user_roles;
CREATE POLICY "Admins can insert roles" ON smartsos.user_roles FOR INSERT TO authenticated WITH CHECK (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can update roles" ON smartsos.user_roles;
CREATE POLICY "Admins can update roles" ON smartsos.user_roles FOR UPDATE TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can delete roles" ON smartsos.user_roles;
CREATE POLICY "Admins can delete roles" ON smartsos.user_roles FOR DELETE TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Directors can insert roles" ON smartsos.user_roles;
CREATE POLICY "Directors can insert roles" ON smartsos.user_roles FOR INSERT TO authenticated WITH CHECK (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "Directors can update roles" ON smartsos.user_roles;
CREATE POLICY "Directors can update roles" ON smartsos.user_roles FOR UPDATE TO authenticated USING (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "Directors can delete roles" ON smartsos.user_roles;
CREATE POLICY "Directors can delete roles" ON smartsos.user_roles FOR DELETE TO authenticated USING (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "First admin can self-assign" ON smartsos.user_roles;
CREATE POLICY "First admin can self-assign" ON smartsos.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'admin'
    AND NOT EXISTS (SELECT 1 FROM smartsos.user_roles ur WHERE ur.role = 'admin'));

-- operator_parcels
DROP POLICY IF EXISTS "Operators read own assignments" ON smartsos.operator_parcels;
CREATE POLICY "Operators read own assignments" ON smartsos.operator_parcels FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage operator parcels" ON smartsos.operator_parcels;
CREATE POLICY "Admins manage operator parcels" ON smartsos.operator_parcels FOR ALL TO authenticated
  USING (smartsos.has_role(auth.uid(),'admin') OR smartsos.has_role(auth.uid(),'director_monitoreo'))
  WITH CHECK (smartsos.has_role(auth.uid(),'admin') OR smartsos.has_role(auth.uid(),'director_monitoreo'));

-- registered_numbers
DROP POLICY IF EXISTS "Anyone can view registered numbers" ON smartsos.registered_numbers;
CREATE POLICY "Anyone can view registered numbers" ON smartsos.registered_numbers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert numbers" ON smartsos.registered_numbers;
CREATE POLICY "Admins can insert numbers" ON smartsos.registered_numbers FOR INSERT TO authenticated WITH CHECK (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can update numbers" ON smartsos.registered_numbers;
CREATE POLICY "Admins can update numbers" ON smartsos.registered_numbers FOR UPDATE TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can delete numbers" ON smartsos.registered_numbers;
CREATE POLICY "Admins can delete numbers" ON smartsos.registered_numbers FOR DELETE TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Directors can insert numbers" ON smartsos.registered_numbers;
CREATE POLICY "Directors can insert numbers" ON smartsos.registered_numbers FOR INSERT TO authenticated WITH CHECK (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "Directors can update numbers" ON smartsos.registered_numbers;
CREATE POLICY "Directors can update numbers" ON smartsos.registered_numbers FOR UPDATE TO authenticated USING (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "Directors can delete numbers" ON smartsos.registered_numbers;
CREATE POLICY "Directors can delete numbers" ON smartsos.registered_numbers FOR DELETE TO authenticated USING (smartsos.has_role(auth.uid(),'director_monitoreo'));

-- alarms
DROP POLICY IF EXISTS "Anyone can insert alarms" ON smartsos.alarms;
CREATE POLICY "Anyone can insert alarms" ON smartsos.alarms FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "View alarms by role/parcel" ON smartsos.alarms;
CREATE POLICY "View alarms by role/parcel" ON smartsos.alarms FOR SELECT TO authenticated
  USING (
    smartsos.has_role(auth.uid(),'admin')
    OR smartsos.has_role(auth.uid(),'director_monitoreo')
    OR smartsos.has_role(auth.uid(),'supervisor_central')
    OR (smartsos.has_role(auth.uid(),'operator')
        AND parcel_name IN (SELECT smartsos.operator_parcel_names(auth.uid())))
  );
DROP POLICY IF EXISTS "Operators and admins can update alarms" ON smartsos.alarms;
CREATE POLICY "Operators and admins can update alarms" ON smartsos.alarms FOR UPDATE TO authenticated
  USING (
    smartsos.has_role(auth.uid(),'admin')
    OR smartsos.has_role(auth.uid(),'operator')
    OR smartsos.has_role(auth.uid(),'director_monitoreo')
    OR smartsos.has_role(auth.uid(),'supervisor_central')
  );

-- gps_devices
DROP POLICY IF EXISTS "Anyone can view devices" ON smartsos.gps_devices;
CREATE POLICY "Anyone can view devices" ON smartsos.gps_devices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert devices" ON smartsos.gps_devices;
CREATE POLICY "Admins can insert devices" ON smartsos.gps_devices FOR INSERT TO authenticated WITH CHECK (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can update devices" ON smartsos.gps_devices;
CREATE POLICY "Admins can update devices" ON smartsos.gps_devices FOR UPDATE TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can delete devices" ON smartsos.gps_devices;
CREATE POLICY "Admins can delete devices" ON smartsos.gps_devices FOR DELETE TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Directors can insert devices" ON smartsos.gps_devices;
CREATE POLICY "Directors can insert devices" ON smartsos.gps_devices FOR INSERT TO authenticated WITH CHECK (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "Directors can update devices" ON smartsos.gps_devices;
CREATE POLICY "Directors can update devices" ON smartsos.gps_devices FOR UPDATE TO authenticated USING (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "Directors can delete devices" ON smartsos.gps_devices;
CREATE POLICY "Directors can delete devices" ON smartsos.gps_devices FOR DELETE TO authenticated USING (smartsos.has_role(auth.uid(),'director_monitoreo'));

-- gps_device_parcels
DROP POLICY IF EXISTS "Anyone can view device parcels" ON smartsos.gps_device_parcels;
CREATE POLICY "Anyone can view device parcels" ON smartsos.gps_device_parcels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert device parcels" ON smartsos.gps_device_parcels;
CREATE POLICY "Admins can insert device parcels" ON smartsos.gps_device_parcels FOR INSERT TO authenticated WITH CHECK (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can update device parcels" ON smartsos.gps_device_parcels;
CREATE POLICY "Admins can update device parcels" ON smartsos.gps_device_parcels FOR UPDATE TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can delete device parcels" ON smartsos.gps_device_parcels;
CREATE POLICY "Admins can delete device parcels" ON smartsos.gps_device_parcels FOR DELETE TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Directors can insert device parcels" ON smartsos.gps_device_parcels;
CREATE POLICY "Directors can insert device parcels" ON smartsos.gps_device_parcels FOR INSERT TO authenticated WITH CHECK (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "Directors can update device parcels" ON smartsos.gps_device_parcels;
CREATE POLICY "Directors can update device parcels" ON smartsos.gps_device_parcels FOR UPDATE TO authenticated USING (smartsos.has_role(auth.uid(),'director_monitoreo'));
DROP POLICY IF EXISTS "Directors can delete device parcels" ON smartsos.gps_device_parcels;
CREATE POLICY "Directors can delete device parcels" ON smartsos.gps_device_parcels FOR DELETE TO authenticated USING (smartsos.has_role(auth.uid(),'director_monitoreo'));

-- gps_relay_jobs
DROP POLICY IF EXISTS "Public can insert relay jobs" ON smartsos.gps_relay_jobs;
CREATE POLICY "Public can insert relay jobs" ON smartsos.gps_relay_jobs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view relay jobs" ON smartsos.gps_relay_jobs;
CREATE POLICY "Admins can view relay jobs" ON smartsos.gps_relay_jobs FOR SELECT TO authenticated USING (smartsos.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Service role full access" ON smartsos.gps_relay_jobs;
CREATE POLICY "Service role full access" ON smartsos.gps_relay_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ble_devices
DROP POLICY IF EXISTS "Authenticated can view ble devices" ON smartsos.ble_devices;
CREATE POLICY "Authenticated can view ble devices" ON smartsos.ble_devices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins and directors manage ble devices" ON smartsos.ble_devices;
CREATE POLICY "Admins and directors manage ble devices" ON smartsos.ble_devices FOR ALL TO authenticated
  USING (smartsos.has_role(auth.uid(),'admin') OR smartsos.has_role(auth.uid(),'director_monitoreo'))
  WITH CHECK (smartsos.has_role(auth.uid(),'admin') OR smartsos.has_role(auth.uid(),'director_monitoreo'));

-- ble_events
DROP POLICY IF EXISTS "Admins and directors can view ble events" ON smartsos.ble_events;
CREATE POLICY "Admins and directors can view ble events" ON smartsos.ble_events FOR SELECT TO authenticated
  USING (smartsos.has_role(auth.uid(),'admin') OR smartsos.has_role(auth.uid(),'director_monitoreo'));

-- ---------------------------------------------------------------------
-- 5. Exponer el schema en la Data API
-- Dashboard -> Project Settings -> API -> Exposed schemas: añadir `smartsos`.
-- (No se puede hacer por SQL.)
-- ---------------------------------------------------------------------
