-- Admin-managed service categories and subcategories.
alter table public.anywork_services
  add column if not exists category text not null default 'General',
  add column if not exists subcategory text not null default 'General';

create index if not exists anywork_services_category_idx
  on public.anywork_services(category, subcategory);

drop policy if exists "Admins can manage AnyWork services" on public.anywork_services;
create policy "Admins can manage AnyWork services"
on public.anywork_services
for all
to authenticated
using (private.anywork_current_role() = 'admin')
with check (private.anywork_current_role() = 'admin');

grant insert, update, delete on public.anywork_services to authenticated;

update public.anywork_services
set category = case id
  when 'print' then 'Print & Marketing'
  when 'build' then 'Construction & Fabrication'
  when 'install' then 'Installation'
  when 'maintain' then 'Maintenance'
  when 'site' then 'Site Services'
  when 'custom' then 'Special Projects'
  else category
end,
subcategory = case id
  when 'print' then 'Printing & Signage'
  when 'build' then 'Furniture & Fabrication'
  when 'install' then 'Installation & Assembly'
  when 'maintain' then 'Repairs & Maintenance'
  when 'site' then 'Site Services'
  when 'custom' then 'Custom Projects'
  else subcategory
end;

insert into public.anywork_services
(id, category, subcategory, title, label, description, icon, items, starting_price, starting_price_label)
values
('software-mobile-development', 'Software', 'Mobile Development', 'Software', 'Mobile Development', 'Native and cross-platform mobile applications for iOS and Android.', 'Smartphone', '["iOS apps","Android apps","Cross-platform apps","API integration"]', null, 'Quote'),
('software-web-application', 'Software', 'Web Application', 'Software', 'Web Application', 'Responsive web applications, dashboards, portals and business systems.', 'Globe', '["Business web apps","Customer portals","Admin dashboards","API integration"]', null, 'Quote'),
('software-ai', 'Software', 'AI', 'Software', 'AI Solutions', 'AI-powered applications, automation, assistants and intelligent workflows.', 'Sparkles', '["AI assistants","Workflow automation","Document AI","AI integrations"]', null, 'Quote')
on conflict (id) do update set
  category = excluded.category,
  subcategory = excluded.subcategory,
  title = excluded.title,
  label = excluded.label,
  description = excluded.description,
  icon = excluded.icon,
  items = excluded.items,
  starting_price = excluded.starting_price,
  starting_price_label = excluded.starting_price_label,
  updated_at = now();
