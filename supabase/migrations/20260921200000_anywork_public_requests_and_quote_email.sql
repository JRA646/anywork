-- Public AnyWork request flow.
-- Requests may be created by guests through the create-public-request Edge Function.
-- Authenticated customers continue to use customer_id for workspace ownership.

alter table public.anywork_service_requests
  alter column customer_id drop not null;

alter table public.anywork_service_requests
  add column if not exists requester_name text,
  add column if not exists requester_email text,
  add column if not exists requester_phone text;

create index if not exists anywork_service_requests_requester_email_idx
  on public.anywork_service_requests(lower(requester_email));

alter table public.anywork_quotes
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_message_id text,
  add column if not exists email_error text;

drop policy if exists "AnyWork customers can view own requests" on public.anywork_service_requests;
create policy "AnyWork customers can view own requests"
on public.anywork_service_requests
for select to authenticated
using (
  customer_id = (select auth.uid())
  or private.anywork_current_role() = 'admin'
  or (private.anywork_current_role() = 'provider' and status in ('Requested','Quoted'))
  or selected_provider_id = (select auth.uid())
);

drop policy if exists "AnyWork customers can create requests" on public.anywork_service_requests;
create policy "AnyWork customers can create requests"
on public.anywork_service_requests
for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and private.anywork_current_role() = 'customer'
);

grant select, insert, update on public.anywork_service_requests to authenticated;
grant select, insert, update on public.anywork_quotes to authenticated;
