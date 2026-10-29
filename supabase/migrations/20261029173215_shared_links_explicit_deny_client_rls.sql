-- Keep shared_links inaccessible through the public Supabase Data API.
-- Public access is intentionally mediated by token-validated Next.js routes
-- using the service_role client; never grant direct table access to browser roles.

ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.shared_links FROM PUBLIC, anon, authenticated;

-- Explicit deny-all policy documents the intended boundary and satisfies
-- security linting without opening direct access to token hashes or metadata.
DROP POLICY IF EXISTS shared_links_deny_direct_client_access ON public.shared_links;
CREATE POLICY shared_links_deny_direct_client_access
  ON public.shared_links
  AS PERMISSIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- service_role retains the explicit table grants used by trusted server routes.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_links TO service_role;
