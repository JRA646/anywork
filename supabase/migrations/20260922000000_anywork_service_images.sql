-- ANYwork marketplace UX: service imagery and catalog metadata
alter table public.anywork_services
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('anywork-service-images', 'anywork-service-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read ANYwork service images" on storage.objects;
create policy "Public read ANYwork service images"
on storage.objects for select
using (bucket_id = 'anywork-service-images');

drop policy if exists "Authenticated upload ANYwork service images" on storage.objects;
create policy "Authenticated upload ANYwork service images"
on storage.objects for insert to authenticated
with check (bucket_id = 'anywork-service-images');

drop policy if exists "Authenticated update ANYwork service images" on storage.objects;
create policy "Authenticated update ANYwork service images"
on storage.objects for update to authenticated
using (bucket_id = 'anywork-service-images')
with check (bucket_id = 'anywork-service-images');

drop policy if exists "Authenticated delete ANYwork service images" on storage.objects;
create policy "Authenticated delete ANYwork service images"
on storage.objects for delete to authenticated
using (bucket_id = 'anywork-service-images');
