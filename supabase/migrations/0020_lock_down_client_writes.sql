-- supabase/migrations/0020_lock_down_client_writes.sql
--
-- SECURITY FIX (run this in the Supabase SQL editor). Verified live on 2026-09-29: a signed-in user could call the
-- Supabase REST API directly with the public anon key and their own session
-- and run
--     update profiles set plan='premium', subscription_status='active',
--                         current_period_end='2099-01-01' where id = <self>
-- and it succeeded — i.e. grant themselves a paid plan for free. The
-- prevent_profile_billing_changes() trigger from 0001 was not stopping it on
-- the live database, and the razorpay_* columns added in 0005 were never
-- covered by it at all.
--
-- Nothing in the web app writes these tables with a user session: the
-- frontend goes through the backend API (service role) for every read and
-- write, and only uses supabase-js for auth. So the fix is to take table
-- write privileges away from the anon/authenticated roles entirely — RLS
-- policies then no longer matter for writes — and keep the trigger as a
-- second layer.
--
-- Exception: internal_jobs keeps its privileges. The admin app edits it
-- directly, gated by the is_admin() RLS policy from 0012.
--
-- Safe to re-run.

-- 1. Table write privileges -------------------------------------------------
revoke insert, update, delete on table
  public.profiles,
  public.applications,
  public.saved_jobs,
  public.resumes,
  public.ai_usage,
  public.user_job_preferences,
  public.jobs,
  public.admins,
  public.admin_audit_log,
  public.collector_runs
from anon, authenticated;

-- 1b. The scraped job database was readable by anyone holding the public
--     anon key (all ~36k rows, no login). The app only reads jobs through the
--     backend, so close direct reads too.
revoke select on table public.jobs, public.collector_runs from anon, authenticated;

-- 2. Billing-field trigger, re-created and widened ---------------------------
create or replace function public.prevent_profile_billing_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and (
    new.plan                 is distinct from old.plan or
    new.subscription_status  is distinct from old.subscription_status or
    new.billing_cycle        is distinct from old.billing_cycle or
    new.stripe_customer_id   is distinct from old.stripe_customer_id or
    new.current_period_end   is distinct from old.current_period_end or
    new.razorpay_customer_id is distinct from old.razorpay_customer_id or
    new.razorpay_order_id    is distinct from old.razorpay_order_id or
    new.razorpay_payment_id  is distinct from old.razorpay_payment_id
  ) then
    raise exception 'Subscription fields cannot be updated directly'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing_fields on public.profiles;
create trigger protect_profile_billing_fields
  before update on public.profiles
  for each row execute function public.prevent_profile_billing_changes();

-- 3. Public avatars bucket: images only, 5 MB (matches profile.routes.js) ----
update storage.buckets
   set file_size_limit = 5 * 1024 * 1024,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'avatars';

update storage.buckets
   set file_size_limit = 10 * 1024 * 1024
 where id = 'resumes' and file_size_limit is null;

-- 4. Nothing in the app uploads to storage with a user session either (the
--    backend uploads with the service role), so drop the client write
--    policies. Reads of the public avatars bucket are unaffected.
drop policy if exists "avatar_objects_insert_own" on storage.objects;
drop policy if exists "avatar_objects_update_own" on storage.objects;
drop policy if exists "avatar_objects_delete_own" on storage.objects;
drop policy if exists "resume_objects_insert_own" on storage.objects;
drop policy if exists "resume_objects_update_own" on storage.objects;
drop policy if exists "resume_objects_delete_own" on storage.objects;
