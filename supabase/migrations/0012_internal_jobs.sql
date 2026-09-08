-- supabase/migrations/0012_internal_jobs.sql
--
-- Jobs added by hand (via the not-yet-built admin page) rather than
-- discovered by the job-engine collectors. Deliberately a separate table
-- from `public.jobs` — that table is the scraped-job pool keyed on
-- (source, source_job_id) with matching/profile columns the AI matcher
-- populates; these are curated postings an admin enters directly and just
-- need to be listed with an Apply button, no scoring or profile fields.
--
-- No admin UI exists yet — until it does, rows are inserted directly via
-- the Supabase dashboard's table editor or SQL editor.
--
-- UPDATE 2026-08-31 (see 0013_internal_jobs_admin_schema.sql): the admin
-- page that got built separately doesn't collect `company` — it has its
-- own department/employment_type/skills fields instead. 0013 drops
-- `company` and adds those; this file is left as originally applied
-- rather than edited in place.

create table if not exists public.internal_jobs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  company     text not null,
  location    text default '',
  description text default '',
  apply_url   text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists internal_jobs_active_created_idx
  on public.internal_jobs (is_active, created_at desc);

alter table public.internal_jobs enable row level security;

-- Any signed-in user can read active postings — this is a public jobs
-- listing, not per-user data. Only the service role (the future admin
-- backend, same as the job-engine collectors writing to `jobs`) can
-- insert/update/delete; RLS has no policy for that, so it stays
-- service-role-only by default.
drop policy if exists "internal_jobs_read" on public.internal_jobs;
create policy "internal_jobs_read"
  on public.internal_jobs for select
  to authenticated
  using (is_active = true);
