-- ANYwork end-to-end job workflow: scheduling, execution activity, change requests and reviews.

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

create table if not exists public.anywork_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.anywork_service_requests(id) on delete cascade,
  customer_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists anywork_job_activities_request_idx on public.anywork_job_activities(request_id, created_at);
create index if not exists anywork_change_requests_request_idx on public.anywork_change_requests(request_id, created_at);
create index if not exists anywork_change_requests_provider_idx on public.anywork_change_requests(provider_id);

create or replace function private.anywork_job_activity(
  p_request_id uuid,
  p_type text,
  p_title text,
  p_detail text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.anywork_job_activities(request_id, actor_user_id, activity_type, title, detail, metadata)
  values (p_request_id, auth.uid(), p_type, p_title, p_detail, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.anywork_confirm_schedule(
  p_request_id uuid,
  p_start timestamptz,
  p_end timestamptz default null,
  p_notes text default null
) returns public.anywork_service_requests
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_request public.anywork_service_requests;
begin
  select * into v_request
  from public.anywork_service_requests
  where id = p_request_id and customer_id = auth.uid();

  if not found then raise exception 'Request not found or not owned by customer'; end if;
  if v_request.selected_provider_id is null then raise exception 'Select a provider before scheduling'; end if;
  if v_request.status not in ('Quoted','Scheduled') then raise exception 'Only quoted requests can be scheduled'; end if;

  insert into public.anywork_job_schedules(request_id, proposed_start, proposed_end, confirmed_at, confirmed_by, notes)
  values (p_request_id, p_start, p_end, now(), auth.uid(), p_notes)
  on conflict (request_id) do update set proposed_start=excluded.proposed_start, proposed_end=excluded.proposed_end,
    confirmed_at=now(), confirmed_by=auth.uid(), notes=excluded.notes, updated_at=now();

  update public.anywork_service_requests
  set preferred_date=p_start, status='Scheduled'
  where id=p_request_id
  returning * into v_request;

  perform private.anywork_job_activity(p_request_id, 'schedule.confirmed', 'Schedule confirmed',
    'The customer confirmed the job schedule.', jsonb_build_object('start', p_start, 'end', p_end));

  return v_request;
end;
$$;

grant execute on function public.anywork_confirm_schedule(uuid,timestamptz,timestamptz,text) to authenticated;

alter table public.anywork_job_schedules enable row level security;
alter table public.anywork_job_activities enable row level security;
alter table public.anywork_change_requests enable row level security;
alter table public.anywork_reviews enable row level security;

create policy "AnyWork job participants can view schedules" on public.anywork_job_schedules for select to authenticated
using (
  exists (select 1 from public.anywork_service_requests r where r.id=request_id and
    (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid() or private.anywork_current_role()='admin'))
);

create policy "AnyWork job participants can manage activities" on public.anywork_job_activities for select to authenticated
using (
  exists (select 1 from public.anywork_service_requests r where r.id=request_id and
    (r.customer_id=auth.uid() or r.selected_provider_id=auth.uid() or private.anywork_current_role()='admin'))
);

create policy "AnyWork providers can create change requests" on public.anywork_change_requests for insert to authenticated
with check (
  provider_id=auth.uid()
  and exists (select 1 from public.anywork_service_requests r where r.id=request_id and r.selected_provider_id=auth.uid() and r.status='In Progress')
);

create policy "AnyWork job participants can view change requests" on public.anywork_change_requests for select to authenticated
using (
  provider_id=auth.uid()
  or exists (select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid())
  or private.anywork_current_role()='admin'
);

create policy "AnyWork customers can approve change requests" on public.anywork_change_requests for update to authenticated
using (
  exists (select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid())
  or private.anywork_current_role()='admin'
)
with check (
  exists (select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid())
  or private.anywork_current_role()='admin'
);

create policy "AnyWork participants can view reviews" on public.anywork_reviews for select to authenticated
using (customer_id=auth.uid() or provider_id=auth.uid() or private.anywork_current_role()='admin');

create policy "AnyWork customers can create reviews" on public.anywork_reviews for insert to authenticated
with check (
  customer_id=auth.uid()
  and exists (select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid() and r.status='Completed')
);

grant select on public.anywork_job_schedules, public.anywork_job_activities, public.anywork_change_requests, public.anywork_reviews to authenticated;
grant insert, update on public.anywork_change_requests to authenticated;
grant insert on public.anywork_reviews to authenticated;

create or replace function private.anywork_request_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.status is distinct from old.status then
    perform private.anywork_job_activity(
      new.id,
      'status.changed',
      case new.status
        when 'Quoted' then 'Quote accepted'
        when 'Scheduled' then 'Schedule confirmed'
        when 'In Progress' then 'Job started'
        when 'Completed' then 'Job completed'
        else 'Request status updated'
      end,
      'Status changed from ' || old.status || ' to ' || new.status,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists anywork_request_activity_trigger on public.anywork_service_requests;
create trigger anywork_request_activity_trigger
after update of status on public.anywork_service_requests
for each row execute function private.anywork_request_activity_trigger();

create or replace function private.anywork_change_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'INSERT' then
    perform private.anywork_job_activity(new.request_id, 'change.requested', 'Additional work requested',
      new.description, jsonb_build_object('amount_delta', new.amount_delta, 'change_request_id', new.id));
  elsif new.status is distinct from old.status then
    perform private.anywork_job_activity(new.request_id, 'change.' || lower(new.status), 'Change request ' || lower(new.status),
      new.description, jsonb_build_object('amount_delta', new.amount_delta, 'change_request_id', new.id));
  end if;
  return new;
end;
$$;

drop trigger if exists anywork_change_activity_trigger on public.anywork_change_requests;
create trigger anywork_change_activity_trigger
after insert or update of status on public.anywork_change_requests
for each row execute function private.anywork_change_activity_trigger();
