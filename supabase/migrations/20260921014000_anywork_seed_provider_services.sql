insert into public.anywork_provider_services (
  provider_id,
  service_key,
  enabled,
  starting_price,
  lead_time_days
)
select p.user_id, x.service_key, true, x.starting_price, x.lead_time_days
from public.anywork_profiles p
cross join (
  values
    ('print'::text, 180::numeric, 1),
    ('install'::text, 220::numeric, 1)
) as x(service_key, starting_price, lead_time_days)
where p.role = 'provider'
on conflict (provider_id, service_key) do nothing;
