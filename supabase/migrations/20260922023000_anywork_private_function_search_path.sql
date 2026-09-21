-- Harden private ANYwork helper search paths.
alter function private.anywork_request_number() set search_path=pg_catalog,public,private;
alter function private.anywork_request_before_insert() set search_path=pg_catalog,public,private;
alter function private.anywork_distance_km(numeric,numeric,numeric,numeric) set search_path=pg_catalog,public,private;
