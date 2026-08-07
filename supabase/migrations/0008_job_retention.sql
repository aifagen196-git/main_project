-- supabase/migrations/0008_job_retention.sql
--
-- Retention policy for public.jobs: hard-delete postings that are expired or
-- that the collectors have stopped seeing, on a nightly schedule.
--
-- WHY last_seen AND NOT created_at
-- --------------------------------
-- The obvious reading of "delete jobs older than 14 days" is
-- `created_at < now() - 14 days`. Measured against live data that deletes
-- 14,533 rows — but 532 of them are still is_active with a last_seen inside
-- the past week. Those are OPEN postings that the collectors re-confirm every
-- run; a job that stays open for two months is not stale, it is popular.
-- Deleting them would drop live jobs off the site until the next collection,
-- and reset created_at so the true first-seen date is lost forever.
--
-- last_seen is the correct age signal: it is refreshed on every upsert, so
-- "not seen in 14 days" means the posting genuinely disappeared from its
-- board. That targets 10,614 rows and leaves every live posting alone.
--
-- To switch to strict created_at semantics anyway, change the OR clause in
-- cleanup_old_jobs() from `last_seen < v_cutoff` to `created_at < v_cutoff`.
--
-- USER DATA IS PROTECTED
-- ----------------------
-- saved_jobs.job_id is `on delete cascade` and applications.job_id is
-- `on delete set null`. Deleting a job therefore silently destroys every
-- user's bookmark of it, and blanks out which job an application was for.
-- (Checked against live data: 1 of the 2 existing applications points at a
-- job this policy would have deleted.) So the cleanup explicitly SKIPS any
-- job referenced by saved_jobs or applications, no matter how stale it is.
-- A posting a user saved or applied to is user data, not collector cache.
--
-- DESTRUCTIVE: this DELETEs rows. Run `select * from public.preview_job_cleanup();`
-- first to see the counts before scheduling anything.

-- ---------------------------------------------------------------- indexes
-- jobs_active_expires_idx (is_active, expires_at) already exists from 0000.
-- The delete predicate also filters on last_seen, which has no index yet:
-- without one every nightly run sequentially scans the whole table.
create index if not exists jobs_last_seen_idx
  on public.jobs (last_seen);

-- The referential guard looks these up BY job_id, but both tables are
-- indexed only on user_id (their PK/index leading column), so without these
-- each batch would sequentially scan them.
create index if not exists saved_jobs_job_idx
  on public.saved_jobs (job_id);
create index if not exists applications_job_idx
  on public.applications (job_id);

-- ---------------------------------------------------------------- preview
-- Read-only. Always run this before enabling the cron job.
create or replace function public.preview_job_cleanup(
  p_max_age_days integer default 14
)
returns table (
  reason text,
  row_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with stale as (
    select id,
           exists (select 1 from public.saved_jobs s where s.job_id = j.id)
        or exists (select 1 from public.applications a where a.job_id = j.id)
             as referenced
    from public.jobs j
    where j.expires_at < now()
       or j.last_seen  < now() - make_interval(days => p_max_age_days)
  )
  select 'expired (expires_at < now)'::text,
         count(*) from public.jobs where expires_at < now()
  union all
  select format('unseen for %s+ days', p_max_age_days)::text,
         count(*) from public.jobs
         where last_seen < now() - make_interval(days => p_max_age_days)
  union all
  select 'stale but KEPT (saved/applied by a user)'::text,
         count(*) from stale where referenced
  union all
  select 'TOTAL to be deleted'::text,
         count(*) from stale where not referenced
  union all
  select 'surviving rows'::text,
         (select count(*) from public.jobs)
         - (select count(*) from stale where not referenced);
$$;

-- ---------------------------------------------------------------- cleanup
-- Deletes in bounded batches. A single DELETE of ~20k rows carrying full job
-- descriptions trips this database's statement_timeout — the same limit that
-- intermittently kills 100-row upserts from the collectors. Batching keeps
-- each statement small and makes a timeout cost one batch, not the whole run.
create or replace function public.cleanup_old_jobs(
  p_max_age_days integer default 14,
  p_batch_size   integer default 1000,
  p_max_batches  integer default 200
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff  timestamptz := now() - make_interval(days => p_max_age_days);
  v_deleted integer := 0;
  v_batch   integer;
  v_i       integer := 0;
begin
  loop
    v_i := v_i + 1;
    exit when v_i > p_max_batches;

    with doomed as (
      select j.id
      from public.jobs j
      where (j.expires_at < now() or j.last_seen < v_cutoff)
        -- Never delete a posting a user saved or applied to: the FKs would
        -- cascade the bookmark away / null out the application's job_id.
        and not exists (select 1 from public.saved_jobs s where s.job_id = j.id)
        and not exists (select 1 from public.applications a where a.job_id = j.id)
      limit p_batch_size
      -- skip locked: never block (or get blocked by) a collector upsert
      -- touching the same row mid-run.
      for update skip locked
    )
    delete from public.jobs j
    using doomed d
    where j.id = d.id;

    get diagnostics v_batch = ROW_COUNT;
    v_deleted := v_deleted + v_batch;
    exit when v_batch = 0;
  end loop;

  return v_deleted;
end;
$$;

comment on function public.cleanup_old_jobs is
  'Hard-deletes expired jobs and jobs not seen in p_max_age_days, skipping jobs referenced by saved_jobs/applications. Batched to stay under statement_timeout. Returns rows deleted.';

-- ------------------------------------------------------------- privileges
-- Both functions are SECURITY DEFINER and live in `public`, so PostgREST
-- would otherwise expose them as RPC endpoints that any anon/authenticated
-- caller could invoke — letting a logged-in user delete the jobs table at
-- will. Postgres also grants EXECUTE to PUBLIC on new functions by default.
-- Lock them down to the service role and pg_cron (which runs as the owner).
revoke all on function public.cleanup_old_jobs(integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.preview_job_cleanup(integer)
  from public, anon, authenticated;

grant execute on function public.cleanup_old_jobs(integer, integer, integer)
  to service_role;
grant execute on function public.preview_job_cleanup(integer)
  to service_role;

-- ---------------------------------------------------------------- schedule
-- pg_cron runs inside the database, so no external scheduler is needed.
-- Supabase ships it; enable it once (Dashboard > Database > Extensions, or
-- the statement below). Uncomment the schedule call AFTER you have run
-- preview_job_cleanup() and are happy with the counts.

-- create extension if not exists pg_cron;

-- Nightly at 03:15 UTC. Unschedule first so re-running this migration does
-- not stack duplicate jobs.
-- select cron.unschedule('cleanup-old-jobs')
--   where exists (select 1 from cron.job where jobname = 'cleanup-old-jobs');
-- select cron.schedule(
--   'cleanup-old-jobs',
--   '15 3 * * *',
--   $cron$ select public.cleanup_old_jobs(14); $cron$
-- );

-- Inspect the schedule / history:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
