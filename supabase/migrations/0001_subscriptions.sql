-- ============================================================
-- AIFAGen — Subscriptions migration
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once (idempotent).
-- ============================================================

-- 1) Extend the profiles table with subscription + profile fields
alter table public.profiles
  add column if not exists plan                text        default 'none',     -- none | free | professional | career_accelerator
  add column if not exists subscription_status text        default 'inactive', -- inactive | trialing | active | past_due | canceled
  add column if not exists billing_cycle       text,                            -- monthly | annual
  add column if not exists stripe_customer_id  text,
  add column if not exists current_period_end  timestamptz,
  add column if not exists headline            text,
  add column if not exists location            text;

-- Make sure existing rows have a sane status so the gate works
update public.profiles
   set subscription_status = coalesce(subscription_status, 'inactive'),
       plan                = coalesce(plan, 'none');

-- One Stripe customer per profile
create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- 2) Row Level Security: a user can read & edit only their own profile.
--    (The webhook uses the service-role key and bypasses RLS.)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (
    auth.uid() = id and
    plan = 'none' and
    subscription_status = 'inactive' and
    stripe_customer_id is null
  );

-- Authenticated users may edit presentation fields on their own profile, but
-- billing state is controlled only by trusted server code/service-role calls.
create or replace function public.prevent_profile_billing_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' and (
    new.plan is distinct from old.plan or
    new.subscription_status is distinct from old.subscription_status or
    new.billing_cycle is distinct from old.billing_cycle or
    new.stripe_customer_id is distinct from old.stripe_customer_id or
    new.current_period_end is distinct from old.current_period_end
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

-- The only user-callable path that changes plan state. It can activate the
-- free tier, but cannot grant either paid tier or alter Stripe fields.
create or replace function public.activate_free_plan()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_rows integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.profiles
     set plan = 'free', subscription_status = 'active', billing_cycle = null
   where id = auth.uid()
     and plan in ('none', 'free')
     and stripe_customer_id is null;

  get diagnostics changed_rows = row_count;
  return changed_rows = 1;
end;
$$;

revoke all on function public.activate_free_plan() from public;
grant execute on function public.activate_free_plan() to authenticated;

-- 3) Auto-create a profile row whenever a new auth user is created.
--    This is the robust Supabase pattern (works even with email confirmation on).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, plan, subscription_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'none',
    'inactive'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
