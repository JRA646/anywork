-- AnyWork profile/authentication foundation.
-- Authentication credentials remain in Supabase auth.users.
-- AnyWork-specific profile data is stored in public.anywork_profiles.

create table if not exists public.anywork_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer'
    check (role in ('customer', 'provider', 'admin')),
  first_name text not null default '',
  last_name text not null default '',
  display_name text not null default '',
  company_name text,
  phone text,
  avatar_url text,
  bio text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'Philippines',
  onboarding_completed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop function if exists public.anywork_current_role();
drop function if exists public.anywork_handle_new_user();
drop function if exists public.anywork_set_updated_at();

create schema if not exists private;

create or replace function private.anywork_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.anywork_profiles
  where user_id = auth.uid()
  limit 1
$$;

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

  first_name_value := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  last_name_value := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  display_name_value := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', first_name_value, last_name_value)), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  );

  insert into public.anywork_profiles (
    user_id,
    role,
    first_name,
    last_name,
    display_name,
    company_name,
    phone,
    avatar_url
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
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_anywork on auth.users;
create trigger on_auth_user_created_anywork
after insert on auth.users
for each row
execute function private.anywork_handle_new_user();

create or replace function private.anywork_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists anywork_profiles_set_updated_at on public.anywork_profiles;
create trigger anywork_profiles_set_updated_at
before update on public.anywork_profiles
for each row
execute function private.anywork_set_updated_at();

alter table public.anywork_profiles enable row level security;

drop policy if exists "AnyWork users can view own profile" on public.anywork_profiles;
create policy "AnyWork users can view own profile"
on public.anywork_profiles
for select
to authenticated
using (
  auth.uid() = user_id
  or private.anywork_current_role() = 'admin'
);

drop policy if exists "AnyWork users can update own profile" on public.anywork_profiles;
create policy "AnyWork users can update own profile"
on public.anywork_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and role = private.anywork_current_role()
);

grant select, update on table public.anywork_profiles to authenticated;

revoke all on function private.anywork_current_role() from public, anon;
revoke all on function private.anywork_handle_new_user() from public, anon, authenticated;
revoke all on function private.anywork_set_updated_at() from public, anon, authenticated;
grant execute on function private.anywork_current_role() to authenticated;

-- Existing AnyWork-eligible operations accounts are promoted into the
-- separate AnyWork profile table without touching Supabase auth credentials.
insert into public.anywork_profiles (
  user_id,
  role,
  first_name,
  last_name,
  display_name
)
select
  ap.user_id,
  'admin',
  split_part(coalesce(ap.full_name, ''), ' ', 1),
  case
    when position(' ' in coalesce(ap.full_name, '')) > 0
      then substring(ap.full_name from position(' ' in ap.full_name) + 1)
    else ''
  end,
  coalesce(ap.full_name, '')
from public.admin_profiles ap
on conflict (user_id) do update
set role = 'admin',
    display_name = excluded.display_name,
    updated_at = now();
