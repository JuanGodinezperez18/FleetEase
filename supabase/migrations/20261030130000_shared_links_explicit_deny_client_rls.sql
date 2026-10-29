-- Explicit deny-by-default client RLS for shared links.
-- The table contains hashed bearer tokens and private Storage object paths.
-- Access is mediated only by trusted server routes using the service_role client.
-- Keep this policy aligned with the live Supabase migration
-- shared_links_explicit_deny_client_rls.

ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.shared_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_links TO service_role;

DROP POLICY IF EXISTS shared_links_deny_direct_client_access ON public.shared_links;
CREATE POLICY shared_links_deny_direct_client_access
  ON public.shared_links
  AS PERMISSIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY shared_links_deny_direct_client_access ON public.shared_links
  IS 'Explicit deny-by-default: all direct anon/authenticated access is blocked; trusted server routes use service_role.';
