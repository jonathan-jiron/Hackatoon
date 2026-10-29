-- Local Postgres only: recreate the roles/extensions Supabase provides out of the box.
-- Not a migration; never applied to a real Supabase project.
create extension if not exists vector;
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
