-- supabase/migrations/0006_job_search_indexes.sql
--
-- Job keyword search does `title/company/description ILIKE '%term%'`.
-- A leading wildcard can't use a btree index, so without these the query
-- sequentially scans every active job (≈7s on ~9.5k rows with 9KB
-- descriptions). pg_trgm + GIN makes substring ILIKE index-accelerated.
--
-- NOTE: pg_trgm is already installed on this database — do NOT `create
-- extension` (it errors with a duplicate-key on pg_extension_name_index).
-- Its schema is on the search_path, so the operator class is referenced
-- unqualified as `gin_trgm_ops`.
--
-- Safe + additive: creates indexes only. No data changes.
-- Building the description index takes ~10-30s on this table size.

create index if not exists jobs_title_trgm_idx
  on public.jobs using gin (title gin_trgm_ops);

create index if not exists jobs_company_trgm_idx
  on public.jobs using gin (company gin_trgm_ops);

create index if not exists jobs_description_trgm_idx
  on public.jobs using gin (description gin_trgm_ops);

-- Search always filters on is_active first.
create index if not exists jobs_is_active_search_idx
  on public.jobs (is_active);
