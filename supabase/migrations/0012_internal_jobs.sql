-- Internal job postings: AIFAGen's own openings, posted by an admin and
-- shown in a dedicated "Internal Jobs" section on the main app. Separate
-- from public.jobs (external scraped postings, see job-engine/) — internal
-- postings are hand-written, so they get their own table rather than being
-- shoehorned into the scraper's source/source_job_id shape.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Allowlist of auth.users who may manage internal_jobs. Add a row manually '
  '(via the Supabase SQL editor) for each admin — there is no self-service '
  'signup path into this table.';

-- security definer: lets RLS policies below check admin status without
-- needing their own SELECT grant on admins (which would otherwise require
-- opening admins up to every authenticated user just to run this check).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

create table if not exists public.internal_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text,
  location text,
  employment_type text,
  description text not null,
  skills text[] not null default '{}',
  apply_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists internal_jobs_active_idx
  on public.internal_jobs (is_active, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists internal_jobs_set_updated_at on public.internal_jobs;
create trigger internal_jobs_set_updated_at
  before update on public.internal_jobs
  for each row execute function public.set_updated_at();

alter table public.admins enable row level security;
alter table public.internal_jobs enable row level security;

-- admins: no direct client access at all — only read through is_admin().
-- (Deliberately no SELECT/INSERT/UPDATE/DELETE policy: RLS defaults to deny,
-- and admin rows are managed by hand in the SQL editor.)

-- internal_jobs: anyone (including signed-out visitors) can read active
-- postings; only admins can write.
drop policy if exists internal_jobs_public_read on public.internal_jobs;
create policy internal_jobs_public_read
  on public.internal_jobs
  for select
  using (is_active = true or public.is_admin());

drop policy if exists internal_jobs_admin_write on public.internal_jobs;
create policy internal_jobs_admin_write
  on public.internal_jobs
  for all
  using (public.is_admin())
  with check (public.is_admin());
