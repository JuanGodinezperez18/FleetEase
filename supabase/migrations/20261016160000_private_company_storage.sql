-- FleetEase: customer and company media must never be publicly readable.
-- The application's own brand assets remain in Next.js /public, not in Storage.
-- Run only after the private-URL consumer changes in this branch are deployed.

DO $$
DECLARE
  policy_row record;
  target_buckets text[] := ARRAY[
    'documents',
    'vehicle-images',
    'driver-documents',
    'financial-receipts',
    'general-documents',
    'contract-templates',
    'company-logos',
    'inspection-images',
    'seguimientos',
    'client-documents'
  ];
  bucket_name text;
  policy_name text;
  tenant_predicate text;
  write_predicate text;
BEGIN
  UPDATE storage.buckets SET public = false WHERE id = ANY(target_buckets);

  -- Remove existing bucket-specific policies for these buckets before adding
  -- the strict tenant-scoped policies below. Preserve global super-admin policy.
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        coalesce(qual, '') || ' ' || coalesce(with_check, '')
      ) ILIKE ANY (ARRAY[
        '%documents%', '%vehicle-images%', '%driver-documents%',
        '%financial-receipts%', '%general-documents%', '%contract-templates%',
        '%company-logos%', '%inspection-images%', '%seguimientos%',
        '%client-documents%'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_row.policyname);
  END LOOP;

  FOREACH bucket_name IN ARRAY target_buckets LOOP
    tenant_predicate := '(public.auth_user_role() = ''super_admin'' OR ((storage.foldername(name))[1] = ''companies'' AND (storage.foldername(name))[2] = (public.auth_user_company_id())::text))';

    policy_name := 'FleetEase private read ' || bucket_name;
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %L AND %s)',
      policy_name, bucket_name, tenant_predicate
    );

    write_predicate := format('(public.auth_user_role() IN (''admin'', ''editor'', ''super_admin'') AND %s)', tenant_predicate);

    policy_name := 'FleetEase private insert ' || bucket_name;
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND %s)',
      policy_name, bucket_name, write_predicate
    );

    policy_name := 'FleetEase private update ' || bucket_name;
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND %s) WITH CHECK (bucket_id = %L AND %s)',
      policy_name, bucket_name, write_predicate, bucket_name, write_predicate
    );

    policy_name := 'FleetEase private delete ' || bucket_name;
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND %s)',
      policy_name, bucket_name, write_predicate
    );
  END LOOP;
END $$;
