-- supabase/migrations/0002_matching.sql
--
-- Adds a structured `profile` jsonb to both resumes and jobs so the matcher
-- reads clean fields instead of re-parsing text. Also lifts the few fields the
-- gates need into real columns so they can be filtered in SQL later if you
-- want to push gating into the query.

-- ---- resumes -------------------------------------------------------------
alter table public.resumes
  add column if not exists profile jsonb;

-- ---- jobs ----------------------------------------------------------------
alter table public.jobs
  add column if not exists profile jsonb,
  add column if not exists role_family text,
  add column if not exists country text,
  add column if not exists min_years int default 0,
  add column if not exists is_remote_us boolean default false,
  add column if not exists skills_required text[] default '{}',
  add column if not exists skills_preferred text[] default '{}';

-- Helpful for the USA gate if you later filter in SQL:
create index if not exists jobs_country_idx on public.jobs (country);
create index if not exists jobs_role_family_idx on public.jobs (role_family);

-- ==========================================================================
-- OPTIONAL — semantic retrieval upgrade (Stage 2). Enable when you add an
-- embedding step. Supabase ships pgvector. 1536 dims = OpenAI
-- text-embedding-3-small. Uncomment to use.
-- ==========================================================================
-- create extension if not exists vector;
--
-- alter table public.jobs    add column if not exists embedding vector(1536);
-- alter table public.resumes add column if not exists embedding vector(1536);
--
-- -- approximate-nearest-neighbour index for fast cosine ranking
-- create index if not exists jobs_embedding_idx
--   on public.jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);
--
-- -- example ranking query: jobs closest to a candidate vector, USA-gated
-- -- select id, title, 1 - (embedding <=> $1) as similarity
-- -- from public.jobs
-- -- where country = 'USA'
-- -- order by embedding <=> $1
-- -- limit 50;
