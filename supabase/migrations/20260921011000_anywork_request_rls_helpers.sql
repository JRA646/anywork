create or replace function private.anywork_request_visible_to_user(
  p_request_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.anywork_service_requests r
    where r.id = p_request_id
      and (r.customer_id = p_user_id or r.selected_provider_id = p_user_id)
  )
  or exists (
    select 1 from public.anywork_quotes q
    where q.request_id = p_request_id
      and q.provider_id = p_user_id
  )
  or private.anywork_current_role() = 'admin';
$$;

revoke all on function private.anywork_request_visible_to_user(uuid, uuid) from public, anon, authenticated;
grant execute on function private.anywork_request_visible_to_user(uuid, uuid) to authenticated;

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

drop policy if exists "AnyWork users can view relevant quotes" on public.anywork_quotes;
create policy "AnyWork users can view relevant quotes"
on public.anywork_quotes
for select to authenticated
using (
  provider_id = (select auth.uid())
  or exists (
    select 1 from public.anywork_service_requests r
    where r.id = request_id and r.customer_id = (select auth.uid())
  )
  or private.anywork_current_role() = 'admin'
);

drop policy if exists "AnyWork users can send messages" on public.anywork_messages;
create policy "AnyWork users can send messages"
on public.anywork_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.anywork_profiles p
    where p.user_id = receiver_id and p.is_active = true
  )
  and (
    request_id is null
    or private.anywork_request_visible_to_user(request_id, (select auth.uid()))
  )
);