-- Billing permission hardening.
create or replace function public.anywork_create_invoice(
  p_request_id uuid,
  p_items jsonb,
  p_tax numeric default 0,
  p_discount numeric default 0,
  p_due_at timestamptz default null
) returns public.anywork_invoices
language plpgsql
security definer
set search_path=public,private
as $$
declare
  r public.anywork_service_requests;
  inv public.anywork_invoices;
  item jsonb;
  subtotal numeric:=0;
  is_admin boolean := private.anywork_current_role()='admin';
begin
  if private.anywork_current_role() not in ('provider','admin') then
    raise exception 'Provider or admin access required';
  end if;

  select * into r
  from public.anywork_service_requests
  where id=p_request_id
    and (selected_provider_id=auth.uid() or is_admin);

  if not found then
    raise exception 'Request not found or unauthorized';
  end if;

  if r.selected_provider_id is null then
    raise exception 'Provider not selected';
  end if;

  insert into public.anywork_invoices(
    request_id,customer_id,provider_id,invoice_number,status,tax,discount,due_at,issued_at
  )
  values(
    p_request_id,r.customer_id,r.selected_provider_id,
    'AW-INV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    'Issued',coalesce(p_tax,0),coalesce(p_discount,0),p_due_at,now()
  )
  returning * into inv;

  for item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.anywork_invoice_items(
      invoice_id,description,quantity,unit_price,amount
    )
    values(
      inv.id,
      item->>'description',
      coalesce((item->>'quantity')::numeric,1),
      coalesce((item->>'unit_price')::numeric,0),
      coalesce((item->>'amount')::numeric,0)
    );
    subtotal:=subtotal+coalesce((item->>'amount')::numeric,0);
  end loop;

  update public.anywork_invoices
  set subtotal=subtotal,
      total=greatest(0,subtotal+coalesce(p_tax,0)-coalesce(p_discount,0))
  where id=inv.id
  returning * into inv;

  return inv;
end;
$$;

revoke execute on function public.anywork_create_invoice(uuid,jsonb,numeric,numeric,timestamptz) from public,anon;
grant execute on function public.anywork_create_invoice(uuid,jsonb,numeric,numeric,timestamptz) to authenticated;
