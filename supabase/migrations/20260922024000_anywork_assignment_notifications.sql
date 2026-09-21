-- Notify customer and provider when dispatch assigns a provider.
create or replace function private.anywork_notify_provider_assignment()
returns trigger language plpgsql security definer set search_path=public,private as $$
declare r public.anywork_service_requests;
begin
 if new.status='Assigned' and (tg_op='INSERT' or old.status is distinct from new.status) then
   select * into r from public.anywork_service_requests where id=new.request_id;
   insert into public.anywork_notifications(user_id,type,title,body,request_id)
   values(new.provider_id,'job.assigned','New job assigned','A service request has been assigned to your business.',new.request_id);
   if r.customer_id is not null then
     insert into public.anywork_notifications(user_id,type,title,body,request_id)
     values(r.customer_id,'provider.assigned','Provider assigned','A provider has been assigned to your service request.',new.request_id);
   end if;
 end if;
 return new;
end;
$$;

drop trigger if exists anywork_provider_assignment_notification on public.anywork_provider_assignments;
create trigger anywork_provider_assignment_notification after insert or update of status on public.anywork_provider_assignments
for each row execute function private.anywork_notify_provider_assignment();
revoke execute on function private.anywork_notify_provider_assignment() from public,anon,authenticated;
