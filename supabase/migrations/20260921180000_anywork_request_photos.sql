-- AnyWork request photo storage and metadata.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anywork-request-photos',
  'anywork-request-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.anywork_request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.anywork_service_requests(id) on delete cascade,
  customer_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists anywork_request_photos_request_id_idx
  on public.anywork_request_photos(request_id, created_at);

alter table public.anywork_request_photos enable row level security;

drop policy if exists "AnyWork users can view request photos" on public.anywork_request_photos;
create policy "AnyWork users can view request photos"
on public.anywork_request_photos for select to authenticated
using (private.anywork_request_visible_to_user(request_id, (select auth.uid())));

drop policy if exists "AnyWork customers can add request photos" on public.anywork_request_photos;
create policy "AnyWork customers can add request photos"
on public.anywork_request_photos for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and exists (
    select 1 from public.anywork_service_requests r
    where r.id = request_id and r.customer_id = (select auth.uid())
  )
);

drop policy if exists "AnyWork customers can delete request photos" on public.anywork_request_photos;
create policy "AnyWork customers can delete request photos"
on public.anywork_request_photos for delete to authenticated
using (customer_id = (select auth.uid()));

grant select, insert, delete on public.anywork_request_photos to authenticated;

drop policy if exists "AnyWork users can read request photo objects" on storage.objects;
create policy "AnyWork users can read request photo objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'anywork-request-photos'
  and private.anywork_request_visible_to_user(
    ((storage.foldername(name))[1])::uuid,
    (select auth.uid())
  )
);

drop policy if exists "AnyWork customers can upload request photo objects" on storage.objects;
create policy "AnyWork customers can upload request photo objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'anywork-request-photos'
  and ((storage.foldername(name))[2])::uuid = (select auth.uid())
  and exists (
    select 1 from public.anywork_service_requests r
    where r.id = ((storage.foldername(name))[1])::uuid
      and r.customer_id = (select auth.uid())
  )
);

drop policy if exists "AnyWork customers can delete request photo objects" on storage.objects;
create policy "AnyWork customers can delete request photo objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'anywork-request-photos'
  and ((storage.foldername(name))[2])::uuid = (select auth.uid())
);
