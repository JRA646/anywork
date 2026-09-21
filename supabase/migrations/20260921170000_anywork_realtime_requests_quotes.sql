-- Enable Supabase Realtime for AnyWork request and quote lifecycle updates.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'anywork_service_requests'
  ) then
    alter publication supabase_realtime add table public.anywork_service_requests;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'anywork_quotes'
  ) then
    alter publication supabase_realtime add table public.anywork_quotes;
  end if;
end
$$;
