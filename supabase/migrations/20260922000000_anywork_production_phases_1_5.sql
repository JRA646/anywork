-- ANYwork production marketplace phases 1-5.
-- Adds dynamic service forms, customer addresses/favorites, provider scheduling,
-- job check-in/evidence, invoices/payments, reviews, verification, disputes,
-- support tickets and audit logs.

create extension if not exists pgcrypto;

create table if not exists public.anywork_service_fields (
  id uuid primary key default gen_random_uuid(),
  service_id text not null references public.anywork_services(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null check (field_type in ('text','textarea','number','select','multiselect','radio','checkbox','boolean','date','time','address','photo','file','budget')),
  required boolean not null default false,
  placeholder text,
  help_text text,
  options jsonb not null default '[]'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_id, field_key)
);

create table if not exists public.anywork_request_answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  field_id uuid not null references public.anywork_service_fields(id) on delete cascade,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id, field_id)
);

create table if not exists public.anywork_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  label text not null,
  address_line1 text not null,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'Philippines',
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  provider_id uuid references public.anywork_profiles(user_id) on delete cascade,
  service_id text references public.anywork_services(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((provider_id is not null) <> (service_id is not null))
);
create unique index if not exists anywork_favorites_provider_unique on public.anywork_favorites(user_id, provider_id) where provider_id is not null;
create unique index if not exists anywork_favorites_service_unique on public.anywork_favorites(user_id, service_id) where service_id is not null;

create table if not exists public.anywork_provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(provider_id, weekday)
);

