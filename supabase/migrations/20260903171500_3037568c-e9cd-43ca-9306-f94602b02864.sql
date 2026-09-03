DO $$
DECLARE r bigint;
BEGIN
  SELECT net.http_post(
    url := 'https://junctwbyjtjhwjjioytc.supabase.co/functions/v1/process-relay-jobs',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"source":"pgnet-test"}'::jsonb
  ) INTO r;
  RAISE NOTICE 'pg_net request id %', r;
END $$;