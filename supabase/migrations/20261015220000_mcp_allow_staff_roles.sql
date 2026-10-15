-- Alinea el hook OAuth: staff + partner + client pueden recibir mcp_read_only.
-- El alcance (empresa vs propio) se aplica en la API MCP y en RLS.

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

  IF claims ? 'client_id'
     AND auth_method IN ('oauth_provider/authorization_code', 'token_refresh') THEN
    SELECT u.role::text
      INTO app_role
      FROM public.users AS u
     WHERE u.id = (event ->> 'user_id')::uuid
       AND u.is_deleted = false
     LIMIT 1;

    IF app_role = ANY (
      ARRAY['admin', 'editor', 'viewer', 'super_admin', 'partner', 'client']
    ) THEN
      database_role := 'mcp_read_only';
    ELSE
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
