-- supabase/migrations/0029_more_areas.sql
--
-- More areas of interest at sign-up: the other domains US IT staffing clients
-- ask for most, plus "Others". The sign-up function keeps only known areas
-- (anything else is saved as empty), so its list must grow with the site's.
-- Same function as 0025 otherwise. Run BEFORE deploying the matching site
-- code, or new sign-ups that pick a new area get no area saved. Safe to re-run.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := left(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 60);
  v_last  text := left(nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''), 60);
  v_area  text := nullif(trim(new.raw_user_meta_data ->> 'area_of_interest'), '');
  v_phone text := left(nullif(trim(new.raw_user_meta_data ->> 'mobile'), ''), 20);
  v_full  text := coalesce(
    nullif(trim(concat_ws(' ', v_first, v_last)), ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100)
  );
begin
  if v_area not in (
    'devops', 'supply-chain', 'ai-ml', 'data-scientist', 'data-center-technician',
    'network-engineer', 'business-analyst', 'data-analyst', 'full-stack',
    'software-engineer', 'quality-automation', 'it-support', 'sap',
    'cloud-engineer', 'data-engineer', 'bi-developer', 'java-developer',
    'dotnet-developer', 'python-developer', 'frontend-developer', 'mobile-developer',
    'cybersecurity', 'database-administrator', 'salesforce', 'servicenow', 'workday',
    'project-manager', 'product-manager', 'ui-ux-designer', 'others'
  ) then
    v_area := null;
  end if;

  insert into public.profiles
    (id, email, full_name, first_name, last_name, mobile, area_of_interest, plan, subscription_status)
  values
    (new.id, new.email, v_full, v_first, v_last, v_phone, v_area, 'none', 'inactive')
  on conflict (id) do nothing;
  return new;
end;
$$;
