-- supabase/migrations/0009_plan_tiers.sql
--
-- Replaces the three-tier plan model (free / professional / career_accelerator)
-- with two paid tiers (basic / premium) and no free tier. See
-- frontend/src/utils/plan.js and backend/src/services/payments/razorpay.service.js
-- for the matching application-layer changes.
--
-- consume_ai_usage() (0000_init.sql) hardcoded the old plan id strings.
-- Left unchanged, it would silently stop recognizing anyone: nobody has
-- plan in ('professional','career_accelerator') anymore, and the
-- current_plan <> 'free' check would now be true for every account, so the
-- function would return false for every single request — an outage for
-- 100% of paid users, not an error, so the RPC's existing fail-open path
-- (see backend/src/services/ai/usage.js) would never catch it.

create or replace function public.consume_ai_usage(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan text;
  current_status text;
  uses_today integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select plan, subscription_status
    into current_plan, current_status
    from public.profiles
   where id = p_user_id;

  if current_status not in ('active', 'trialing') then
    return false;
  end if;

  -- Premium: unlimited, no counting needed.
  if current_plan = 'premium' then
    insert into public.ai_usage (user_id) values (p_user_id);
    return true;
  end if;

  -- Basic: 20/day, matching PLAN_LIMITS.basic.aiPerDay in
  -- frontend/src/utils/plan.js — keep both in sync if this changes.
  if current_plan = 'basic' then
    select count(*) into uses_today
      from public.ai_usage
     where user_id = p_user_id
       and used_at >= date_trunc('day', now());

    if uses_today >= 20 then
      return false;
    end if;

    insert into public.ai_usage (user_id) values (p_user_id);
    return true;
  end if;

  -- Anything else (plan = 'none', or a legacy 'free' row from before this
  -- migration) gets no AI usage — there is no free tier anymore.
  return false;
end;
$$;

revoke all on function public.consume_ai_usage(uuid) from public;
grant execute on function public.consume_ai_usage(uuid) to service_role;

-- activate_free_plan() (0001_subscriptions.sql) is now unreachable from the
-- UI — Pricing.jsx no longer offers a free plan — but left in place rather
-- than dropped: any account that used it while the free tier was live still
-- legitimately holds plan='free', and dropping the function wouldn't change
-- that. It simply won't be called by anything going forward.
--
-- Guarded: on a database where 0001_subscriptions.sql's version of this
-- function was never applied (activate_free_plan() doesn't exist here),
-- COMMENT ON FUNCTION errors out and — since the SQL editor runs a pasted
-- script as one transaction — silently rolls back everything above it too,
-- including the consume_ai_usage() update this migration exists for. Only
-- comment if the function is actually there.
do $$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'activate_free_plan'
      and pronamespace = 'public'::regnamespace
  ) then
    comment on function public.activate_free_plan() is
      'Unreachable from the current UI as of 0009_plan_tiers.sql — Pricing.jsx has no free-plan option. Kept for accounts that already hold plan=''free''.';
  end if;
end $$;
