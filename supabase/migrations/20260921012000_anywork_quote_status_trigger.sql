create or replace function private.anywork_mark_request_quoted()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  update public.anywork_service_requests
  set status = 'Quoted',
      updated_at = now()
  where id = new.request_id
    and status = 'Requested';

  return new;
end;
$$;

revoke all on function private.anywork_mark_request_quoted() from public, anon, authenticated;

drop trigger if exists anywork_quote_marks_request_quoted on public.anywork_quotes;
create trigger anywork_quote_marks_request_quoted
after insert on public.anywork_quotes
for each row
execute function private.anywork_mark_request_quoted();
