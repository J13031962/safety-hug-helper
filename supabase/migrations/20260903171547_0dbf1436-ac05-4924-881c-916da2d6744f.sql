DO $$
DECLARE v_cmd text;
BEGIN
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'smartsos-process-relay-jobs';
  IF v_cmd IS NOT NULL THEN
    PERFORM cron.alter_job(
      (SELECT jobid FROM cron.job WHERE jobname = 'smartsos-process-relay-jobs'),
      command := replace(v_cmd, '<junctwbyjtjhwjjioytc>', 'junctwbyjtjhwjjioytc')
    );
  END IF;
END $$;