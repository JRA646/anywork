-- ANYwork dispatch, provider matching, and service-company operations.
create extension if not exists pgcrypto;

alter table public.anywork_service_requests
  add column if not exists priority text not null default 'Normal',
  add column if not exists address_id uuid references public.anywork_addresses(id) on delete set null,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid references public.anywork_profiles(user_id) on delete set null;

do $$ begin
  alter table public.anywork_service_requests add constraint anywork_requests_priority_check
    check (priority in ('Low','Normal','High','Urgent'));
exception when duplicate_object then null; end $$;

create table if not exists public.anywork_provider_service_areas (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  area_name text not null,
  city text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  radius_km numeric(8,2) not null default 15 check (radius_km > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, area_name)
);

create table if not exists public.anywork_provider_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  provider_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  status text not null default 'Suggested',
  match_score numeric(6,2) not null default 0,
  match_reasons jsonb not null default '[]'::jsonb,
  invited_at timestamptz,
  responded_at timestamptz,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id, provider_id)
);

do $$ begin
  alter table public.anywork_provider_assignments add constraint anywork_provider_assignments_status_check
    check (status in ('Suggested','Invited','Declined','Assigned','Completed','Cancelled'));
exception when duplicate_object then null; end $$;

create index if not exists anywork_provider_area_provider_idx on public.anywork_provider_service_areas(provider_id, enabled);
create index if not exists anywork_provider_assignment_request_idx on public.anywork_provider_assignments(request_id, status, match_score desc);
create index if not exists anywork_provider_assignment_provider_idx on public.anywork_provider_assignments(provider_id, status, created_at desc);
create index if not exists anywork_requests_dispatch_idx on public.anywork_service_requests(status, priority, preferred_date);

create or replace function private.anywork_distance_km(p_lat numeric,p_lon numeric,q_lat numeric,q_lon numeric)
returns numeric language sql immutable as $$
  select case when p_lat is null or p_lon is null or q_lat is null or q_lon is null then null
    else 6371 * acos(least(1,greatest(-1,cos(radians(p_lat))*cos(radians(q_lat))*cos(radians(q_lon)-radians(p_lon))+sin(radians(p_lat))*sin(radians(q_lat))))) end;
$$;

create or replace function public.anywork_match_request_providers(p_request_id uuid)
returns table(provider_id uuid,display_name text,company_name text,match_score numeric,reasons jsonb,active_jobs bigint)
language sql security definer set search_path=public,private as $$
  with r as (select * from public.anywork_service_requests where id=p_request_id),
  candidates as (
    select p.user_id as provider_id,
      coalesce(p.display_name,concat_ws(' ',p.first_name,p.last_name),'Provider') as display_name,
      p.company_name,ps.service_area,coalesce(v.status,'Pending') as verification_status,
      count(*) filter (where jr.selected_provider_id=p.user_id and jr.status in ('Scheduled','In Progress')) as active_jobs,
      exists(select 1 from public.anywork_provider_availability pa,r where pa.provider_id=p.user_id and pa.enabled=true and
        (r.preferred_date is null or pa.weekday=extract(dow from r.preferred_date)::smallint) and
        (r.preferred_date is null or r.preferred_date::time between pa.start_time and pa.end_time)) as available,
      not exists(select 1 from public.anywork_provider_time_off po,r where po.provider_id=p.user_id and r.preferred_date is not null and
        po.starts_at < r.preferred_date + interval '2 hours' and po.ends_at > r.preferred_date) as not_blocked,
      exists(select 1 from public.anywork_provider_service_areas a,r where a.provider_id=p.user_id and a.enabled=true and
        (lower(coalesce(r.location,'')) like '%'||lower(coalesce(a.area_name,''))||'%' or
         lower(coalesce(r.location,'')) like '%'||lower(coalesce(a.city,''))||'%' or
         (r.latitude is not null and r.longitude is not null and private.anywork_distance_km(r.latitude,r.longitude,a.latitude,a.longitude)<=a.radius_km))) as area_match
    from public.anywork_profiles p
    join public.anywork_provider_services ps on ps.provider_id=p.user_id and ps.enabled=true
    cross join r
    left join public.anywork_provider_verifications v on v.provider_id=p.user_id
    left join public.anywork_service_requests jr on jr.selected_provider_id=p.user_id
    where p.role='provider' and ps.service_key=r.service_key
    group by p.user_id,p.display_name,p.first_name,p.last_name,p.company_name,ps.id,ps.service_area,v.status,r.preferred_date,r.location,r.latitude,r.longitude
  )
  select c.provider_id,c.display_name,c.company_name,
    round(40 + case when c.area_match then 25 else case when nullif(trim(c.service_area),'') is not null and lower(coalesce((select location from r),'')) like '%'||lower(c.service_area)||'%' then 15 else 0 end end
      + case when c.available and c.not_blocked then 20 else case when c.not_blocked then 8 else 0 end end
      + case when c.verification_status='Verified' then 10 else 0 end
      + greatest(0,5-least(c.active_jobs,5))::numeric,2) as match_score,
    jsonb_build_array(
      case when c.area_match then 'Service area matches' else 'Service area needs confirmation' end,
      case when c.available and c.not_blocked then 'Available at requested time' else case when c.not_blocked then 'No time-off conflict' else 'Time-off conflict' end end,
      case when c.verification_status='Verified' then 'Verified provider' else 'Verification pending' end,
      'Active jobs: '||c.active_jobs::text
    ) as reasons,c.active_jobs
  from candidates c order by match_score desc,c.active_jobs asc,c.display_name;
