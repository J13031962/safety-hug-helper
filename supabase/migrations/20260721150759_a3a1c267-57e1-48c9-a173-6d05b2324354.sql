ALTER TABLE public.alarms DROP CONSTRAINT IF EXISTS alarms_alarm_type_check;
ALTER TABLE public.alarms ADD CONSTRAINT alarms_alarm_type_check
  CHECK (alarm_type IN ('panic', 'medical', 'fire', 'disaster', 'domestic'));