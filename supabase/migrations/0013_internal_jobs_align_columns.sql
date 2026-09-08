-- 0012 used `create table if not exists internal_jobs`, but a table by that
-- name already existed (a simpler shape: id, title, company, location,
-- description, apply_url, is_active, created_at — no department,
-- employment_type, skills, created_by, updated_at) — so the create was a
-- silent no-op and the admin app's extra columns were never added. Add what's
-- missing rather than drop/recreate, since the pre-existing table already had
-- one row in it.

alter table public.internal_jobs
  add column if not exists department text,
  add column if not exists employment_type text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- `company` from the pre-existing table isn't part of this app's shape (the
-- admin UI and public listing don't read or write it) — drop it rather than
-- leave a column nothing ever populates going forward.
alter table public.internal_jobs drop column if exists company;

drop trigger if exists internal_jobs_set_updated_at on public.internal_jobs;
create trigger internal_jobs_set_updated_at
  before update on public.internal_jobs
  for each row execute function public.set_updated_at();

-- Remove the placeholder row left over from whatever created the original
-- table (title "Job Title" / location "City, ST" / apply_url pointing at
-- example.com — not a real posting).
delete from public.internal_jobs
where title = 'Job Title' and apply_url = 'https://example.com/apply';
