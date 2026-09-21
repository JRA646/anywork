-- ANYwork complete module schema hardening.
-- This migration makes every Phase 1-5 module independently deployable and
-- creates the shared marketplace tables when they do not already exist.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Dynamic service catalog
-- ---------------------------------------------------------------------------
create table if not exists public.anywork_service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_service_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.anywork_service_categories(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, name)
);

-- ---------------------------------------------------------------------------
-- 2. Core marketplace tables
-- ---------------------------------------------------------------------------
create table if not exists public.anywork_service_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  customer_id uuid references public.anywork_profiles(user_id) on delete set null,
  requester_name text,
  requester_email text,
  requester_phone text,
  service_key text not null,
  title text not null,
  description text not null,
  location text not null,
  preferred_date timestamptz,
  access_notes text,
  budget numeric(12,2),
  status text not null default 'Requested' check (status in ('Requested','Quoted','Scheduled','In Progress','Completed')),
  selected_provider_id uuid references public.anywork_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.anywork_service_requests add column if not exists request_number text;
alter table public.anywork_service_requests add column if not exists requester_name text;
alter table public.anywork_service_requests add column if not exists requester_email text;
alter table public.anywork_service_requests add column if not exists requester_phone text;
alter table public.anywork_service_requests add column if not exists service_key text;
alter table public.anywork_service_requests add column if not exists title text;
alter table public.anywork_service_requests add column if not exists description text;
alter table public.anywork_service_requests add column if not exists location text;
alter table public.anywork_service_requests add column if not exists preferred_date timestamptz;
alter table public.anywork_service_requests add column if not exists access_notes text;
alter table public.anywork_service_requests add column if not exists budget numeric(12,2);
alter table public.anywork_service_requests add column if not exists status text default 'Requested';
alter table public.anywork_service_requests add column if not exists selected_provider_id uuid;
alter table public.anywork_service_requests add column if not exists created_at timestamptz default now();
alter table public.anywork_service_requests add column if not exists updated_at timestamptz default now();

update public.anywork_service_requests
set request_number = private.anywork_request_number()
where nullif(trim(request_number),'') is null;

create unique index if not exists anywork_requests_number_idx on public.anywork_service_requests(request_number);
create index if not exists anywork_requests_customer_idx on public.anywork_service_requests(customer_id, created_at desc);
create index if not exists anywork_requests_provider_idx on public.anywork_service_requests(selected_provider_id, created_at desc);
create index if not exists anywork_requests_status_idx on public.anywork_service_requests(status, created_at desc);

create table if not exists public.anywork_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  availability text,
  message text not null default '',
  status text not null default 'Pending' check (status in ('Pending','Accepted','Declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists anywork_quotes_request_idx on public.anywork_quotes(request_id, created_at desc);
create index if not exists anywork_quotes_provider_idx on public.anywork_quotes(provider_id, created_at desc);

create table if not exists public.anywork_provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  service_key text not null references public.anywork_services(id) on delete cascade,
  enabled boolean not null default true,
  starting_price numeric(12,2),
  minimum_job_value numeric(12,2),
  service_area text,
  lead_time_days integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, service_key)
);

create table if not exists public.anywork_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.anywork_service_requests(id) on delete cascade,
  sender_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  receiver_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists anywork_messages_request_idx on public.anywork_messages(request_id, created_at);
create index if not exists anywork_messages_receiver_idx on public.anywork_messages(receiver_id, read_at, created_at desc);

