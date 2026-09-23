-- supabase/migrations/0017_enable_job_cleanup_cron.sql
--
-- Enables the nightly cleanup that 0008_job_retention.sql created but left
-- commented out. Confirmed via public.preview_job_cleanup() before writing
-- this: the retention logic is correct and safe (protects saved/applied
-- jobs), it was simply never scheduled — nothing has been auto-deleting.

create extension if not exists pg_cron;

select cron.unschedule('cleanup-old-jobs')
  where exists (select 1 from cron.job where jobname = 'cleanup-old-jobs');

select cron.schedule(
  'cleanup-old-jobs',
  '15 3 * * *',
  $cron$ select public.cleanup_old_jobs(14); $cron$
);
