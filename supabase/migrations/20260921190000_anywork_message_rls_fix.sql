-- Fix AnyWork message insert RLS by checking active recipients through a
-- security-definer helper so profile RLS does not make valid recipients invisible.

create or replace function private.anywork_active_profile_exists(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.anywork_profiles p
    where p.user_id = p_user_id
      and p.is_active = true
  );
$$;

revoke all on function private.anywork_active_profile_exists(uuid) from public, anon, authenticated;
grant execute on function private.anywork_active_profile_exists(uuid) to authenticated;

drop policy if exists "AnyWork users can send messages" on public.anywork_messages;
create policy "AnyWork users can send messages"
on public.anywork_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and private.anywork_active_profile_exists(receiver_id)
  and (
    request_id is null
    or private.anywork_request_visible_to_user(request_id, (select auth.uid()))
  )
);
