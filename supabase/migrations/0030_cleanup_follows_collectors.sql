-- supabase/migrations/0030_cleanup_follows_collectors.sql
--
-- The nightly job cleanup must not empty the site when the collectors stop.
--
-- cleanup_old_jobs() deleted jobs not re-seen for 14 days, measured from
-- now(). In October 2026 the collectors stopped running (GitHub refused the
-- scheduled runs) and, two weeks later, the cleanup had deleted every job.
-- A job not being re-seen only means it closed if the collectors were
-- actually running, so age is now measured from the last successful
-- collector run instead of from now(). While the collectors run, that is a
-- few hours ago and nothing changes; when they stop, the clock stops with
-- them and the existing jobs are kept. Same function as 0008 otherwise.
-- Safe to re-run.

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
  -- The reference point: the last time a collector run succeeded (never in
  -- the future, and now() if there is no run history at all).
  v_ref     timestamptz := least(
    now(),
    coalesce((select max(started_at) from public.collector_runs where success), now())
  );
  v_cutoff  timestamptz := v_ref - make_interval(days => p_max_age_days);
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
      where (j.expires_at < v_ref or j.last_seen < v_cutoff)
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

-- Same lock-down as 0008: only the service role and pg_cron may run it.
revoke all on function public.cleanup_old_jobs(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.cleanup_old_jobs(integer, integer, integer) to service_role;
