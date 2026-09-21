-- ANYwork security/policy hardening and production RPCs.
create or replace function public.anywork_create_invoice(
  p_request_id uuid,p_items jsonb,p_tax numeric default 0,p_discount numeric default 0,p_due_at timestamptz default null
) returns public.anywork_invoices language plpgsql security definer set search_path=public,private as $$
declare r public.anywork_service_requests; inv public.anywork_invoices; item jsonb; subtotal numeric:=0;
begin
 select * into r from public.anywork_service_requests where id=p_request_id and (customer_id=auth.uid() or selected_provider_id=auth.uid() or private.anywork_current_role()='admin');
 if not found then raise exception 'Request not found'; end if;
 if r.selected_provider_id is null then raise exception 'Provider not selected'; end if;
 insert into public.anywork_invoices(request_id,customer_id,provider_id,invoice_number,status,tax,discount,due_at,issued_at)
 values(p_request_id,r.customer_id,r.selected_provider_id,'AW-INV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),'Issued',coalesce(p_tax,0),coalesce(p_discount,0),p_due_at,now()) returning * into inv;
 for item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
  insert into public.anywork_invoice_items(invoice_id,description,quantity,unit_price,amount)
  values(inv.id,item->>'description',coalesce((item->>'quantity')::numeric,1),coalesce((item->>'unit_price')::numeric,0),coalesce((item->>'amount')::numeric,0));
  subtotal:=subtotal+coalesce((item->>'amount')::numeric,0);
 end loop;
 update public.anywork_invoices set subtotal=subtotal,total=greatest(0,subtotal+coalesce(p_tax,0)-coalesce(p_discount,0)) where id=inv.id returning * into inv;
 return inv;
end; $$;

create or replace function public.anywork_open_dispute(p_request_id uuid,p_reason text,p_description text)
returns public.anywork_disputes language plpgsql security definer set search_path=public,private as $$
declare r public.anywork_service_requests; d public.anywork_disputes;
begin
 select * into r from public.anywork_service_requests where id=p_request_id and (customer_id=auth.uid() or selected_provider_id=auth.uid());
 if not found then raise exception 'Request not found or not authorized'; end if;
 insert into public.anywork_disputes(request_id,opened_by,reason,description) values(p_request_id,auth.uid(),p_reason,p_description) returning * into d;
 return d;
end; $$;

alter view public.anywork_dispatch_queue set (security_invoker=true);

drop policy if exists "Users manage own addresses" on public.anywork_addresses;
create policy "Users manage own addresses" on public.anywork_addresses for all to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin') with check(user_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Users manage own favorites" on public.anywork_favorites;
create policy "Users manage own favorites" on public.anywork_favorites for all to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin') with check(user_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Users manage own request answers" on public.anywork_request_answers;
create policy "Users manage own request answers" on public.anywork_request_answers for all to authenticated using(exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin') with check(exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin');
drop policy if exists "Providers manage availability" on public.anywork_provider_availability;
create policy "Providers manage availability" on public.anywork_provider_availability for all to authenticated using(provider_id=auth.uid() or private.anywork_current_role()='admin') with check(provider_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Providers manage time off" on public.anywork_provider_time_off;
create policy "Providers manage time off" on public.anywork_provider_time_off for all to authenticated using(provider_id=auth.uid() or private.anywork_current_role()='admin') with check(provider_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Job participants manage checkins" on public.anywork_job_checkins;
create policy "Job participants manage checkins" on public.anywork_job_checkins for all to authenticated using(provider_id=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin') with check(provider_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Job participants manage photos" on public.anywork_job_photos;
create policy "Job participants manage photos" on public.anywork_job_photos for all to authenticated using(uploaded_by=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid())) or private.anywork_current_role()='admin') with check(uploaded_by=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Admins view email jobs" on public.anywork_email_jobs;
create policy "Admins view email jobs" on public.anywork_email_jobs for select to authenticated using(private.anywork_current_role()='admin');
drop policy if exists "Request rate limit deny public access" on public.anywork_request_rate_limits;
create policy "Request rate limit deny public access" on public.anywork_request_rate_limits for all to authenticated using(false) with check(false);

grant execute on function public.anywork_create_invoice(uuid,jsonb,numeric,numeric,timestamptz) to authenticated;
grant execute on function public.anywork_open_dispute(uuid,text,text) to authenticated;
revoke execute on function public.anywork_accept_quote(uuid,uuid) from public,anon;
revoke execute on function public.anywork_confirm_schedule(uuid,timestamptz,timestamptz,text) from public,anon;
revoke execute on function public.anywork_assign_provider(uuid,uuid) from public,anon;
revoke execute on function public.anywork_generate_provider_matches(uuid) from public,anon;
revoke execute on function public.anywork_match_request_providers(uuid) from public,anon;
revoke execute on function public.anywork_create_invoice(uuid,jsonb,numeric,numeric,timestamptz) from public,anon;
revoke execute on function public.anywork_open_dispute(uuid,text,text) from public,anon;
revoke execute on function public.anywork_notify_message() from public,anon,authenticated;
revoke execute on function public.anywork_notify_quote_change() from public,anon,authenticated;
revoke execute on function public.anywork_notify_request_change() from public,anon,authenticated;
revoke execute on function public.anywork_queue_quote_email() from public,anon,authenticated;
revoke execute on function public.anywork_record_quote_event() from public,anon,authenticated;
revoke execute on function public.anywork_record_request_event() from public,anon,authenticated;
revoke execute on function private.anywork_request_number() from public,anon,authenticated;
revoke execute on function private.anywork_request_before_insert() from public,anon,authenticated;
revoke execute on function private.anywork_distance_km(numeric,numeric,numeric,numeric) from public,anon,authenticated;
