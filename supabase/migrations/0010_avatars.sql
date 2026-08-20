-- supabase/migrations/0010_avatars.sql
--
-- Profile photo support: a column on profiles, a public storage bucket, and
-- RLS so a user can only write inside their own folder.

alter table public.profiles
  add column if not exists avatar_url text;

-- Public bucket: avatars are meant to be displayed (sidebar, Settings), so
-- unlike the private "resumes" bucket, read access has no auth requirement.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatar_objects_select_public" on storage.objects;
create policy "avatar_objects_select_public" on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatar_objects_insert_own" on storage.objects;
create policy "avatar_objects_insert_own" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_objects_update_own" on storage.objects;
create policy "avatar_objects_update_own" on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_objects_delete_own" on storage.objects;
create policy "avatar_objects_delete_own" on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
