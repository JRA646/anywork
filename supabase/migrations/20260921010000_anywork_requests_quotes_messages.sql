-- AnyWork request, quote and messaging data model.
-- Requests are owned by a customer profile, quotes belong to providers,
-- and messages explicitly record sender/receiver participants.

create sequence if not exists public.anywork_request_number_seq start 1001;

create table if not exists public.anywork_service_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default ('AW-' || nextval('public.anywork_request_number_seq')::text),
  customer_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  service_key text not null,
  title text not null,
  description text not null default '',
  location text not null default '',
  preferred_date timestamptz,
  access_notes text,
  budget numeric(12,2),
  status text not null default 'Requested'
    check (status in ('Requested','Quoted','Scheduled','In Progress','Completed')),
  selected_provider_id uuid references public.anywork_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anywork_service_requests_customer_id_idx on public.anywork_service_requests(customer_id);
create index if not exists anywork_service_requests_status_idx on public.anywork_service_requests(status);

create table if not exists public.anywork_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  availability timestamptz,
  message text not null default '',
  status text not null default 'Pending'
    check (status in ('Pending','Accepted','Declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id, provider_id)
);

create index if not exists anywork_quotes_request_id_idx on public.anywork_quotes(request_id);
create index if not exists anywork_quotes_provider_id_idx on public.anywork_quotes(provider_id);

create table if not exists public.anywork_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.anywork_service_requests(id) on delete cascade,
  sender_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  receiver_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  body text not null,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create index if not exists anywork_messages_request_id_idx on public.anywork_messages(request_id, created_at);
create index if not exists anywork_messages_sender_receiver_idx on public.anywork_messages(sender_id, receiver_id, created_at);

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

drop trigger if exists anywork_service_requests_set_updated_at on public.anywork_service_requests;
create trigger anywork_service_requests_set_updated_at
before update on public.anywork_service_requests
for each row execute function private.anywork_set_updated_at();

drop trigger if exists anywork_quotes_set_updated_at on public.anywork_quotes;
create trigger anywork_quotes_set_updated_at
before update on public.anywork_quotes
for each row execute function private.anywork_set_updated_at();

alter table public.anywork_service_requests enable row level security;
alter table public.anywork_quotes enable row level security;
alter table public.anywork_messages enable row level security;

drop policy if exists "AnyWork customers can view own requests" on public.anywork_service_requests;
create policy "AnyWork customers can view own requests" on public.anywork_service_requests for select to authenticated
using (
  customer_id = (select auth.uid())
  or private.anywork_current_role() = 'admin'
  or exists (select 1 from public.anywork_quotes q where q.request_id = id and q.provider_id = (select auth.uid()))
  or selected_provider_id = (select auth.uid())
);

drop policy if exists "AnyWork customers can create requests" on public.anywork_service_requests;
create policy "AnyWork customers can create requests" on public.anywork_service_requests for insert to authenticated
with check (customer_id = (select auth.uid()) and private.anywork_current_role() = 'customer');

drop policy if exists "AnyWork customers can update own requests" on public.anywork_service_requests;
create policy "AnyWork customers can update own requests" on public.anywork_service_requests for update to authenticated
using (customer_id = (select auth.uid()) or private.anywork_current_role() = 'admin')
with check (customer_id = (select auth.uid()) or private.anywork_current_role() = 'admin');

drop policy if exists "AnyWork users can view relevant quotes" on public.anywork_quotes;
create policy "AnyWork users can view relevant quotes" on public.anywork_quotes for select to authenticated
using (
  provider_id = (select auth.uid())
  or exists (select 1 from public.anywork_service_requests r where r.id = request_id and r.customer_id = (select auth.uid()))
  or private.anywork_current_role() = 'admin'
);

drop policy if exists "AnyWork providers can create quotes" on public.anywork_quotes;
create policy "AnyWork providers can create quotes" on public.anywork_quotes for insert to authenticated
with check (
  provider_id = (select auth.uid())
  and private.anywork_current_role() = 'provider'
  and exists (select 1 from public.anywork_service_requests r where r.id = request_id and r.status in ('Requested','Quoted'))
);

drop policy if exists "AnyWork quote participants can update quotes" on public.anywork_quotes;
create policy "AnyWork quote participants can update quotes" on public.anywork_quotes for update to authenticated
using (
  provider_id = (select auth.uid())
  or exists (select 1 from public.anywork_service_requests r where r.id = request_id and r.customer_id = (select auth.uid()))
  or private.anywork_current_role() = 'admin'
)
with check (
  provider_id = (select auth.uid())
  or exists (select 1 from public.anywork_service_requests r where r.id = request_id and r.customer_id = (select auth.uid()))
  or private.anywork_current_role() = 'admin'
);

drop policy if exists "AnyWork participants can view messages" on public.anywork_messages;
create policy "AnyWork participants can view messages" on public.anywork_messages for select to authenticated
using (
  sender_id = (select auth.uid())
  or receiver_id = (select auth.uid())
  or private.anywork_current_role() = 'admin'
);

drop policy if exists "AnyWork users can send messages" on public.anywork_messages;
create policy "AnyWork users can send messages" on public.anywork_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (select 1 from public.anywork_profiles p where p.user_id = receiver_id and p.is_active = true)
  and (
    request_id is null
    or exists (
      select 1 from public.anywork_service_requests r
      where r.id = request_id
        and (
          r.customer_id = (select auth.uid())
          or r.selected_provider_id = (select auth.uid())
          or exists (select 1 from public.anywork_quotes q where q.request_id = r.id and q.provider_id = (select auth.uid()))
        )
    )
  )
);

drop policy if exists "AnyWork recipients can mark messages read" on public.anywork_messages;
create policy "AnyWork recipients can mark messages read" on public.anywork_messages for update to authenticated
using (receiver_id = (select auth.uid()) or private.anywork_current_role() = 'admin')
with check (receiver_id = (select auth.uid()) or private.anywork_current_role() = 'admin');

grant select, insert, update on public.anywork_service_requests to authenticated;
grant select, insert, update on public.anywork_quotes to authenticated;
grant select, insert, update on public.anywork_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'anywork_messages'
  ) then
    alter publication supabase_realtime add table public.anywork_messages;
  end if;
end
$$;
