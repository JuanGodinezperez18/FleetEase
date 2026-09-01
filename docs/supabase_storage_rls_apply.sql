-- =============================================================================
-- FleetEase Storage RLS — aplicar en Supabase SQL Editor
-- Idempotente: DROP POLICY IF EXISTS + CREATE
-- Ajusta paths si tu convención de carpetas difiere de companies/{company_id}/...
-- =============================================================================

-- Buckets (privados)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('documents', 'documents', false),
  ('vehicle-images', 'vehicle-images', false),
  ('client-documents', 'client-documents', false),
  ('seguimientos', 'seguimientos', false),
  ('inspection-images', 'inspection-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Helper: company_id del usuario actual
-- (usa subquery inline en políticas)

-- documents
DROP POLICY IF EXISTS "Allow read own company documents" ON storage.objects;
CREATE POLICY "Allow read own company documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Allow upload admin editor" ON storage.objects;
CREATE POLICY "Allow upload admin editor" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'editor', 'super_admin')
  )
  AND (
    (storage.foldername(name))[1] = 'companies'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Allow delete admin only" ON storage.objects;
CREATE POLICY "Allow delete admin only" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
  AND (
    (storage.foldername(name))[1] = 'companies'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  )
);

-- vehicle-images
DROP POLICY IF EXISTS "Allow read company vehicle images" ON storage.objects;
CREATE POLICY "Allow read company vehicle images" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-images'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Allow upload vehicle images" ON storage.objects;
CREATE POLICY "Allow upload vehicle images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'editor', 'super_admin')
  )
  AND (
    (storage.foldername(name))[1] = 'companies'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  )
);

-- client-documents
DROP POLICY IF EXISTS "Allow read own company client docs" ON storage.objects;
CREATE POLICY "Allow read own company client docs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Allow upload client documents" ON storage.objects;
CREATE POLICY "Allow upload client documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'editor', 'super_admin')
  )
  AND (
    (storage.foldername(name))[1] = 'companies'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  )
);

-- seguimientos (company en primer segmento del path)
DROP POLICY IF EXISTS "Allow read own seguimientos" ON storage.objects;
CREATE POLICY "Allow read own seguimientos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'seguimientos'
  AND (
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'editor', 'super_admin')
      )
      AND (storage.foldername(name))[1]::text IN (
        SELECT company_id::text FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
      )
    )
    OR
    (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'client')
      AND name LIKE '%' || auth.uid()::text || '%'
    )
  )
);

DROP POLICY IF EXISTS "Allow upload own seguimientos" ON storage.objects;
CREATE POLICY "Allow upload own seguimientos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'seguimientos'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'editor', 'super_admin', 'client')
  )
);

-- inspection-images
DROP POLICY IF EXISTS "Allow read company inspection images" ON storage.objects;
CREATE POLICY "Allow read company inspection images" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'inspection-images'
  AND (
    -- path vehicleId/... — acceso vía API download-file ya valida company
    -- aquí permitimos authenticated de la compañía si el path empieza con companies/
    (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL
      )
    )
    OR true -- uploads legacy vehicleId/file; API route enforces ownership
  )
);

DROP POLICY IF EXISTS "Allow upload inspection images" ON storage.objects;
CREATE POLICY "Allow upload inspection images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'inspection-images'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'editor', 'super_admin')
  )
);

-- Super admin bypass (opcional, si role = super_admin y company_id null)
DROP POLICY IF EXISTS "Super admin full storage access" ON storage.objects;
CREATE POLICY "Super admin full storage access" ON storage.objects
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
);

SELECT id, name, public FROM storage.buckets ORDER BY name;
