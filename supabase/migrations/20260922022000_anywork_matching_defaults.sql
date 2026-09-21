-- ANYwork matching defaults: service-area fallback and implicit provider availability.
create or replace function public.anywork_match_request_providers(p_request_id uuid)
returns table(provider_id uuid,display_name text,company_name text,match_score numeric,reasons jsonb,active_jobs bigint)
language sql security definer set search_path=public,private as $$
  with r as (select * from public.anywork_service_requests where id=p_request_id),
  candidates as (
    select p.user_id as provider_id,
      coalesce(p.display_name,concat_ws(' ',p.first_name,p.last_name),'Provider') as display_name,
      p.company_name,ps.service_area,coalesce(v.status,'Pending') as verification_status,
      count(*) filter (where jr.selected_provider_id=p.user_id and jr.status in ('Scheduled','In Progress')) as active_jobs,
      (not exists(select 1 from public.anywork_provider_availability pa where pa.provider_id=p.user_id)
       or exists(select 1 from public.anywork_provider_availability pa,r where pa.provider_id=p.user_id and pa.enabled=true
         and (r.preferred_date is null or pa.weekday=extract(dow from r.preferred_date)::smallint)
         and (r.preferred_date is null or r.preferred_date::time between pa.start_time and pa.end_time))) as available,
      not exists(select 1 from public.anywork_provider_time_off po,r where po.provider_id=p.user_id and r.preferred_date is not null
        and po.starts_at < r.preferred_date + interval '2 hours' and po.ends_at > r.preferred_date) as not_blocked,
      (exists(select 1 from public.anywork_provider_service_areas a,r where a.provider_id=p.user_id and a.enabled=true and
        (lower(coalesce(r.location,'')) like '%'||lower(coalesce(a.area_name,''))||'%' or lower(coalesce(r.location,'')) like '%'||lower(coalesce(a.city,''))||'%' or
         (r.latitude is not null and r.longitude is not null and private.anywork_distance_km(r.latitude,r.longitude,a.latitude,a.longitude)<=a.radius_km)))
       or (nullif(trim(ps.service_area),'') is not null and exists(select 1 from r where lower(coalesce(r.location,'')) like '%'||lower(ps.service_area)||'%'))) as area_match
    from public.anywork_profiles p
    join public.anywork_provider_services ps on ps.provider_id=p.user_id and ps.enabled=true
    cross join r
    left join public.anywork_provider_verifications v on v.provider_id=p.user_id
    left join public.anywork_service_requests jr on jr.selected_provider_id=p.user_id
    where p.role='provider' and ps.service_key=r.service_key
    group by p.user_id,p.display_name,p.first_name,p.last_name,p.company_name,ps.id,ps.service_area,v.status,r.preferred_date,r.location,r.latitude,r.longitude
  )
  select c.provider_id,c.display_name,c.company_name,
    round(40 + case when c.area_match then 25 else 0 end + case when c.available and c.not_blocked then 20 else case when c.not_blocked then 8 else 0 end end
      + case when c.verification_status='Verified' then 10 else 0 end + greatest(0,5-least(c.active_jobs,5))::numeric,2),
    jsonb_build_array(
      case when c.area_match then 'Service area matches' else 'Service area needs confirmation' end,
      case when c.available and c.not_blocked then 'Available at requested time' else case when c.not_blocked then 'No time-off conflict' else 'Time-off conflict' end end,
      case when c.verification_status='Verified' then 'Verified provider' else 'Verification pending' end,
      'Active jobs: '||c.active_jobs::text
    ),
    c.active_jobs
  from candidates c order by 4 desc,6 asc,2;
$$;

insert into public.anywork_provider_service_areas(provider_id,area_name,enabled)
select provider_id,trim(service_area),true from public.anywork_provider_services
where nullif(trim(service_area),'') is not null
on conflict(provider_id,area_name) do nothing;
