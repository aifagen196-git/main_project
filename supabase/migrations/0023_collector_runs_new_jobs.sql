-- supabase/migrations/0023_collector_runs_new_jobs.sql
--
-- Collector runs now record how many jobs they saved (refreshed or added) and
-- how many were brand new, counted from the jobs table after each run (see
-- the collectors repo, collectors/runLog.js). `saved` already exists; this
-- adds the new-jobs count. Safe to re-run.

alter table public.collector_runs add column if not exists new_jobs integer;
