-- Dashboard live updates. The publication only exists on real Supabase, so skip it locally.
do $$
begin
  if exists (select from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table conversations, messages, leads;
  end if;
end $$;
