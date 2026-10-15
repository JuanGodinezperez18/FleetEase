-- Alinea el hook OAuth con consent + policy: staff de empresa puede usar MCP read-only.
-- Partner y client siguen en mcp_no_access.

BEGIN;

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

    -- Staff de la empresa: admin, editor, viewer, super_admin
    IF app_role = ANY (ARRAY['admin', 'editor', 'viewer', 'super_admin']) THEN
      database_role := 'mcp_read_only';
    ELSE
      -- Partner, client, missing/deleted users get no table grants.
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
