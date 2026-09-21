-- ANYwork production hardening.
-- Enforce quote creation, job state transitions, provider verification ownership,
-- and payment confirmation rules in the database instead of trusting the browser.

create or replace function public.anywork_create_quote(
  p_request_id uuid,
  p_amount numeric,
  p_availability text default null,
  p_message text default ''
) returns public.anywork_quotes
language plpgsql
security definer
set search_path=public,private
as $$
declare
  request_row public.anywork_service_requests;
  quote_row public.anywork_quotes;
  provider_id_value uuid := auth.uid();
begin
  if private.anywork_current_role() <> 'provider' then
    raise exception 'Provider access required';
  end if;

  select * into request_row
  from public.anywork_service_requests
  where id=p_request_id
    and status in ('Requested','Quoted')
    and selected_provider_id is null;

  if not found then
    raise exception 'Request is no longer open for quotes';
  end if;

  if not exists (
    select 1
    from public.anywork_profiles
    where user_id=provider_id_value
      and role='provider'
      and is_active=true
  ) then
    raise exception 'Provider account is not active';
  end if;

  if not exists (
    select 1
    from public.anywork_provider_services ps
    where ps.provider_id=provider_id_value
      and ps.service_key=request_row.service_key
      and ps.enabled=true
  ) then
    raise exception 'Provider is not enabled for this service';
  end if;

  insert into public.anywork_quotes(
    request_id, provider_id, amount, availability, message, status
  )
  values(
    p_request_id, provider_id_value, p_amount, nullif(trim(p_availability), ''),
    nullif(trim(p_message), ''), 'Pending'
  )
  returning * into quote_row;

  update public.anywork_service_requests
  set status='Quoted', updated_at=now()
  where id=p_request_id;

  return quote_row;
end;
$$;

create or replace function public.anywork_update_job_status(
  p_request_id uuid,
  p_status text
) returns public.anywork_service_requests
language plpgsql
security definer
set search_path=public,private
as $$
declare
  request_row public.anywork_service_requests;
  result_row public.anywork_service_requests;
  is_admin boolean := private.anywork_current_role()='admin';
begin
  select * into request_row
  from public.anywork_service_requests
  where id=p_request_id
    and (selected_provider_id=auth.uid() or is_admin)
  for update;

  if not found then
    raise exception 'Job not found or unauthorized';
  end if;

  if p_status='In Progress' and request_row.status <> 'Scheduled' then
    raise exception 'Only scheduled jobs can be started';
  end if;

  if p_status='Completed' and request_row.status <> 'In Progress' then
    raise exception 'Only in-progress jobs can be completed';
  end if;

  if p_status='Completed' and not is_admin then
    if not exists (
      select 1
      from public.anywork_job_photos
      where request_id=p_request_id
        and photo_type in ('after','completion')
    ) and not exists (
      select 1
      from public.anywork_job_checkins
      where request_id=p_request_id
        and provider_id=auth.uid()
        and checkin_type='completed'
    ) then
      raise exception 'Completion evidence is required before completing the job';
    end if;
  end if;

  update public.anywork_service_requests
  set status=p_status,
      updated_at=now()
  where id=p_request_id
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.anywork_submit_provider_verification(
  p_notes text default null
) returns public.anywork_provider_verifications
language plpgsql
security definer
set search_path=public,private
as $$
declare
  result_row public.anywork_provider_verifications;
begin
  if private.anywork_current_role() <> 'provider' then
    raise exception 'Provider access required';
  end if;

  insert into public.anywork_provider_verifications(
    provider_id,status,identity_verified,business_verified,
    documents_verified,payment_verified,notes,reviewed_by,reviewed_at
  )
  values(
    auth.uid(),'Under Review',false,false,false,false,
    nullif(trim(p_notes),''),null,null
  )
  on conflict(provider_id) do update set
    status='Under Review',
    identity_verified=false,
    business_verified=false,
    documents_verified=false,
    payment_verified=false,
    notes=excluded.notes,
    reviewed_by=null,
    reviewed_at=null
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.anywork_record_manual_payment(
  p_invoice_id uuid,
  p_provider_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text default null
) returns public.anywork_payments
language plpgsql
security definer
set search_path=public,private
as $$
declare
  invoice_row public.anywork_invoices;
  payment_row public.anywork_payments;
  is_admin boolean := private.anywork_current_role()='admin';
