-- supabase/migrations/0018_ai_usage_attribution.sql
--
-- Makes the attribution columns added in 0016 actually reachable.
--
-- 0016 added provider / model / feature / token / cost columns to ai_usage,
-- but nothing could populate them: rows are inserted by consume_ai_usage(),
-- which returns only a boolean, so the caller never learned which row it had
-- just created and had no way to attribute it afterwards. The AI Usage panel
-- has therefore been reporting "Est. cost $0" and empty provider/feature
-- breakdowns since it shipped.
--
-- This replaces the function with one that returns the new row's id (null
-- when the call is denied), so the backend can update that exact row once it
-- knows which provider served the request.
--
-- Return type changes boolean -> bigint, which create-or-replace cannot do,
-- hence the drop. backend/src/services/ai/usage.js handles both shapes, so the
-- app keeps working whether or not this migration has been applied.

drop function if exists public.consume_ai_usage(uuid);

create function public.consume_ai_usage(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan   text;
  current_status text;
  uses_today     integer;
  new_id         bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select plan, subscription_status
    into current_plan, current_status
    from public.profiles
   where id = p_user_id;

  if current_status not in ('active', 'trialing') then
    return null;
  end if;

  -- Premium: unlimited, no counting needed.
  if current_plan = 'premium' then
    insert into public.ai_usage (user_id) values (p_user_id) returning id into new_id;
    return new_id;
  end if;

  -- Basic: 20/day, matching PLAN_LIMITS.basic.aiPerDay in
  -- frontend/src/utils/plan.js — keep both in sync if this changes.
  if current_plan = 'basic' then
    select count(*) into uses_today
      from public.ai_usage
     where user_id = p_user_id
       and used_at >= date_trunc('day', now());

    if uses_today >= 20 then
      return null;
    end if;

    insert into public.ai_usage (user_id) values (p_user_id) returning id into new_id;
    return new_id;
  end if;

  -- Anything else (plan = 'none', or a legacy 'free' row) gets no AI usage —
  -- there is no free tier anymore.
  return null;
end;
$$;

revoke all on function public.consume_ai_usage(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid) to service_role;
