-- ANYwork Phases 6-8: Admin intelligence, notifications/email, production hardening
-- Safe to run after the Phase 1-5 migrations.

create table if not exists public.anywork_notification_templates (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  name text not null,
  subject_template text not null,
  body_template text not null,
  channel text not null default 'email' check (channel in ('email','in_app','sms')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.anywork_profiles(user_id) on delete cascade,
  event_key text not null,
  title text not null,
  body text not null,
  category text not null default 'System' check (category in ('Requests','Appointments','Messages','Payments','Reviews','System')),
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.anywork_email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.anywork_profiles(user_id) on delete set null,
  recipient_email text not null,
  event_key text not null,
  subject text not null,
  body_html text not null,
  status text not null default 'Queued' check (status in ('Queued','Sending','Sent','Failed','Cancelled')),
  attempts integer not null default 0,
  provider_message_id text,
  last_error text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_email_settings (
  id boolean primary key default true,
  provider text not null default 'resend',
  sender_name text not null default 'ANYwork',
  sender_email text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.anywork_admin_reports (
  id uuid primary key default gen_random_uuid(),
  report_key text not null unique,
  name text not null,
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists anywork_notifications_user_idx on public.anywork_notifications(user_id, read_at, created_at desc);
create index if not exists anywork_email_queue_status_idx on public.anywork_email_queue(status, scheduled_at);
create index if not exists anywork_email_queue_user_idx on public.anywork_email_queue(user_id, created_at desc);

insert into public.anywork_email_settings(id) values(true) on conflict(id) do nothing;

insert into public.anywork_notification_templates(event_key,name,subject_template,body_template,channel) values
('request.created','New service request','New ANYwork service request: {{title}}','A new service request {{request_number}} has been created.','email'),
('quote.created','New provider quote','You received a quote for {{title}}','A provider submitted a quote of {{amount}} for {{title}}.','email'),
('quote.accepted','Quote accepted','Your quote was accepted','The quote for {{title}} has been accepted.','email'),
('job.scheduled','Job scheduled','Your ANYwork job is scheduled','{{title}} is scheduled for {{preferred_date}}.','email'),
('job.completed','Job completed','Your ANYwork job is complete','{{title}} has been marked completed.','email'),
('payment.created','Payment received','ANYwork payment update','A payment of {{amount}} was recorded for {{invoice_number}}.','email'),
('review.created','New review','You received a new ANYwork review','A customer left a new review for your completed job.','email'),
('provider.verification','Provider verification update','ANYwork verification update','Your provider verification status is now {{status}}.','email'),
('support.created','Support ticket created','ANYwork support ticket {{ticket_number}}','Your support ticket has been created and is now being reviewed.','email')
on conflict(event_key) do nothing;

insert into public.anywork_admin_reports(report_key,name,description) values
('marketplace_overview','Marketplace overview','Requests, active users, providers and completion metrics'),
('revenue','Revenue','Invoice and successful payment totals by period'),
('services','Service performance','Requests, quotes and completed jobs by service'),
('providers','Provider performance','Provider activity, jobs, completion and verification'),
('customers','Customer activity','Customer request and completion activity'),
('operations','Operations','Open requests, disputes, support tickets and queue health')
on conflict(report_key) do nothing;

create or replace function public.anywork_admin_dashboard_stats(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
) returns jsonb
language plpgsql security definer set search_path=public,private as $$
declare result jsonb;
begin
  if private.anywork_current_role() <> 'admin' then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'requests', (select count(*) from public.anywork_service_requests r where r.created_at between p_from and p_to),
    'completed_jobs', (select count(*) from public.anywork_service_requests r where r.status='Completed' and r.updated_at between p_from and p_to),
    'cancelled_jobs', (select count(*) from public.anywork_service_requests r where lower(r.status) like '%cancel%' and r.updated_at between p_from and p_to),
    'providers', (select count(*) from public.anywork_profiles p where p.role='provider' and p.is_active),
    'customers', (select count(*) from public.anywork_profiles p where p.role='customer' and p.is_active),
    'verified_providers', (select count(*) from public.anywork_provider_verifications v where v.status='Verified'),
    'open_disputes', (select count(*) from public.anywork_disputes d where d.status not in ('Resolved','Closed')),
    'open_support', (select count(*) from public.anywork_support_tickets t where t.status not in ('Resolved','Closed')),
    'revenue', coalesce((select sum(p.amount) from public.anywork_payments p where p.status='Succeeded' and p.created_at between p_from and p_to),0),
    'average_job_value', coalesce((select avg(p.amount) from public.anywork_payments p where p.status='Succeeded' and p.created_at between p_from and p_to),0)
  ) into result;
  return result;
end;
$$;

create or replace function public.anywork_admin_service_report(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
) returns table(service_key text, requests bigint, completed bigint, quoted bigint, revenue numeric)
language plpgsql security definer set search_path=public,private as $$
begin
  if private.anywork_current_role() <> 'admin' then raise exception 'Admin access required'; end if;
  return query
  select r.service_key,
         count(*)::bigint,
         count(*) filter (where r.status='Completed')::bigint,
         count(*) filter (where r.status='Quoted')::bigint,
         coalesce(sum(p.amount) filter (where p.status='Succeeded'),0)::numeric
  from public.anywork_service_requests r
  left join public.anywork_payments p on p.customer_id=r.customer_id and p.created_at between p_from and p_to
  where r.created_at between p_from and p_to
  group by r.service_key
  order by count(*) desc;
end;
$$;

create or replace function public.anywork_enqueue_notification(
  p_user_id uuid,
  p_event_key text,
  p_title text,
  p_body text,
  p_category text default 'System',
  p_action_url text default null,
  p_recipient_email text default null,
  p_subject text default null,
  p_body_html text default null
) returns uuid
language plpgsql security definer set search_path=public,private as $$
declare notification_id uuid; recipient text;
begin
  if auth.uid() is null and private.anywork_current_role() <> 'admin' then raise exception 'Authentication required'; end if;
  if auth.uid() <> p_user_id and private.anywork_current_role() <> 'admin' then raise exception 'Not authorized'; end if;

  insert into public.anywork_notifications(user_id,event_key,title,body,category,action_url)
  values(p_user_id,p_event_key,p_title,p_body,p_category,p_action_url)
  returning id into notification_id;

  select coalesce(p_recipient_email, u.email) into recipient
  from auth.users u where u.id=p_user_id;

  if recipient is not null and coalesce(p_subject,'') <> '' then
    insert into public.anywork_email_queue(user_id,recipient_email,event_key,subject,body_html)
    values(p_user_id,recipient,p_event_key,p_subject,coalesce(p_body_html,p_body));
  end if;
  return notification_id;
end;
$$;

create or replace function public.anywork_mark_notification_read(p_id uuid)
returns void language plpgsql security definer set search_path=public,private as $$
begin
  update public.anywork_notifications set read_at=now() where id=p_id and user_id=auth.uid();
end;
$$;

alter table public.anywork_notification_templates enable row level security;
alter table public.anywork_notifications enable row level security;
alter table public.anywork_email_queue enable row level security;
alter table public.anywork_email_settings enable row level security;
alter table public.anywork_admin_reports enable row level security;

create policy "Users view own notifications" on public.anywork_notifications for select to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Users update own notifications" on public.anywork_notifications for update to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin') with check(user_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Admins manage notification templates" on public.anywork_notification_templates for all to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');
create policy "Admins view email queue" on public.anywork_email_queue for select to authenticated using(private.anywork_current_role()='admin');
create policy "Admins manage email settings" on public.anywork_email_settings for all to authenticated using(private.anywork_current_role()='admin') with check(private.anywork_current_role()='admin');
create policy "Admins view reports" on public.anywork_admin_reports for select to authenticated using(private.anywork_current_role()='admin');

grant select on public.anywork_notifications to authenticated;
grant update on public.anywork_notifications to authenticated;
grant select on public.anywork_notification_templates, public.anywork_email_queue, public.anywork_email_settings, public.anywork_admin_reports to authenticated;
grant execute on function public.anywork_admin_dashboard_stats(timestamptz,timestamptz) to authenticated;
grant execute on function public.anywork_admin_service_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.anywork_enqueue_notification(uuid,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.anywork_mark_notification_read(uuid) to authenticated;

-- Basic audit coverage for notification/email administration.
drop trigger if exists anywork_notification_template_updated_at on public.anywork_notification_templates;
create trigger anywork_notification_template_updated_at before update on public.anywork_notification_templates
for each row execute function private.anywork_set_updated_at();

drop trigger if exists anywork_email_queue_updated_at on public.anywork_email_queue;
create trigger anywork_email_queue_updated_at before update on public.anywork_email_queue
for each row execute function private.anywork_set_updated_at();

-- Compatibility with the Phase 1-5 notification model used by the existing workspace.
alter table public.anywork_notifications add column if not exists type text;
alter table public.anywork_notifications add column if not exists request_id uuid references public.anywork_service_requests(id) on delete cascade;
alter table public.anywork_notifications add column if not exists quote_id uuid references public.anywork_quotes(id) on delete cascade;
alter table public.anywork_notifications add column if not exists message_id uuid references public.anywork_messages(id) on delete cascade;
update public.anywork_notifications set type=coalesce(type,event_key,'system') where type is null;
alter table public.anywork_notifications alter column type set default 'system';

drop policy if exists "Users view own notifications" on public.anywork_notifications;
drop policy if exists "Users update own notifications" on public.anywork_notifications;
create policy "Users view own notifications" on public.anywork_notifications for select to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin');
create policy "Users update own notifications" on public.anywork_notifications for update to authenticated using(user_id=auth.uid() or private.anywork_current_role()='admin') with check(user_id=auth.uid() or private.anywork_current_role()='admin');

