-- supabase/migrations/0022_plan_values.sql
--
-- Only three plans exist: none, basic, premium. The legacy 'professional'
-- tier was retired (all accounts on it moved to premium on 2026-10-05), and
-- 'free' grants nothing. Accounts kept reappearing as 'professional' —
-- including one typed by hand as 'professional' plus a line break — because
-- the column accepted any text. This makes the database refuse anything else.
--
-- Safe to re-run. Run AFTER no rows hold another value (checked 2026-10-05:
-- none 5, basic 1, premium 8).

-- Normalise stray whitespace/case first so the check can't fail on a
-- hand-edited row.
update public.profiles
   set plan = lower(trim(both E' \t\r\n' from plan))
 where plan is distinct from lower(trim(both E' \t\r\n' from plan));

update public.profiles set plan = 'premium' where plan = 'professional';
update public.profiles set plan = 'none' where plan is null or plan not in ('none', 'basic', 'premium');

alter table public.profiles alter column plan set default 'none';
alter table public.profiles alter column plan set not null;

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('none', 'basic', 'premium'));
