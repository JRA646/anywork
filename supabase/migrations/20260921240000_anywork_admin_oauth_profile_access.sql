-- ANYwork dynamic admin access and OAuth profile normalization.

drop policy if exists "AnyWork admins can manage profiles" on public.anywork_profiles;
create policy "AnyWork admins can manage profiles"
on public.anywork_profiles
for update
to authenticated
using (private.anywork_current_role() = 'admin')
with check (private.anywork_current_role() = 'admin');

create or replace function private.anywork_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  first_name_value text;
  last_name_value text;
  display_name_value text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'anywork_role' in ('customer', 'provider')
      then new.raw_user_meta_data ->> 'anywork_role'
    else 'customer'
  end;

  first_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'given_name', ''),
    ''
  );

  last_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'family_name', ''),
    ''
  );

  display_name_value := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(concat_ws(' ', first_name_value, last_name_value)), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  );

  if first_name_value = '' and last_name_value = '' and position(' ' in display_name_value) > 0 then
    first_name_value := split_part(display_name_value, ' ', 1);
    last_name_value := substring(display_name_value from position(' ' in display_name_value) + 1);
  end if;

  insert into public.anywork_profiles (
    user_id, role, first_name, last_name, display_name, company_name, phone, avatar_url
  )
  values (
    new.id,
    requested_role,
    first_name_value,
    last_name_value,
    display_name_value,
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (user_id) do update set
    first_name = case when excluded.first_name <> '' then excluded.first_name else public.anywork_profiles.first_name end,
    last_name = case when excluded.last_name <> '' then excluded.last_name else public.anywork_profiles.last_name end,
    display_name = case when excluded.display_name <> '' then excluded.display_name else public.anywork_profiles.display_name end,
    avatar_url = coalesce(excluded.avatar_url, public.anywork_profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

grant execute on function private.anywork_handle_new_user() to postgres;
