-- Database-backed public provider directory.
-- Exposes only marketplace-safe fields and keeps provider PII out of the public query.

create or replace function public.anywork_list_public_providers()
returns table(
  id uuid,
  name text,
  initials text,
  service_ids jsonb,
  rating numeric,
  review_count bigint,
  completed_jobs bigint,
  location text,
  response_time text,
  response_rate text,
  summary text,
  verified boolean
)
language sql
security definer
set search_path=public,private
as $$
  select
    p.user_id as id,
    coalesce(nullif(trim(p.display_name),''), nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),
      coalesce(nullif(trim(p.company_name),''),'ANYwork Provider')) as name,
    upper(left(
      coalesce(nullif(trim(p.display_name),''), nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),
        coalesce(nullif(trim(p.company_name),''),'AP')), 2
    )) as initials,
    coalesce(
      (
        select jsonb_agg(ps.service_key order by ps.service_key)
        from public.anywork_provider_services ps
        where ps.provider_id=p.user_id and ps.enabled=true
      ),
      '[]'::jsonb
    ) as service_ids,
    coalesce(
      (
        select round(avg(r.rating)::numeric,1)
        from public.anywork_reviews r
        where r.provider_id=p.user_id
      ),
      0
    ) as rating,
    (
      select count(*) from public.anywork_reviews r where r.provider_id=p.user_id
    ) as review_count,
    (
      select count(*) from public.anywork_service_requests sr
      where sr.selected_provider_id=p.user_id and sr.status='Completed'
    ) as completed_jobs,
    coalesce(nullif(trim(p.city),''),'Philippines') as location,
    '—'::text as response_time,
    '—'::text as response_rate,
    coalesce(nullif(trim(p.company_name),''),'Verified service provider on ANYwork') as summary,
    coalesce(
      exists(
        select 1
        from public.anywork_provider_verifications v
        where v.provider_id=p.user_id and v.status='Verified'
      ),
      false
    ) as verified
  from public.anywork_profiles p
  where p.role='provider'
    and p.is_active=true
  order by verified desc, rating desc, completed_jobs desc, name asc;
$$;

revoke execute on function public.anywork_list_public_providers() from public,anon;
grant execute on function public.anywork_list_public_providers() to anon,authenticated;
