-- FleetEase is an authenticated SaaS. Public/anonymous Data API access to business tables is not required.
-- RLS alone is not enough: grants are the first authorization layer.
DO $$
declare r record;
begin
  for r in select schemaname, tablename from pg_tables where schemaname='public' loop
    execute format('revoke all on table %I.%I from anon', r.schemaname, r.tablename);
  end loop;
end $$;

-- Authenticated access remains governed by RLS. Sensitive financial writes are
-- intentionally not revoked in this migration yet because the frontend still
-- contains legacy direct writes; the DB trigger already rejects forged financial
-- semantics and immutable-field changes. The next migration will switch those
-- writes to RPCs and then revoke direct DML.