$$;

create or replace function public.anywork_generate_provider_matches(p_request_id uuid)
returns integer language plpgsql security definer set search_path=public,private as $$
declare inserted_count integer;
begin
  if private.anywork_current_role()<>'admin' then raise exception 'Admin access required'; end if;
  insert into public.anywork_provider_assignments(request_id,provider_id,status,match_score,match_reasons)
  select p_request_id,m.provider_id,'Suggested',m.match_score,m.reasons from public.anywork_match_request_providers(p_request_id) m
  where m.match_score>=45
  on conflict(request_id,provider_id) do update set match_score=excluded.match_score,match_reasons=excluded.match_reasons,updated_at=now()
  where public.anywork_provider_assignments.status in ('Suggested','Invited');
  get diagnostics inserted_count=row_count; return inserted_count;
end;
$$;

create or replace function public.anywork_assign_provider(p_request_id uuid,p_provider_id uuid)
returns public.anywork_provider_assignments language plpgsql security definer set search_path=public,private as $$
declare result_row public.anywork_provider_assignments;
begin
  if private.anywork_current_role()<>'admin' then raise exception 'Admin access required'; end if;
  if not exists(select 1 from public.anywork_service_requests where id=p_request_id) then raise exception 'Request not found'; end if;
  update public.anywork_provider_assignments set status='Cancelled',updated_at=now()
    where request_id=p_request_id and provider_id<>p_provider_id and status in ('Suggested','Invited');
  insert into public.anywork_provider_assignments(request_id,provider_id,status,match_score,match_reasons,assigned_at)
    select p_request_id,m.provider_id,'Assigned',m.match_score,m.reasons,now()
    from public.anywork_match_request_providers(p_request_id) m where m.provider_id=p_provider_id
    on conflict(request_id,provider_id) do update set status='Assigned',assigned_at=now(),updated_at=now(),match_score=excluded.match_score,match_reasons=excluded.match_reasons
    returning * into result_row;
  if result_row.id is null then raise exception 'Provider is not eligible for this request'; end if;
  update public.anywork_service_requests set selected_provider_id=p_provider_id,assigned_at=now(),assigned_by=auth.uid(),
    status=case when status='Requested' then 'Quoted' else status end,updated_at=now() where id=p_request_id;
  return result_row;
end;
$$;

create or replace view public.anywork_dispatch_queue as
select r.id,r.request_number,r.title,r.service_key,r.location,r.preferred_date,r.priority,r.status,r.customer_id,r.selected_provider_id,r.created_at,r.updated_at,
  coalesce(count(pa.id) filter (where pa.status in ('Suggested','Invited')),0) as suggested_provider_count
from public.anywork_service_requests r
left join public.anywork_provider_assignments pa on pa.request_id=r.id
where r.status<>'Completed'
group by r.id;

alter table public.anywork_provider_service_areas enable row level security;
alter table public.anywork_provider_assignments enable row level security;

drop policy if exists "Providers manage own service areas" on public.anywork_provider_service_areas;
create policy "Providers manage own service areas" on public.anywork_provider_service_areas for all to authenticated
using(provider_id=auth.uid() or private.anywork_current_role()='admin')
with check(provider_id=auth.uid() or private.anywork_current_role()='admin');

drop policy if exists "Participants view provider assignments" on public.anywork_provider_assignments;
create policy "Participants view provider assignments" on public.anywork_provider_assignments for select to authenticated
using(provider_id=auth.uid() or exists(select 1 from public.anywork_service_requests r where r.id=request_id and r.customer_id=auth.uid()) or private.anywork_current_role()='admin');

drop policy if exists "Admins manage provider assignments" on public.anywork_provider_assignments;
create policy "Admins manage provider assignments" on public.anywork_provider_assignments for all to authenticated
using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');

grant execute on function public.anywork_match_request_providers(uuid) to authenticated;
grant execute on function public.anywork_generate_provider_matches(uuid) to authenticated;
grant execute on function public.anywork_assign_provider(uuid,uuid) to authenticated;
grant select on public.anywork_dispatch_queue to authenticated;
grant select,insert,update,delete on public.anywork_provider_service_areas to authenticated;
grant select on public.anywork_provider_assignments to authenticated;
