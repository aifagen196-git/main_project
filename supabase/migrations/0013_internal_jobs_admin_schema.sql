-- supabase/migrations/0013_internal_jobs_admin_schema.sql
--
-- Schema the admin page (built separately from this repo) actually needs
-- for public.internal_jobs, applied live 2026-08-31: adds the fields its
-- form captures (department, employment_type, skills, created_by,
-- updated_at) and drops the `company` column 0012 shipped with, since the
-- admin UI doesn't collect one. The frontend's Internal Jobs card (
-- Dashboard.jsx) already falls back to `department` when `company` is
-- absent, so this is safe to run against rows either shape has produced.
--
-- `set_updated_at()` isn't defined anywhere else in this repo's migration
-- history — it already exists live (created directly, outside these
-- tracked migrations). Re-declaring it here with CREATE OR REPLACE is
-- idempotent either way and makes this migration reproducible on a fresh
-- database, not just the one it was hand-applied to.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.internal_jobs
  add column if not exists department text,
  add column if not exists employment_type text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.internal_jobs drop column if exists company;

drop trigger if exists internal_jobs_set_updated_at on public.internal_jobs;
create trigger internal_jobs_set_updated_at
  before update on public.internal_jobs
  for each row execute function public.set_updated_at();
