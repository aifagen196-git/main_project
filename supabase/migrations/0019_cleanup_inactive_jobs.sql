-- supabase/migrations/0019_cleanup_inactive_jobs.sql
--
-- Clears deactivated listings, which 0008's retention policy never touches.
--
-- WHY THE EXISTING POLICY LEAVES THEM
-- -----------------------------------
-- cleanup_old_jobs() deletes on `expires_at < now OR last_seen < cutoff`.
-- Neither test looks at is_active, so a row the collectors deactivated but saw
-- recently survives until its last_seen ages past the 14-day cutoff. Measured
-- against live data: 88,789 rows, 15,722 of them is_active = false, but only
-- 1,243 eligible for deletion — 13,744 of the inactive ones had been seen
-- within the last 7 days and so were not yet in scope.
--
-- Deactivated rows are already hidden from users, so holding them for another
-- fortnight buys nothing. This adds a separate, shorter window for them while
-- leaving the live-job policy alone.
--
-- p_inactive_days defaults to 3 rather than 0 so a collector that deactivates
-- a job by mistake (a flaky fetch, a transient 404) has a window to re-confirm
-- it on the next run before the row is destroyed.
--
-- USER DATA IS STILL PROTECTED — the saved_jobs / applications guard from 0008
-- applies here unchanged: a posting someone saved or applied to is user data,
-- not collector cache, however stale it is.
--
-- DESTRUCTIVE. Run `select * from public.preview_inactive_job_cleanup();`
-- first and read the counts before scheduling anything.

-- ---------------------------------------------------------------- preview
create or replace function public.preview_inactive_job_cleanup(
  p_inactive_days integer default 3
)
returns table (reason text, row_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with doomed as (
    select j.id,
           exists (select 1 from public.saved_jobs s where s.job_id = j.id)
        or exists (select 1 from public.applications a where a.job_id = j.id)
             as referenced
    from public.jobs j
    where j.is_active = false
      and j.last_seen < now() - make_interval(days => p_inactive_days)
  )
  select 'inactive jobs (all)'::text,
         count(*) from public.jobs where is_active = false
  union all
  select format('inactive for %s+ days', p_inactive_days)::text,
         count(*) from doomed
  union all
  select 'of those, KEPT (saved/applied by a user)'::text,
         count(*) from doomed where referenced
  union all
  select 'TOTAL to be deleted'::text,
         count(*) from doomed where not referenced
  union all
  select 'surviving rows'::text,
         (select count(*) from public.jobs)
         - (select count(*) from doomed where not referenced);
$$;

-- ---------------------------------------------------------------- cleanup
-- Batched for the same reason as cleanup_old_jobs(): one large DELETE of rows
-- carrying full job descriptions trips this database's statement_timeout.
create or replace function public.cleanup_inactive_jobs(
  p_inactive_days integer default 3,
  p_batch_size    integer default 1000,
  p_max_batches   integer default 200
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff  timestamptz := now() - make_interval(days => p_inactive_days);
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
      where j.is_active = false
        and j.last_seen < v_cutoff
        and not exists (select 1 from public.saved_jobs s where s.job_id = j.id)
        and not exists (select 1 from public.applications a where a.job_id = j.id)
      limit p_batch_size
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

comment on function public.cleanup_inactive_jobs is
  'Hard-deletes jobs with is_active = false whose last_seen is older than p_inactive_days, skipping any referenced by saved_jobs/applications. Complements cleanup_old_jobs(), which ignores is_active. Returns rows deleted.';

-- The is_active = false / last_seen predicate has no matching index; without
-- one each run sequentially scans the whole table.
create index if not exists jobs_inactive_last_seen_idx
  on public.jobs (last_seen) where is_active = false;

-- ------------------------------------------------------------- privileges
-- Both are SECURITY DEFINER in `public`, so PostgREST would otherwise expose
-- them as RPCs any logged-in user could call to delete the jobs table.
revoke all on function public.cleanup_inactive_jobs(integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.preview_inactive_job_cleanup(integer)
  from public, anon, authenticated;

grant execute on function public.cleanup_inactive_jobs(integer, integer, integer)
  to service_role;
grant execute on function public.preview_inactive_job_cleanup(integer)
  to service_role;

-- ---------------------------------------------------------------- schedule
-- Runs 20 minutes after cleanup-old-jobs (0017) so the two never overlap.
-- Uncomment AFTER running preview_inactive_job_cleanup() and agreeing with
-- the counts.

-- select cron.unschedule('cleanup-inactive-jobs')
--   where exists (select 1 from cron.job where jobname = 'cleanup-inactive-jobs');
-- select cron.schedule(
--   'cleanup-inactive-jobs',
--   '35 3 * * *',
--   $cron$ select public.cleanup_inactive_jobs(3); $cron$
-- );
