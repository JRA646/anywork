-- Add lightweight service tags for admin catalog discovery.
alter table if exists public.anywork_services
  add column if not exists tags jsonb not null default '[]'::jsonb;

create index if not exists anywork_services_tags_gin_idx
  on public.anywork_services using gin(tags);
