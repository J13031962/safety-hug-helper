DO $$
DECLARE
  v_id bigint;
  v_cmd text;
BEGIN
  SELECT jobid, command INTO v_id, v_cmd FROM cron.job WHERE jobname = 'smartsos-process-relay-jobs';
  IF v_id IS NOT NULL THEN
    PERFORM cron.alter_job(v_id, command := replace(v_cmd, 'extensions.http_post', 'net.http_post'));
  END IF;
END $$;