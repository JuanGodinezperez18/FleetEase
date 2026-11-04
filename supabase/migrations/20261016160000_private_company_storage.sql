-- FleetEase Storage reconciliation.
-- Public access is intentionally limited to non-sensitive vehicle images and
-- company logos. Sensitive documents remain private and tenant-scoped.
-- This migration provisions every bucket referenced by the current APIs.
-- Existing dedicated policies for documents, vehicle-images, company-logos,
-- inspection-images and seguimientos are preserved.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/jpg']::text[]),
  ('vehicle-images', 'vehicle-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/jpg']::text[]),
  ('vehicle-documents', 'vehicle-documents', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/jpg']::text[]),
  ('driver-documents', 'driver-documents', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/jpg']::text[]),
  ('financial-receipts', 'financial-receipts', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/jpg']::text[]),
  ('general-documents', 'general-documents', false, 10485760, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]),
  ('contract-templates', 'contract-templates', false, 10485760, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]),
  ('company-logos', 'company-logos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg']::text[]),
  ('inspection-images', 'inspection-images', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/jpg']::text[]),
  ('seguimientos', 'seguimientos', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic','image/jpg']::text[]),
  ('client-documents', 'client-documents', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/jpg']::text[]),
  ('clients', 'clients', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/jpg']::text[])
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- These seven buckets had no tenant-scoped policies in the live project.
-- Keep the existing specialized policies for the other five buckets intact.
DO $$
DECLARE
  bucket_name text;
  tenant_predicate text;
  staff_predicate text;
BEGIN
  FOREACH bucket_name IN ARRAY ARRAY[
    'vehicle-documents',
    'driver-documents',
    'financial-receipts',
    'general-documents',
    'contract-templates',
    'client-documents',
    'clients'
  ] LOOP
    tenant_predicate :=
      '(public.auth_user_role() = ''super_admin'' OR (' ||
      '(storage.foldername(name))[1] = ''companies'' AND ' ||
      '(storage.foldername(name))[2] = (public.auth_user_company_id())::text))';
    staff_predicate :=
      '(public.auth_user_role() IN (''admin'', ''editor'', ''super_admin'') AND ' ||
      tenant_predicate || ')';

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'FleetEase tenant read ' || bucket_name);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %L AND %s)',
      'FleetEase tenant read ' || bucket_name,
      bucket_name,
      tenant_predicate
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'FleetEase tenant insert ' || bucket_name);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND %s)',
      'FleetEase tenant insert ' || bucket_name,
      bucket_name,
      staff_predicate
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'FleetEase tenant update ' || bucket_name);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND %s) WITH CHECK (bucket_id = %L AND %s)',
      'FleetEase tenant update ' || bucket_name,
      bucket_name,
      staff_predicate,
      bucket_name,
      staff_predicate
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'FleetEase tenant delete ' || bucket_name);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND %s)',
      'FleetEase tenant delete ' || bucket_name,
      bucket_name,
      staff_predicate
    );
  END LOOP;
END $$;
