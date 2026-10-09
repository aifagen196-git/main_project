-- supabase/migrations/0025_security_hardening.sql
--
-- Fixes from the 2026-10-10 security review. Safe to re-run.
--
-- 1. Storage writes. Any signed-in user (paying or not) could still upload
--    files straight into the private resumes bucket with the public key —
--    any file type, 10 MB each, no limit on count — i.e. free file hosting on
--    our bill. 0020 dropped the write policies by their original names, but
--    the live project carries a differently-named one. Uploads only ever go
--    through the backend (service role, which ignores these policies), so drop
--    EVERY insert/update/delete policy on storage.objects, whatever it's
--    called. Read policies stay (users reading their own resume, public
--    avatars).

do $$
declare
  pol record;
begin
  for pol in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
    raise notice 'dropped storage policy: %', pol.policyname;
  end loop;
end $$;

-- Resumes: PDF and Word only (the backend already checks the real file type).
update storage.buckets
   set allowed_mime_types = array[
         'application/pdf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ]
 where id = 'resumes';

-- 2. Sign-up metadata. The Supabase sign-up endpoint can still be called
--    directly with the public key, skipping our backend's checks, so the
--    trigger keeps only an area of interest from the real list (anything else
--    is stored as empty and filled from the first resume).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := left(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 60);
  v_last  text := left(nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''), 60);
  v_area  text := nullif(trim(new.raw_user_meta_data ->> 'area_of_interest'), '');
  v_phone text := left(nullif(trim(new.raw_user_meta_data ->> 'mobile'), ''), 20);
  v_full  text := coalesce(
    nullif(trim(concat_ws(' ', v_first, v_last)), ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100)
  );
begin
  if v_area not in (
    'devops', 'supply-chain', 'ai-ml', 'data-scientist', 'data-center-technician',
    'network-engineer', 'business-analyst', 'data-analyst', 'full-stack',
    'software-engineer', 'quality-automation', 'it-support', 'sap'
  ) then
    v_area := null;
  end if;

  insert into public.profiles
    (id, email, full_name, first_name, last_name, mobile, area_of_interest, plan, subscription_status)
  values
    (new.id, new.email, v_full, v_first, v_last, v_phone, v_area, 'none', 'inactive')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Leftover from the old free tier: marked the caller's account "active".
--    Not present on the live project, but some environments may have it.
drop function if exists public.activate_free_plan();