create table if not exists public.anywork_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  request_id uuid references public.anywork_service_requests(id) on delete cascade,
  quote_id uuid references public.anywork_quotes(id) on delete cascade,
  message_id uuid references public.anywork_messages(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists anywork_notifications_user_idx on public.anywork_notifications(user_id, created_at desc);

create table if not exists public.anywork_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references public.anywork_profiles(user_id) on delete set null,
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists anywork_request_events_request_idx on public.anywork_request_events(request_id, created_at);

create table if not exists public.anywork_job_schedules (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.anywork_service_requests(id) on delete cascade,
  proposed_start timestamptz,
  proposed_end timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.anywork_profiles(user_id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_job_activities (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  actor_user_id uuid references public.anywork_profiles(user_id) on delete set null,
  activity_type text not null,
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists anywork_job_activities_request_idx on public.anywork_job_activities(request_id, created_at);

create table if not exists public.anywork_change_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  description text not null,
  amount_delta numeric(12,2) not null default 0,
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  approved_by uuid references public.anywork_profiles(user_id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists anywork_change_requests_request_idx on public.anywork_change_requests(request_id, created_at desc);

create table if not exists public.anywork_request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  customer_id uuid references public.anywork_profiles(user_id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists anywork_request_photos_request_idx on public.anywork_request_photos(request_id, created_at);

create table if not exists public.anywork_guest_request_access (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.anywork_service_requests(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Dynamic request answers
-- ---------------------------------------------------------------------------
create table if not exists public.anywork_service_fields (
  id uuid primary key default gen_random_uuid(),
  service_id text not null references public.anywork_services(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null,
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

-- ---------------------------------------------------------------------------
-- 4. Customer/provider operations
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5. Money, trust and support
-- ---------------------------------------------------------------------------
create table if not exists public.anywork_invoices (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  customer_id uuid not null references public.anywork_profiles(user_id) on delete restrict,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete restrict,
  invoice_number text not null unique,
  status text not null default 'Draft',
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
  method text not null default 'manual',
  status text not null default 'Pending',
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
  status text not null default 'Pending',
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
  status text not null default 'Open',
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
  priority text not null default 'Normal',
  status text not null default 'Open',
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

-- ---------------------------------------------------------------------------
-- 6. Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anywork-job-files', 'anywork-job-files', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Request-photo bucket is separate because these files are customer-owned request attachments.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anywork-request-photos', 'anywork-request-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 7. Shared timestamps / request number / events / notifications
-- ---------------------------------------------------------------------------
create or replace function private.anywork_request_number()
returns text language plpgsql as $$
declare result text;
begin
  result := 'AW-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  return result;
end;
$$;

create or replace function private.anywork_request_before_insert()
returns trigger language plpgsql as $$
begin
  if nullif(trim(new.request_number),'') is null then new.request_number := private.anywork_request_number(); end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists anywork_request_before_insert on public.anywork_service_requests;
create trigger anywork_request_before_insert before insert or update on public.anywork_service_requests
for each row execute function private.anywork_request_before_insert();

create or replace function private.anywork_record_request_event()
returns trigger language plpgsql security definer set search_path=public,private as $$
declare event_title text;
begin
  if tg_op='INSERT' then
    event_title := 'Request created';
    insert into public.anywork_request_events(request_id,event_type,actor_user_id,title,detail)
    values(new.id,'created',auth.uid(),event_title,new.title);
  elsif old.status is distinct from new.status then
    insert into public.anywork_request_events(request_id,event_type,actor_user_id,title,detail,metadata)
    values(new.id,'status_changed',auth.uid(),'Request status updated',old.status || ' → ' || new.status,jsonb_build_object('from',old.status,'to',new.status));
  end if;
  return new;
end;
$$;

drop trigger if exists anywork_request_events_trigger on public.anywork_service_requests;
create trigger anywork_request_events_trigger after insert or update of status on public.anywork_service_requests
for each row execute function private.anywork_record_request_event();

create or replace function private.anywork_notify_quote()
returns trigger language plpgsql security definer set search_path=public,private as $$
declare customer_id_value uuid;
begin
  select customer_id into customer_id_value from public.anywork_service_requests where id=new.request_id;
  if customer_id_value is not null then
    insert into public.anywork_notifications(user_id,type,title,body,request_id,quote_id)
    values(customer_id_value,'quote.created','New quote received','A provider submitted a quote for your request.',new.request_id,new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists anywork_quote_notification on public.anywork_quotes;
create trigger anywork_quote_notification after insert on public.anywork_quotes
for each row execute function private.anywork_notify_quote();

create or replace function private.anywork_notify_message()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  insert into public.anywork_notifications(user_id,type,title,body,request_id,message_id)
  values(new.receiver_id,'message.new','New message',left(new.body,160),new.request_id,new.id);
  return new;
end;
$$;

drop trigger if exists anywork_message_notification on public.anywork_messages;
create trigger anywork_message_notification after insert on public.anywork_messages
for each row execute function private.anywork_notify_message();

-- ---------------------------------------------------------------------------
-- 8. Atomic quote acceptance and schedule confirmation
-- ---------------------------------------------------------------------------
create or replace function public.anywork_accept_quote(p_request_id uuid,p_quote_id uuid)
returns public.anywork_quotes
language plpgsql security definer set search_path=public,private as $$
declare
  request_row public.anywork_service_requests;
  selected public.anywork_quotes;
begin
  select * into request_row
  from public.anywork_service_requests
  where id=p_request_id and customer_id=auth.uid()
  for update;
  if not found then raise exception 'Request not found or unauthorized'; end if;

  update public.anywork_quotes set status='Declined',updated_at=now()
  where request_id=p_request_id and id<>p_quote_id;

  update public.anywork_quotes
  set status='Accepted',updated_at=now()
  where id=p_quote_id and request_id=p_request_id
  returning * into selected;

  if not found then raise exception 'Quote not found'; end if;

  update public.anywork_service_requests
  set selected_provider_id=selected.provider_id,status='Quoted',updated_at=now()
  where id=p_request_id;

  return selected;
end;
$$;

create or replace function public.anywork_confirm_schedule(
  p_request_id uuid,
  p_start timestamptz,
  p_end timestamptz default null,
  p_notes text default null
) returns public.anywork_service_requests
language plpgsql security definer set search_path=public,private as $$
declare request_row public.anywork_service_requests;
declare result_row public.anywork_service_requests;
begin
  select * into request_row from public.anywork_service_requests
  where id=p_request_id
    and (customer_id=auth.uid() or selected_provider_id=auth.uid() or private.anywork_current_role()='admin')
  for update;
  if not found then raise exception 'Request not found or unauthorized'; end if;
  insert into public.anywork_job_schedules(request_id,proposed_start,proposed_end,confirmed_at,confirmed_by,notes)
  values(p_request_id,p_start,p_end,now(),auth.uid(),p_notes)
  on conflict(request_id) do update set
    proposed_start=excluded.proposed_start,
    proposed_end=excluded.proposed_end,
    confirmed_at=excluded.confirmed_at,
    confirmed_by=excluded.confirmed_by,
    notes=excluded.notes,
    updated_at=now();
  update public.anywork_service_requests set status='Scheduled',updated_at=now()
  where id=p_request_id returning * into result_row;
  return result_row;
end;
$$;


-- Audit important operational changes across the production modules.
create or replace function private.anywork_audit_trigger()
returns trigger language plpgsql security definer set search_path=public,private as $
begin
  insert into public.anywork_audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), tg_op, tg_table_name, coalesce(new.id::text, old.id::text), jsonb_build_object('timestamp',now()));
  return coalesce(new, old);
end;
$;

drop trigger if exists anywork_provider_verification_audit on public.anywork_provider_verifications;
create trigger anywork_provider_verification_audit after insert or update or delete on public.anywork_provider_verifications for each row execute function private.anywork_audit_trigger();

drop trigger if exists anywork_invoice_audit on public.anywork_invoices;
create trigger anywork_invoice_audit after insert or update or delete on public.anywork_invoices for each row execute function private.anywork_audit_trigger();

drop trigger if exists anywork_payment_audit on public.anywork_payments;
create trigger anywork_payment_audit after insert or update or delete on public.anywork_payments for each row execute function private.anywork_audit_trigger();

drop trigger if exists anywork_dispute_audit on public.anywork_disputes;
create trigger anywork_dispute_audit after insert or update or delete on public.anywork_disputes for each row execute function private.anywork_audit_trigger();

drop trigger if exists anywork_support_audit on public.anywork_support_tickets;
create trigger anywork_support_audit after insert or update or delete on public.anywork_support_tickets for each row execute function private.anywork_audit_trigger();

-- ---------------------------------------------------------------------------
-- 9. RLS
-- ---------------------------------------------------------------------------
alter table public.anywork_service_categories enable row level security;
alter table public.anywork_service_subcategories enable row level security;
alter table public.anywork_service_requests enable row level security;
alter table public.anywork_quotes enable row level security;
alter table public.anywork_provider_services enable row level security;
alter table public.anywork_messages enable row level security;
alter table public.anywork_notifications enable row level security;
alter table public.anywork_request_events enable row level security;
alter table public.anywork_job_schedules enable row level security;
alter table public.anywork_job_activities enable row level security;
alter table public.anywork_change_requests enable row level security;
alter table public.anywork_request_photos enable row level security;
alter table public.anywork_guest_request_access enable row level security;

drop policy if exists "Public service categories" on public.anywork_service_categories;
create policy "Public service categories" on public.anywork_service_categories for select to anon,authenticated using(enabled=true or private.anywork_current_role()='admin');

drop policy if exists "Admins manage service categories" on public.anywork_service_categories;
create policy "Admins manage service categories" on public.anywork_service_categories for all to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

drop policy if exists "Public service subcategories" on public.anywork_service_subcategories;
create policy "Public service subcategories" on public.anywork_service_subcategories for select to anon,authenticated using(enabled=true or private.anywork_current_role()='admin');

drop policy if exists "Admins manage service subcategories" on public.anywork_service_subcategories;
create policy "Admins manage service subcategories" on public.anywork_service_subcategories for all to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

drop policy if exists "Customers view own requests" on public.anywork_service_requests;
create policy "Customers view own requests" on public.anywork_service_requests for select to authenticated
using(customer_id=auth.uid() or selected_provider_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Customers create requests" on public.anywork_service_requests;
create policy "Customers create requests" on public.anywork_service_requests for insert to authenticated
with check(customer_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Participants update requests" on public.anywork_service_requests;
create policy "Participants update requests" on public.anywork_service_requests for update to authenticated
using(customer_id=auth.uid() or selected_provider_id=auth.uid() or private.anywork_current_role()='admin')
with check(customer_id=auth.uid() or selected_provider_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Participants view quotes" on public.anywork_quotes;
create policy "Participants view quotes" on public.anywork_quotes for select to authenticated
using(provider_id=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or private.anywork_current_role()='admin')));

drop policy if exists "Providers create quotes" on public.anywork_quotes;
create policy "Providers create quotes" on public.anywork_quotes for insert to authenticated
with check(provider_id=auth.uid());

drop policy if exists "Quote participants update" on public.anywork_quotes;
create policy "Quote participants update" on public.anywork_quotes for update to authenticated
using(provider_id=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or private.anywork_current_role()='admin')))
with check(provider_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Providers manage services" on public.anywork_provider_services;
create policy "Providers manage services" on public.anywork_provider_services for all to authenticated using(provider_id=auth.uid() or private.anywork_current_role()='admin') with check(provider_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Message participants" on public.anywork_messages;
create policy "Message participants" on public.anywork_messages for select to authenticated using(sender_id=auth.uid() or receiver_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Send messages" on public.anywork_messages;
create policy "Send messages" on public.anywork_messages for insert to authenticated with check(sender_id=auth.uid());

drop policy if exists "Own notifications" on public.anywork_notifications;
create policy "Own notifications" on public.anywork_notifications for select to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Mark own notifications" on public.anywork_notifications;
create policy "Mark own notifications" on public.anywork_notifications for update to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin') with check(user_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Request participants events" on public.anywork_request_events;
create policy "Request participants events" on public.anywork_request_events for select to authenticated using(exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid() or private.anywork_current_role()='admin')));

drop policy if exists "Schedule participants" on public.anywork_job_schedules;
create policy "Schedule participants" on public.anywork_job_schedules for select to authenticated using(exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid() or private.anywork_current_role()='admin')));

drop policy if exists "Schedule admin write" on public.anywork_job_schedules;
create policy "Schedule admin write" on public.anywork_job_schedules for all to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

drop policy if exists "Job participants activities" on public.anywork_job_activities;
create policy "Job participants activities" on public.anywork_job_activities for select to authenticated using(exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid() or private.anywork_current_role()='admin')));

drop policy if exists "Change request participants" on public.anywork_change_requests;
create policy "Change request participants" on public.anywork_change_requests for select to authenticated using(provider_id=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or private.anywork_current_role()='admin')));
drop policy if exists "Providers create change requests" on public.anywork_change_requests;
create policy "Providers create change requests" on public.anywork_change_requests for insert to authenticated with check(provider_id=auth.uid());
drop policy if exists "Customers/admin update change requests" on public.anywork_change_requests;
create policy "Customers/admin update change requests" on public.anywork_change_requests for update to authenticated using(exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin') with check(exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin');

drop policy if exists "Request photo participants" on public.anywork_request_photos;
create policy "Request photo participants" on public.anywork_request_photos for select to authenticated using(customer_id=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid())) or private.anywork_current_role()='admin');
drop policy if exists "Customers create request photos" on public.anywork_request_photos;
create policy "Customers create request photos" on public.anywork_request_photos for insert to authenticated with check(customer_id=auth.uid());

drop policy if exists "Own guest access" on public.anywork_guest_request_access;
create policy "Own guest access" on public.anywork_guest_request_access for select to authenticated using(exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin');

-- Production module policies already exist in the previous migration; recreate
-- only the policies needed by this hardening pass.
drop policy if exists "Service fields are public" on public.anywork_service_fields;
create policy "Service fields are public" on public.anywork_service_fields for select to anon,authenticated using(enabled=true or private.anywork_current_role()='admin');

-- ---------------------------------------------------------------------------
-- 10. Grants
-- ---------------------------------------------------------------------------
grant select on public.anywork_service_categories, public.anywork_service_subcategories to anon,authenticated;
grant select,insert,update,delete on public.anywork_service_categories, public.anywork_service_subcategories to authenticated;
grant select,insert,update,delete on public.anywork_service_requests, public.anywork_quotes, public.anywork_provider_services, public.anywork_messages, public.anywork_notifications, public.anywork_request_answers, public.anywork_addresses, public.anywork_favorites, public.anywork_provider_availability, public.anywork_provider_time_off, public.anywork_job_checkins, public.anywork_job_photos, public.anywork_request_photos to authenticated;
grant select on public.anywork_request_events, public.anywork_job_schedules, public.anywork_job_activities to authenticated;
grant select,insert,update on public.anywork_change_requests to authenticated;
grant execute on function public.anywork_accept_quote(uuid,uuid) to authenticated;
grant execute on function public.anywork_confirm_schedule(uuid,timestamptz,timestamptz,text) to authenticated;

alter table public.anywork_reviews enable row level security;
alter table public.anywork_invoices enable row level security;
alter table public.anywork_invoice_items enable row level security;
alter table public.anywork_payments enable row level security;
alter table public.anywork_provider_reviews enable row level security;
alter table public.anywork_provider_verifications enable row level security;
alter table public.anywork_disputes enable row level security;
alter table public.anywork_support_tickets enable row level security;
alter table public.anywork_audit_logs enable row level security;

drop policy if exists "Review participants" on public.anywork_reviews;
create policy "Review participants" on public.anywork_reviews for select to authenticated using(customer_id=auth.uid() or provider_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Customers create reviews" on public.anywork_reviews;
create policy "Customers create reviews" on public.anywork_reviews for insert to authenticated with check(customer_id=auth.uid() and exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid() and r.status='Completed'));

drop policy if exists "Invoice participants" on public.anywork_invoices;
create policy "Invoice participants" on public.anywork_invoices for select to authenticated using(customer_id=auth.uid() or provider_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Invoice items participants" on public.anywork_invoice_items;
create policy "Invoice items participants" on public.anywork_invoice_items for select to authenticated using(exists(select 1 from public.anywork_invoices i where i.id=invoice_id and (i.customer_id=auth.uid() or i.provider_id=auth.uid() or private.anywork_current_role()='admin')));

drop policy if exists "Payment participants" on public.anywork_payments;
create policy "Payment participants" on public.anywork_payments for select to authenticated using(customer_id=auth.uid() or provider_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Customer payments" on public.anywork_payments;
create policy "Customer payments" on public.anywork_payments for insert to authenticated with check(customer_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Provider review participants" on public.anywork_provider_reviews;
create policy "Provider review participants" on public.anywork_provider_reviews for select to authenticated using(provider_id=auth.uid() or customer_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Providers create reviews" on public.anywork_provider_reviews;
create policy "Providers create reviews" on public.anywork_provider_reviews for insert to authenticated with check(provider_id=auth.uid() and exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.selected_provider_id=auth.uid() and r.status='Completed'));

drop policy if exists "Provider verification participants" on public.anywork_provider_verifications;
create policy "Provider verification participants" on public.anywork_provider_verifications for select to authenticated using(provider_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Providers submit verification" on public.anywork_provider_verifications;
create policy "Providers submit verification" on public.anywork_provider_verifications for insert to authenticated with check(provider_id=auth.uid());
drop policy if exists "Providers update verification request" on public.anywork_provider_verifications;
create policy "Providers update verification request" on public.anywork_provider_verifications for update to authenticated using(provider_id=auth.uid()) with check(provider_id=auth.uid());

drop policy if exists "Dispute participants" on public.anywork_disputes;
create policy "Dispute participants" on public.anywork_disputes for select to authenticated using(opened_by=auth.uid() or assigned_to=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid())) or private.anywork_current_role()='admin');
drop policy if exists "Open disputes" on public.anywork_disputes;
create policy "Open disputes" on public.anywork_disputes for insert to authenticated with check(opened_by=auth.uid());
drop policy if exists "Admin dispute updates" on public.anywork_disputes;
create policy "Admin dispute updates" on public.anywork_disputes for update to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

drop policy if exists "Support participants" on public.anywork_support_tickets;
create policy "Support participants" on public.anywork_support_tickets for select to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin');
drop policy if exists "Create support tickets" on public.anywork_support_tickets;
create policy "Create support tickets" on public.anywork_support_tickets for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "Admin support updates" on public.anywork_support_tickets;
create policy "Admin support updates" on public.anywork_support_tickets for update to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

drop policy if exists "Admin audit read" on public.anywork_audit_logs;
create policy "Admin audit read" on public.anywork_audit_logs for select to authenticated using(private.anywork_current_role()='admin');

grant select,insert on public.anywork_reviews to authenticated;
grant select,insert on public.anywork_provider_reviews to authenticated;
grant select,insert,update on public.anywork_provider_verifications to authenticated;
grant select,insert,update on public.anywork_disputes, public.anywork_support_tickets to authenticated;
grant select on public.anywork_invoices, public.anywork_invoice_items, public.anywork_payments, public.anywork_audit_logs to authenticated;
grant insert on public.anywork_payments to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Storage policies
-- ---------------------------------------------------------------------------
drop policy if exists "ANYwork job files upload" on storage.objects;
create policy "ANYwork job files upload" on storage.objects for insert to authenticated
with check (
  bucket_id='anywork-job-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "ANYwork job files read" on storage.objects;
create policy "ANYwork job files read" on storage.objects for select to authenticated
using (
  bucket_id='anywork-job-files'
  and (
    owner_id = auth.uid()::text
    or private.anywork_current_role()='admin'
    or exists (
      select 1 from public.anywork_job_photos p
      join public.anywork_service_requests r on r.id=p.request_id
      where p.storage_path=name
        and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid())
    )
  )
);

drop policy if exists "ANYwork job files delete" on storage.objects;
create policy "ANYwork job files delete" on storage.objects for delete to authenticated
using (bucket_id='anywork-job-files' and (owner_id=auth.uid()::text or private.anywork_current_role()='admin'));

-- Seed normalized catalog tables from the existing dynamic text catalog.
insert into public.anywork_service_categories(name)
select distinct category from public.anywork_services
where nullif(trim(category),'') is not null
on conflict(name) do nothing;

insert into public.anywork_service_subcategories(category_id,name)
select c.id, s.subcategory
from public.anywork_services s
join public.anywork_service_categories c on c.name=s.category
where nullif(trim(s.subcategory),'') is not null
on conflict(category_id,name) do nothing;

-- Ensure every provider has a verification record.
insert into public.anywork_provider_verifications(provider_id)
select user_id from public.anywork_profiles where role='provider'
on conflict(provider_id) do nothing;

drop policy if exists "ANYwork request photos upload" on storage.objects;
create policy "ANYwork request photos upload" on storage.objects for insert to authenticated
with check (
  bucket_id='anywork-request-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "ANYwork request photos read" on storage.objects;
create policy "ANYwork request photos read" on storage.objects for select to authenticated
using (
  bucket_id='anywork-request-photos'
  and (
    owner_id=auth.uid()::text
    or private.anywork_current_role()='admin'
    or exists (
      select 1 from public.anywork_request_photos p
      join public.anywork_service_requests r on r.id=p.request_id
      where p.storage_path=name and (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid())
    )
  )
);

drop policy if exists "ANYwork request photos delete" on storage.objects;
create policy "ANYwork request photos delete" on storage.objects for delete to authenticated
using (bucket_id='anywork-request-photos' and (owner_id=auth.uid()::text or private.anywork_current_role()='admin'));
