-- supabase/migrations/0005_razorpay.sql
--
-- Razorpay replaces Stripe. Add Razorpay reference columns to profiles.
-- The old stripe_customer_id column is left in place (harmless) but no longer
-- written to.

alter table public.profiles
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text;

-- Keep the billing-field protection trigger's whitelist in sync: these new
-- columns are billing state, so only service-role/trigger-exempt code writes
-- them. The existing prevent_profile_billing_changes() trigger (0001) already
-- blocks the 'authenticated' role from changing plan/subscription_status/etc.,
-- so no policy change is needed — the new columns are simply never granted to
-- client updates.
