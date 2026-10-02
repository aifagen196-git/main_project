-- supabase/migrations/0021_signup_details.sql
--
-- Sign-up now asks for first name, last name, mobile number and area of
-- interest. The form passes them as auth user metadata; handle_new_user()
-- copies them onto the profile. area_of_interest holds a role-family id (same
-- list the matcher uses, backend/src/prompts/prompts.js ROLE_FAMILY_ENUM).
--
-- Safe to re-run.

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists area_of_interest text;
alter table public.profiles add column if not exists mobile text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := left(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 60);
  v_last  text := left(nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''), 60);
  v_area  text := left(nullif(trim(new.raw_user_meta_data ->> 'area_of_interest'), ''), 40);
  v_phone text := left(nullif(trim(new.raw_user_meta_data ->> 'mobile'), ''), 20);
  v_full  text := coalesce(
    nullif(trim(concat_ws(' ', v_first, v_last)), ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100)
  );
begin
  insert into public.profiles
    (id, email, full_name, first_name, last_name, mobile, area_of_interest, plan, subscription_status)
  values
    (new.id, new.email, v_full, v_first, v_last, v_phone, v_area, 'none', 'inactive')
  on conflict (id) do nothing;
  return new;
end;
$$;
