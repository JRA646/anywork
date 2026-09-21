drop policy if exists "AnyWork providers can update assigned job status" on public.anywork_service_requests;
create policy "AnyWork providers can update assigned job status"
on public.anywork_service_requests
for update to authenticated
using (selected_provider_id = (select auth.uid()))
with check (selected_provider_id = (select auth.uid()));

create or replace function private.anywork_validate_provider_job_update()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.anywork_current_role() = 'provider'
     and old.selected_provider_id = auth.uid() then
    if new.customer_id is distinct from old.customer_id
       or new.service_key is distinct from old.service_key
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.location is distinct from old.location
       or new.preferred_date is distinct from old.preferred_date
       or new.access_notes is distinct from old.access_notes
       or new.budget is distinct from old.budget
       or new.selected_provider_id is distinct from old.selected_provider_id
       or new.request_number is distinct from old.request_number
       or new.created_at is distinct from old.created_at then
      raise exception 'Providers may only update job status';
    end if;

    if old.status = 'Scheduled' and new.status not in ('Scheduled','In Progress') then
      raise exception 'A scheduled job can only move to In Progress';
    end if;

    if old.status = 'In Progress' and new.status not in ('In Progress','Completed') then
      raise exception 'An in-progress job can only move to Completed';
    end if;

    if old.status = 'Completed' and new.status <> 'Completed' then
      raise exception 'Completed jobs cannot be reopened by providers';
    end if;

    if old.status not in ('Scheduled','In Progress','Completed')
       and new.status <> old.status then
      raise exception 'The customer must confirm scheduling before the provider starts the job';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.anywork_validate_provider_job_update() from public, anon, authenticated;

drop trigger if exists anywork_validate_provider_job_update on public.anywork_service_requests;
create trigger anywork_validate_provider_job_update
before update on public.anywork_service_requests
for each row
execute function private.anywork_validate_provider_job_update();
