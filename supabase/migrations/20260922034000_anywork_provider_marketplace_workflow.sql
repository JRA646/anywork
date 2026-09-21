-- Provider marketplace workflow: matching opportunities can be viewed and
-- assignment invitations can be accepted or declined by the matched provider.

drop policy if exists "Providers view matching requests" on public.anywork_service_requests;
create policy "Providers view matching requests" on public.anywork_service_requests
  for select to authenticated
  using (
    private.anywork_current_role()='admin'
    or customer_id=auth.uid()
    or selected_provider_id=auth.uid()
    or (
      private.anywork_current_role()='provider'
      and status in ('Requested','Quoted')
      and exists (
        select 1
        from public.anywork_provider_services ps
        where ps.provider_id=auth.uid()
          and ps.service_key=service_key
          and ps.enabled=true
      )
    )
  );

create or replace function public.anywork_respond_provider_assignment(
  p_assignment_id uuid,
  p_status text
) returns public.anywork_provider_assignments
language plpgsql
security definer
set search_path=public,private
as $$
declare
  assignment_row public.anywork_provider_assignments;
begin
  if private.anywork_current_role() <> 'provider' then
    raise exception 'Provider access required';
  end if;

  if p_status not in ('Assigned','Declined') then
    raise exception 'Assignment response must be Assigned or Declined';
  end if;

  select * into assignment_row
  from public.anywork_provider_assignments
  where id=p_assignment_id
    and provider_id=auth.uid()
    and status in ('Suggested','Invited')
  for update;

  if not found then
    raise exception 'Assignment invitation is no longer available';
  end if;

  if p_status='Declined' then
    update public.anywork_provider_assignments
    set status='Declined', responded_at=now(), updated_at=now()
    where id=p_assignment_id
    returning * into assignment_row;
    return assignment_row;
  end if;

  update public.anywork_provider_assignments
  set status='Cancelled', updated_at=now()
  where request_id=assignment_row.request_id
    and id<>assignment_row.id
    and status in ('Suggested','Invited');

  update public.anywork_provider_assignments
  set status='Assigned', responded_at=now(), assigned_at=now(), updated_at=now()
  where id=p_assignment_id
  returning * into assignment_row;

  update public.anywork_service_requests
  set selected_provider_id=auth.uid(),
      assigned_at=now(),
      assigned_by=auth.uid(),
      status=case when status='Requested' then 'Quoted' else status end,
      updated_at=now()
  where id=assignment_row.request_id
    and selected_provider_id is null;

  return assignment_row;
end;
$$;

drop policy if exists "Providers respond to own assignments" on public.anywork_provider_assignments;
create policy "Providers respond to own assignments" on public.anywork_provider_assignments
  for update to authenticated
  using(provider_id=auth.uid() and status in ('Suggested','Invited'))
  with check(provider_id=auth.uid());

revoke execute on function public.anywork_respond_provider_assignment(uuid,text) from public,anon;
grant execute on function public.anywork_respond_provider_assignment(uuid,text) to authenticated;
