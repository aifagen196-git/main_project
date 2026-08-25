-- supabase/migrations/0011_schedule_job_cleanup.sql
--
-- Turns on the 14-day retention policy that 0008_job_retention.sql already
-- built (cleanup_old_jobs()/preview_job_cleanup()) but deliberately left
-- unscheduled pending a manual review of the preview counts. That review
-- has now happened — this just flips it on.
--
-- Deletes by last_seen (a job not re-confirmed by its source in 14 days),
-- not by created_at/insertion date — a job still open and reconfirmed by a
-- collector every run survives indefinitely; only postings that genuinely
-- disappeared get purged. Still-referenced jobs (saved_jobs/applications)
-- are still protected regardless of age — see 0008's own header for the
-- full reasoning and the live counts this was checked against.
--
-- Safe to run more than once: unschedules before scheduling, so re-running
-- this file doesn't stack duplicate cron jobs.

create extension if not exists pg_cron;

-- Nightly at 03:15 UTC.
select cron.unschedule('cleanup-old-jobs')
  where exists (select 1 from cron.job where jobname = 'cleanup-old-jobs');

select cron.schedule(
  'cleanup-old-jobs',
  '15 3 * * *',
  $cron$ select public.cleanup_old_jobs(14); $cron$
);

-- Inspect the schedule / history after this runs:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
