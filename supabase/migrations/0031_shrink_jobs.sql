-- supabase/migrations/0031_shrink_jobs.sql
--
-- The free plan allows 500 MB and the jobs table was 432 MB of it
-- (2026-11-06). This migration:
--   1. drops the trigram index on jobs.description (84 MB, including a
--      leftover "_ccnew" copy from an interrupted rebuild). It is also why
--      collector saves time out: every write re-indexes the whole description.
--   2. deletes hidden jobs (is_active = false) that no user saved or applied
--      to (7,022 rows on 2026-11-06). Users never see them.
--   3. caps stored descriptions at 8,000 characters, now and for every future
--      insert/update, whatever collector writes the row.
--   4. adds a full-text index on the description, which is much smaller.
--      Keyword search (backend searchJobs) now matches descriptions by whole
--      words (all of them, not as a phrase) through this index; title and company keep their trigram
--      indexes for partial matches.
--
-- Run it in the Supabase SQL Editor. Steps 2 and 3 rewrite many rows and can
-- take a few minutes. Afterwards run, ON ITS OWN and at a quiet time:
--     vacuum full public.jobs;
-- Without that, Postgres keeps the freed space inside the table and the
-- dashboard size does not drop. It locks the jobs table while it runs
-- (a few minutes); nothing else is affected.

-- 1. Description trigram index, and the leftover copy if present.
drop index if exists public.jobs_description_trgm_idx_ccnew;
drop index if exists public.jobs_description_trgm_idx;

-- 2. Hidden jobs nobody references.
delete from public.jobs j
where j.is_active = false
  and not exists (select 1 from public.saved_jobs s where s.job_id = j.id)
  and not exists (select 1 from public.applications a where a.job_id = j.id);

-- 3. Cap descriptions at 8,000 characters.
create or replace function public.jobs_cap_description()
returns trigger
language plpgsql
as $$
begin
  if new.description is not null and length(new.description) > 8000 then
    new.description := left(new.description, 8000);
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_cap_description on public.jobs;
create trigger jobs_cap_description
  before insert or update of description on public.jobs
  for each row execute function public.jobs_cap_description();

update public.jobs
set description = left(description, 8000)
where length(description) > 8000;

-- 4. Full-text index. The expression must match what PostgREST's
-- `description.wfts(english).<words>` filter generates, or it is not used.
create index if not exists jobs_description_fts_idx
  on public.jobs using gin (to_tsvector('english', description));
