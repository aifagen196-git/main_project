-- supabase/migrations/0028_profiles_mobile_unique.sql
--
-- One account per mobile number. The live database already has this rule
-- (added directly in the dashboard, never written down here); this records
-- it so a fresh database gets it too. Does nothing where it already exists.
-- Sign-up and the admin routes check for a taken number first so the user
-- sees a clear message rather than this constraint's error.

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'profiles_mobile_unique'
       and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_mobile_unique unique (mobile);
  end if;
end $$;
