-- Public service catalog.
create table if not exists public.anywork_services (
  id text primary key,
  title text not null,
  label text not null,
  description text not null,
  icon text not null,
  items jsonb not null default '[]'::jsonb,
  starting_price numeric null,
  starting_price_label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.anywork_services enable row level security;

drop policy if exists "Anyone can view active AnyWork services" on public.anywork_services;
create policy "Anyone can view active AnyWork services"
on public.anywork_services for select to anon, authenticated using (enabled = true);

grant select on public.anywork_services to anon, authenticated;

insert into public.anywork_services(id,title,label,description,icon,items,starting_price,starting_price_label)
values
('print','Print','Printing & signage','Banners, signage, promotional materials and commercial printing.','Printer','["Banners & tarpaulins","Business signage","Window graphics","Promotional materials"]',180,'$180'),
('build','Build','Furniture & fabrication','Custom furniture, fixtures, cabinets and practical built solutions.','Hammer','["Custom furniture","Cabinets & counters","Shelving & storage"]',450,'$450'),
('install','Install','Installation & assembly','Professional installation and assembly for signs, furniture and displays.','Boxes','["Sign installation","Furniture assembly","Display installation"]',220,'$220'),
('maintain','Maintain','Repairs & maintenance','Handyman repairs, painting, fixture replacement and property upkeep.','Wrench','["Minor repairs","Painting & patching","Fixture replacement"]',120,'$120'),
('site','Site','Site services','Site preparation, fit-out assistance, material handling and coordination.','HardHat','["Site preparation","Fit-out assistance","Material handling"]',250,'$250'),
('custom','Custom','Special projects','Unusual work routed to providers with the right capabilities.','BriefcaseBusiness','["Custom jobs","Event setup","Special fabrication"]',null,'Quote')
on conflict (id) do update set title=excluded.title,label=excluded.label,description=excluded.description,icon=excluded.icon,items=excluded.items,starting_price=excluded.starting_price,starting_price_label=excluded.starting_price_label,updated_at=now();
