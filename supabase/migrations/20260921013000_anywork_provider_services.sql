create table if not exists public.anywork_provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  service_key text not null,
  enabled boolean not null default true,
  starting_price numeric(12,2),
  minimum_job_value numeric(12,2),
  service_area text,
  lead_time_days integer not null default 1 check (lead_time_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, service_key)
);

create index if not exists anywork_provider_services_provider_id_idx
  on public.anywork_provider_services(provider_id);

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

drop trigger if exists anywork_provider_services_set_updated_at on public.anywork_provider_services;
create trigger anywork_provider_services_set_updated_at
before update on public.anywork_provider_services
for each row execute function private.anywork_set_updated_at();

alter table public.anywork_provider_services enable row level security;

drop policy if exists "AnyWork providers can view own services" on public.anywork_provider_services;
create policy "AnyWork providers can view own services"
on public.anywork_provider_services
for select to authenticated
using (
  provider_id = (select auth.uid())
  or (enabled = true and private.anywork_current_role() <> 'customer')
  or private.anywork_current_role() = 'admin'
);

drop policy if exists "AnyWork providers can manage own services" on public.anywork_provider_services;
create policy "AnyWork providers can manage own services"
on public.anywork_provider_services
for all to authenticated
using (
  provider_id = (select auth.uid())
  or private.anywork_current_role() = 'admin'
)
with check (
  provider_id = (select auth.uid())
  or private.anywork_current_role() = 'admin'
);

grant select, insert, update, delete on public.anywork_provider_services to authenticated;
