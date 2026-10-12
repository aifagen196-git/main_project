-- supabase/migrations/0027_avatar_reads.sql
--
-- Avatars are shown through their public URL, which works for a public bucket
-- without any policy. The read policy from 0010 only added the ability to
-- list the bucket's folders through the storage API, which nothing in the app
-- does. Safe to re-run.

drop policy if exists "avatar_objects_select_public" on storage.objects;
