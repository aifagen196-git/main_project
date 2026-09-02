-- Backs the admin portal's new "Collector run history" panel. job-engine
-- has no persisted run history today — console.table output vanishes with
-- the GitHub Actions log. Every collector run (job-engine/collectors/*.js)
-- now writes one row here via collectors/runLog.js.

create table if not exists public.collector_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  success boolean,
  saved integer,
  failed integer,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists collector_runs_source_started_idx
  on public.collector_runs (source, started_at desc);

alter table public.collector_runs enable row level security;

-- Written only by job-engine (service-role key, bypasses RLS) and read only
-- by admins through the backend's /api/admin/collector-runs route (also
-- service-role) — no policy grants direct client access either way.
