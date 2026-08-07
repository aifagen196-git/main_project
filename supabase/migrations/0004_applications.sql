-- supabase/migrations/0004_applications.sql
--
-- Real backing for the Application Tracker page (previously a hardcoded
-- kanban with no persistence).

create table if not exists public.applications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  company     text not null,
  role        text not null,
  status      text not null default 'applied'
    check (status in ('applied', 'interviewing', 'assessment', 'offer', 'rejected')),
  match_score int,
  apply_url   text,
  notes       text,
  job_id      uuid references public.jobs (id) on delete set null,
  applied_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists applications_user_idx on public.applications (user_id);

alter table public.applications enable row level security;

drop policy if exists "applications_own" on public.applications;
create policy "applications_own"
  on public.applications for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
