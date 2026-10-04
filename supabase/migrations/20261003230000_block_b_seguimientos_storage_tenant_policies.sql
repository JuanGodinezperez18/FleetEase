-- Bloque B cierre: políticas tenant para bucket seguimientos.
-- Applied live 2026-10-03. Paths: companies/{companyId}/vehicles/{vehicleId}/seguimientos/...

DROP POLICY IF EXISTS "Users can insert seguimientos media in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update seguimientos media in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete seguimientos media in their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can view seguimientos media in their company" ON storage.objects;

CREATE POLICY "Users can insert seguimientos media in their company"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'seguimientos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can update seguimientos media in their company"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'seguimientos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
)
WITH CHECK (
  bucket_id = 'seguimientos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can delete seguimientos media in their company"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'seguimientos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);

CREATE POLICY "Users can view seguimientos media in their company"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'seguimientos'
  AND (
    auth_user_role() = 'super_admin'
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2] = (auth_user_company_id())::text
    )
  )
);
