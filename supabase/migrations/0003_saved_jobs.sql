-- supabase/migrations/0003_saved_jobs.sql
--
-- Persist bookmarked jobs per user. Previously "saved" jobs lived only in
-- React state seeded with fake integer ids ([2, 4]) and were lost on refresh
-- (bug F6). Real job ids are UUIDs.

create table if not exists public.saved_jobs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  job_id     uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index if not exists saved_jobs_user_idx on public.saved_jobs (user_id);

alter table public.saved_jobs enable row level security;

drop policy if exists "saved_jobs_own" on public.saved_jobs;
create policy "saved_jobs_own"
  on public.saved_jobs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
