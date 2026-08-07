-- supabase/migrations/0007_semantic_embeddings.sql
--
-- Activates the Stage-2 semantic retrieval layer sketched in 0002_matching.sql.
-- 1536 dims = OpenAI text-embedding-3-small (see embeddings.service.js;
-- EMBEDDINGS_DIMS must match this column if you change models).

create extension if not exists vector;

alter table public.jobs    add column if not exists embedding vector(1536);
alter table public.resumes add column if not exists embedding vector(1536);

-- Approximate-nearest-neighbour index for fast cosine ranking. lists=100 is
-- fine up to ~100k rows; re-tune (roughly rows/1000) as the pool grows.
create index if not exists jobs_embedding_idx
  on public.jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Ranking helper: jobs closest to a candidate vector, active + US-gated in
-- SQL so the ANN scan and the gate compose. Used by the matcher as a
-- semantic-recall pass; the heuristic scorer still ranks the final feed.
-- select id, title, 1 - (embedding <=> $1) as similarity
-- from public.jobs
-- where is_active and (country in ('USA','US','UNITED STATES') or is_remote_us)
-- order by embedding <=> $1
-- limit 200;