create table if not exists public.anywork_provider_time_off (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.anywork_job_checkins (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  checkin_type text not null check (checkin_type in ('on_way','arrived','started','paused','resumed','completed')),
  latitude numeric(10,7),
  longitude numeric(10,7),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.anywork_job_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  uploaded_by uuid not null references public.anywork_profiles(user_id) on delete cascade,
  photo_type text not null check (photo_type in ('before','during','after','completion','invoice','other')),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.anywork_invoices (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  customer_id uuid not null references public.anywork_profiles(user_id) on delete restrict,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete restrict,
  invoice_number text not null unique,
  status text not null default 'Draft' check (status in ('Draft','Issued','Partially Paid','Paid','Void','Overdue')),
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  due_at timestamptz,
  issued_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.anywork_invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.anywork_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.anywork_invoices(id) on delete restrict,
  customer_id uuid not null references public.anywork_profiles(user_id) on delete restrict,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'PHP',
  method text not null default 'manual' check (method in ('manual','gcash','maya','bank_transfer','card','other')),
  status text not null default 'Pending' check (status in ('Pending','Succeeded','Failed','Refunded','Cancelled')),
  transaction_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.anywork_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.anywork_service_requests(id) on delete cascade,
  customer_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.anywork_provider_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.anywork_service_requests(id) on delete cascade,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  customer_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.anywork_provider_verifications (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.anywork_profiles(user_id) on delete cascade,
  status text not null default 'Pending' check (status in ('Pending','Under Review','Verified','Rejected')),
  identity_verified boolean not null default false,
  business_verified boolean not null default false,
  documents_verified boolean not null default false,
  payment_verified boolean not null default false,
  notes text,
  reviewed_by uuid references public.anywork_profiles(user_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_disputes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  opened_by uuid not null references public.anywork_profiles(user_id) on delete restrict,
  assigned_to uuid references public.anywork_profiles(user_id) on delete set null,
  reason text not null,
  description text not null,
  status text not null default 'Open' check (status in ('Open','Under Review','Waiting Customer','Waiting Provider','Resolved','Closed')),
  resolution text,
  resolved_by uuid references public.anywork_profiles(user_id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  user_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  subject text not null,
  description text not null,
  priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  status text not null default 'Open' check (status in ('Open','In Progress','Waiting','Resolved','Closed')),
  assigned_to uuid references public.anywork_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.anywork_profiles(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists anywork_service_fields_service_idx on public.anywork_service_fields(service_id, sort_order);
create index if not exists anywork_request_answers_request_idx on public.anywork_request_answers(request_id);
create index if not exists anywork_addresses_user_idx on public.anywork_addresses(user_id);
create index if not exists anywork_checkins_request_idx on public.anywork_job_checkins(request_id, created_at);
create index if not exists anywork_job_photos_request_idx on public.anywork_job_photos(request_id, photo_type, created_at);
create index if not exists anywork_invoices_customer_idx on public.anywork_invoices(customer_id, created_at desc);
create index if not exists anywork_invoices_provider_idx on public.anywork_invoices(provider_id, created_at desc);
create index if not exists anywork_payments_invoice_idx on public.anywork_payments(invoice_id, created_at desc);
create index if not exists anywork_disputes_status_idx on public.anywork_disputes(status, created_at desc);
create index if not exists anywork_support_status_idx on public.anywork_support_tickets(status, created_at desc);
create index if not exists anywork_audit_logs_entity_idx on public.anywork_audit_logs(entity_type, entity_id, created_at desc);

create or replace function private.anywork_ticket_number()
returns text language plpgsql as $$
begin
  return 'SUP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
end;
$$;

create or replace function private.anywork_invoice_number()
returns text language plpgsql as $$
begin
  return 'AW-INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
end;
$$;

create or replace function private.anywork_audit_trigger()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  insert into public.anywork_audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), tg_op, tg_table_name, coalesce(new.id::text, old.id::text), '{}'::jsonb);
  return coalesce(new, old);
end;
$$;

drop trigger if exists anywork_request_audit on public.anywork_service_requests;
create trigger anywork_request_audit after insert or update or delete on public.anywork_service_requests
for each row execute function private.anywork_audit_trigger();

drop trigger if exists anywork_quote_audit on public.anywork_quotes;
create trigger anywork_quote_audit after insert or update or delete on public.anywork_quotes
for each row execute function private.anywork_audit_trigger();

drop trigger if exists anywork_invoice_updated_at on public.anywork_invoices;
create trigger anywork_invoice_updated_at before update on public.anywork_invoices
for each row execute function private.anywork_set_updated_at();

drop trigger if exists anywork_dispute_updated_at on public.anywork_disputes;
create trigger anywork_dispute_updated_at before update on public.anywork_disputes
for each row execute function private.anywork_set_updated_at();

drop trigger if exists anywork_ticket_updated_at on public.anywork_support_tickets;
create trigger anywork_ticket_updated_at before update on public.anywork_support_tickets
for each row execute function private.anywork_set_updated_at();

create or replace function public.anywork_create_invoice(
  p_request_id uuid,
  p_items jsonb,
  p_tax numeric default 0,
  p_discount numeric default 0,
  p_due_at timestamptz default null
) returns public.anywork_invoices
language plpgsql security definer set search_path=public,private as $$
declare
  r public.anywork_service_requests;
  inv public.anywork_invoices;
  item jsonb;
  subtotal numeric := 0;
begin
  select * into r from public.anywork_service_requests where id=p_request_id
    and (customer_id=auth.uid() or selected_provider_id=auth.uid() or private.anywork_current_role()='admin');
  if not found then raise exception 'Request not found'; end if;
  if r.selected_provider_id is null then raise exception 'Provider not selected'; end if;

  insert into public.anywork_invoices(request_id,customer_id,provider_id,invoice_number,status,tax,discount,due_at,issued_at)
  values(p_request_id,r.customer_id,r.selected_provider_id,private.anywork_invoice_number(),'Issued',coalesce(p_tax,0),coalesce(p_discount,0),p_due_at,now())
  returning * into inv;

  for item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.anywork_invoice_items(invoice_id,description,quantity,unit_price,amount)
    values(inv.id,item->>'description',coalesce((item->>'quantity')::numeric,1),coalesce((item->>'unit_price')::numeric,0),coalesce((item->>'amount')::numeric,0));
    subtotal := subtotal + coalesce((item->>'amount')::numeric,0);
  end loop;

  update public.anywork_invoices set subtotal=subtotal,total=greatest(0,subtotal+coalesce(p_tax,0)-coalesce(p_discount,0)) where id=inv.id
  returning * into inv;
  return inv;
end;
$$;

create or replace function public.anywork_open_dispute(
  p_request_id uuid,
  p_reason text,
  p_description text
) returns public.anywork_disputes
language plpgsql security definer set search_path=public,private as $$
declare r public.anywork_service_requests; d public.anywork_disputes;
begin
  select * into r from public.anywork_service_requests where id=p_request_id
    and (customer_id=auth.uid() or selected_provider_id=auth.uid());
  if not found then raise exception 'Request not found or not authorized'; end if;
  insert into public.anywork_disputes(request_id,opened_by,reason,description)
  values(p_request_id,auth.uid(),p_reason,p_description) returning * into d;
  return d;
end;
$$;

alter table public.anywork_service_fields enable row level security;
alter table public.anywork_request_answers enable row level security;
alter table public.anywork_addresses enable row level security;
alter table public.anywork_favorites enable row level security;
alter table public.anywork_provider_availability enable row level security;
alter table public.anywork_provider_time_off enable row level security;
alter table public.anywork_job_checkins enable row level security;
alter table public.anywork_job_photos enable row level security;
alter table public.anywork_invoices enable row level security;
alter table public.anywork_invoice_items enable row level security;
alter table public.anywork_payments enable row level security;
alter table public.anywork_provider_reviews enable row level security;
alter table public.anywork_provider_verifications enable row level security;
alter table public.anywork_disputes enable row level security;
alter table public.anywork_support_tickets enable row level security;
alter table public.anywork_audit_logs enable row level security;

create policy "Service fields are public" on public.anywork_service_fields for select to anon,authenticated using (enabled=true or private.anywork_current_role()='admin');
create policy "Admins manage service fields" on public.anywork_service_fields for all to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

create policy "Users manage own request answers" on public.anywork_request_answers for all to authenticated
using (exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin')
with check (exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin');

create policy "Users manage own addresses" on public.anywork_addresses for all to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin') with check(user_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Users manage own favorites" on public.anywork_favorites for all to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin') with check(user_id=auth.uid() or private.anywork_current_role()='admin');

create policy "Providers manage availability" on public.anywork_provider_availability for all to authenticated using(provider_id=auth.uid() or private.anywork_current_role()='admin') with check(provider_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Providers manage time off" on public.anywork_provider_time_off for all to authenticated using(provider_id=auth.uid() or private.anywork_current_role()='admin') with check(provider_id=auth.uid() or private.anywork_current_role()='admin');

create policy "Job participants manage checkins" on public.anywork_job_checkins for all to authenticated
using(provider_id=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin')
with check(provider_id=auth.uid() or private.anywork_current_role()='admin');

create policy "Job participants manage photos" on public.anywork_job_photos for all to authenticated
using(uploaded_by=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid())) or private.anywork_current_role()='admin')
with check(uploaded_by=auth.uid() or private.anywork_current_role()='admin');

create policy "Invoice participants view" on public.anywork_invoices for select to authenticated using(customer_id=auth.uid() or provider_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Invoice items participants view" on public.anywork_invoice_items for select to authenticated using(exists(select 1 from public.anywork_invoices i where i.id=invoice_id and (i.customer_id=auth.uid() or i.provider_id=auth.uid() or private.anywork_current_role()='admin')));
create policy "Payments participants view" on public.anywork_payments for select to authenticated using(customer_id=auth.uid() or provider_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Payments participants insert" on public.anywork_payments for insert to authenticated with check(customer_id=auth.uid() or private.anywork_current_role()='admin');

create policy "Provider reviews visible" on public.anywork_provider_reviews for select to authenticated using(provider_id=auth.uid() or customer_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Customers create provider reviews" on public.anywork_provider_reviews for insert to authenticated with check(customer_id=auth.uid() and exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid() and r.status='Completed'));

create policy "Providers view own verification" on public.anywork_provider_verifications for select to authenticated using(provider_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Providers create verification" on public.anywork_provider_verifications for insert to authenticated with check(provider_id=auth.uid());
create policy "Admins manage verification" on public.anywork_provider_verifications for all to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

create policy "Participants view disputes" on public.anywork_disputes for select to authenticated using(opened_by=auth.uid() or assigned_to=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid())) or private.anywork_current_role()='admin');
create policy "Participants open disputes" on public.anywork_disputes for insert to authenticated with check(opened_by=auth.uid());
create policy "Admins manage disputes" on public.anywork_disputes for update to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

create policy "Users manage own support tickets" on public.anywork_support_tickets for select to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Users create support tickets" on public.anywork_support_tickets for insert to authenticated with check(user_id=auth.uid());
create policy "Admins manage support tickets" on public.anywork_support_tickets for update to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

create policy "Admins view audit logs" on public.anywork_audit_logs for select to authenticated using(private.anywork_current_role()='admin');

grant select on public.anywork_service_fields to anon,authenticated;
grant select,insert,update,delete on public.anywork_request_answers, public.anywork_addresses, public.anywork_favorites, public.anywork_provider_availability, public.anywork_provider_time_off to authenticated;
grant select,insert,update,delete on public.anywork_job_checkins, public.anywork_job_photos to authenticated;
grant select on public.anywork_invoices, public.anywork_invoice_items, public.anywork_payments, public.anywork_provider_reviews, public.anywork_provider_verifications, public.anywork_disputes, public.anywork_support_tickets, public.anywork_audit_logs to authenticated;
grant insert on public.anywork_provider_reviews, public.anywork_provider_verifications, public.anywork_disputes, public.anywork_support_tickets to authenticated;
grant update on public.anywork_provider_verifications, public.anywork_disputes, public.anywork_support_tickets to authenticated;
grant execute on function public.anywork_create_invoice(uuid,jsonb,numeric,numeric,timestamptz) to authenticated;
grant execute on function public.anywork_open_dispute(uuid,text,text) to authenticated;

insert into public.anywork_provider_verifications(provider_id)
select user_id from public.anywork_profiles
where role='provider'
on conflict(provider_id) do nothing;