begin
  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_method not in ('manual','gcash','maya','bank_transfer','card','other') then
    raise exception 'Unsupported payment method';
  end if;

  select * into invoice_row
  from public.anywork_invoices
  where id=p_invoice_id
    and (customer_id=auth.uid() or is_admin)
  for update;

  if not found then
    raise exception 'Invoice not found or unauthorized';
  end if;

  if invoice_row.status in ('Paid','Void') then
    raise exception 'Invoice cannot accept another payment';
  end if;

  insert into public.anywork_payments(
    invoice_id,customer_id,provider_id,amount,currency,method,status,
    transaction_reference,paid_at
  )
  values(
    invoice_row.id,invoice_row.customer_id,invoice_row.provider_id,
    p_amount,'PHP',p_method,
    case when is_admin then 'Succeeded' else 'Pending' end,
    nullif(trim(p_reference),''),
    case when is_admin then now() else null end
  )
  returning * into payment_row;

  if is_admin then
    update public.anywork_invoices
    set status = case
      when coalesce((select sum(amount) from public.anywork_payments where invoice_id=invoice_row.id and status='Succeeded'),0) >= total
        then 'Paid'
      else 'Partially Paid'
    end,
    paid_at = case
      when coalesce((select sum(amount) from public.anywork_payments where invoice_id=invoice_row.id and status='Succeeded'),0) >= total
        then now()
      else null
    end,
    updated_at=now()
    where id=invoice_row.id;
  end if;

  return payment_row;
end;
$$;

create or replace function public.anywork_confirm_manual_payment(
  p_payment_id uuid
) returns public.anywork_payments
language plpgsql
security definer
set search_path=public,private
as $$
declare
  payment_row public.anywork_payments;
begin
  if private.anywork_current_role() <> 'admin' then
    raise exception 'Admin access required';
  end if;

  update public.anywork_payments
  set status='Succeeded',
      paid_at=coalesce(paid_at,now())
  where id=p_payment_id
    and status='Pending'
  returning * into payment_row;

  if not found then
    raise exception 'Pending payment not found';
  end if;

  update public.anywork_invoices
  set status = case
    when coalesce((select sum(amount) from public.anywork_payments where invoice_id=payment_row.invoice_id and status='Succeeded'),0) >= total
      then 'Paid'
    else 'Partially Paid'
  end,
  paid_at = case
    when coalesce((select sum(amount) from public.anywork_payments where invoice_id=payment_row.invoice_id and status='Succeeded'),0) >= total
      then now()
    else null
  end,
  updated_at=now()
  where id=payment_row.invoice_id;

  return payment_row;
end;
$$;

-- Verification decisions belong to operations, not providers.
drop policy if exists "Providers update verification request" on public.anywork_provider_verifications;
create policy "Providers update verification request" on public.anywork_provider_verifications
  for update to authenticated
  using(private.anywork_current_role()='admin')
  with check(private.anywork_current_role()='admin');

drop policy if exists "Admins update provider verification" on public.anywork_provider_verifications;
create policy "Admins update provider verification" on public.anywork_provider_verifications
  for update to authenticated
  using(private.anywork_current_role()='admin')
  with check(private.anywork_current_role()='admin');

-- Payments are created through security-definer RPCs; clients cannot insert
-- succeeded payment records directly.
revoke insert, update, delete on public.anywork_payments from authenticated;
grant select on public.anywork_payments to authenticated;

revoke execute on function public.anywork_record_manual_payment(uuid,uuid,numeric,text,text) from public,anon;
revoke execute on function public.anywork_confirm_manual_payment(uuid) from public,anon;
revoke execute on function public.anywork_submit_provider_verification(text) from public,anon;
revoke execute on function public.anywork_create_quote(uuid,numeric,text,text) from public,anon;
revoke execute on function public.anywork_update_job_status(uuid,text) from public,anon;

grant execute on function public.anywork_record_manual_payment(uuid,uuid,numeric,text,text) to authenticated;
grant execute on function public.anywork_confirm_manual_payment(uuid) to authenticated;
grant execute on function public.anywork_submit_provider_verification(text) to authenticated;
grant execute on function public.anywork_create_quote(uuid,numeric,text,text) to authenticated;
grant execute on function public.anywork_update_job_status(uuid,text) to authenticated;

-- Keep the existing direct quote insert policy but narrow it so providers must
-- be operating inside their enabled service catalog. Normal clients use the RPC.
drop policy if exists "Providers create quotes" on public.anywork_quotes;
create policy "Providers create quotes" on public.anywork_quotes
  for insert to authenticated
  with check (
    provider_id=auth.uid()
    and exists (
      select 1
      from public.anywork_service_requests r
      join public.anywork_provider_services ps
        on ps.provider_id=auth.uid()
       and ps.service_key=r.service_key
       and ps.enabled=true
      where r.id=request_id
        and r.status in ('Requested','Quoted')
        and r.selected_provider_id is null
    )
  );
