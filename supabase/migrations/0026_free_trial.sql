-- supabase/migrations/0026_free_trial.sql
--
-- 7-day free trial. New accounts, once their email AND mobile number are
-- verified, can start one trial: plan 'basic', status 'trialing', and
-- current_period_end exactly 7 days after the start. Access is checked
-- against current_period_end on every request (requireActivePlan), so the
-- trial ends at that moment with no job needed to switch it off.
--
-- One trial per verified phone number (trial_claims), so a new email can't
-- buy another free week. Only the backend (service role) touches any of this.
--
-- Safe to re-run.

alter table public.profiles add column if not exists trial_started_at timestamptz;
alter table public.profiles add column if not exists trial_ends_at timestamptz;

create table if not exists public.trial_claims (
  phone      text primary key,                         -- E.164, e.g. +15551234567
  user_id    uuid references auth.users(id) on delete set null,
  claimed_at timestamptz not null default now()
);

alter table public.trial_claims enable row level security;
revoke all on table public.trial_claims from anon, authenticated;

-- Users can't set their own trial dates (same protection as the billing
-- fields; table writes are already revoked from user sessions in 0020).
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
    new.razorpay_payment_id  is distinct from old.razorpay_payment_id or
    new.trial_started_at     is distinct from old.trial_started_at or
    new.trial_ends_at        is distinct from old.trial_ends_at
  ) then
    raise exception 'Subscription fields cannot be updated directly'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
