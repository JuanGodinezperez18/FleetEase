-- Bloque B: revoke residual anon grants + tenant policies on public storage buckets
-- Applied live via Supabase MCP 2026-10-03. Upload path uses service_role (API routes);
-- policies protect client-side Storage access. Paths: companies/{companyId}/...

-- 1) Revoke anon table privileges (RLS already exists; defense-in-depth)
REVOKE ALL ON TABLE public.accounts_payable FROM anon;
REVOKE ALL ON TABLE public.notification_read_states FROM anon;
REVOKE ALL ON TABLE public.supplier_purchase_allocations FROM anon;
REVOKE ALL ON TABLE public.supplier_purchase_items FROM anon;
REVOKE ALL ON TABLE public.supplier_purchases FROM anon;
REVOKE ALL ON TABLE public.vehicle_inspections FROM anon;

-- 2) vehicle-images
DROP POLICY IF EXISTS "Users can insert vehicle images in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vehicle images in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle images in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vehicle images in their company" ON storage.objects;

CREATE POLICY "Users can insert vehicle images in their company"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can update vehicle images in their company"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vehicle-images'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
)
WITH CHECK (
  bucket_id = 'vehicle-images'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can delete vehicle images in their company"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vehicle-images'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can view vehicle images in their company"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-images'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

-- 3) company-logos
DROP POLICY IF EXISTS "Users can insert company logos in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company logos in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company logos in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can view company logos in their company" ON storage.objects;

CREATE POLICY "Users can insert company logos in their company"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can update company logos in their company"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
)
WITH CHECK (
  bucket_id = 'company-logos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can delete company logos in their company"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can view company logos in their company"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);
