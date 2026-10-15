-- Read-only OAuth database role for FleetEase MCP.
-- Apply only after reviewing the MCP PR. Do not enable the Supabase OAuth
-- server before this migration and the Custom Access Token Hook are configured.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mcp_read_only') THEN
    EXECUTE 'CREATE ROLE mcp_read_only NOLOGIN NOINHERIT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mcp_no_access') THEN
    EXECUTE 'CREATE ROLE mcp_no_access NOLOGIN NOINHERIT';
  END IF;
END
$$;

-- Supabase PostgREST's authenticator must be allowed to SET ROLE to roles
-- selected by a signed JWT. The OAuth access-token hook below selects these
-- roles; clients cannot set a role claim without a valid Supabase signature.
GRANT mcp_read_only TO authenticator;
GRANT mcp_no_access TO authenticator;

GRANT USAGE ON SCHEMA public TO mcp_read_only;

-- Start from zero privileges, then grant SELECT only on the initial MCP
-- allowlist. Do not grant access to users, companies, storage, or other tables.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM mcp_read_only, mcp_no_access;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM mcp_read_only, mcp_no_access;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM mcp_read_only, mcp_no_access;

GRANT SELECT ON TABLE
  public.vehicles,
  public.clients,
  public.financial_records,
  public.credits,
  public.partners,
  public.multas
TO mcp_read_only;

-- These SECURITY DEFINER helpers are used by the existing company-scoped
-- RLS policies on the allowlisted tables. Their definitions use an empty
-- search_path and query the current auth.uid() only.
GRANT EXECUTE ON FUNCTION public.auth_user_company_id() TO mcp_read_only;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO mcp_read_only;

-- Supabase Auth invokes this hook as supabase_auth_admin. It reads only the
-- user's current role and assigns a database role with read-only table grants.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON TABLE public.users TO supabase_auth_admin;
DROP POLICY IF EXISTS "MCP auth hook can read user roles" ON public.users;
CREATE POLICY "MCP auth hook can read user roles"
  ON public.users
  FOR SELECT
  TO supabase_auth_admin
  USING (true);

CREATE OR REPLACE FUNCTION public.mcp_oauth_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $function$
DECLARE
  claims jsonb;
  auth_method text;
  app_role text;
  database_role text;
BEGIN
  claims := event -> 'claims';
  auth_method := event ->> 'authentication_method';

  -- OAuth-issued tokens include client_id. Regular FleetEase browser sessions
  -- retain the normal "authenticated" database role.
  IF claims ? 'client_id'
     AND auth_method IN ('oauth_provider/authorization_code', 'token_refresh') THEN
    SELECT u.role::text
      INTO app_role
      FROM public.users AS u
     WHERE u.id = (event ->> 'user_id')::uuid
       AND u.is_deleted = false
     LIMIT 1;

    IF app_role = ANY (ARRAY['admin', 'editor', 'viewer']) THEN
      database_role := 'mcp_read_only';
    ELSE
      -- Partner, client, super_admin, missing/deleted users get no table grants.
      database_role := 'mcp_no_access';
    END IF;

    claims := jsonb_set(claims, '{role}', to_jsonb(database_role), true);
  END IF;

  RETURN jsonb_set(event, '{claims}', claims, true);
END
$function$;

REVOKE ALL ON FUNCTION public.mcp_oauth_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_oauth_access_token_hook(jsonb) TO supabase_auth_admin;

COMMIT;
