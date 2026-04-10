-- =====================================================
-- FleetEase Manager - Row Level Security (RLS) Policies
-- =====================================================
-- Base de datos: Supabase PostgreSQL
-- Fecha: 2026-04-10
-- 
-- IMPORTANTE: Este script solo aplica políticas a tablas
-- que realmente existen. Cada bloque DO verifica la
-- existencia de la tabla antes de ejecutar.
--
-- Principio de aislamiento multi-tenant:
-- - Cada company_id actúa como frontera de datos
-- - Los usuarios solo ven datos de su company_id
-- - super_admin tiene acceso global
-- =====================================================

-- =====================================================
-- 0. HABILITAR RLS EN TODAS LAS TABLAS EXISTENTES
-- =====================================================

DO $$
DECLARE
    tbl TEXT;
    all_tables TEXT[] := ARRAY[
        'users', 'companies', 'clients', 'vehicles', 'partners',
        'mileage_logs', 'financial_records', 'financial_categories',
        'credits', 'credit_payment_schedules', 'notifications',
        'vehicle_assignment_logs', 'company_change_logs', 'client_change_logs',
        'message_templates', 'message_logs', 'multas',
        'fcm_tokens', 'audit_logs', 'documents',
        'gps_configs', 'seguimientos', 'plans',
        'user_invitations', 'plan_limit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY all_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'RLS habilitado: %', tbl;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- FUNCIONES AUXILIARES (siempre seguras - no dependen de tablas)
-- =====================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- 1. companies
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR auth_user_role() = 'super_admin'
  );

CREATE POLICY "Only super_admin can update companies"
  ON companies FOR UPDATE
  USING (auth_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Only super_admin can insert companies"
  ON companies FOR INSERT
  WITH CHECK (auth_user_role() = 'super_admin');

END IF; END $$;

-- =====================================================
-- 2. users
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (
    id = auth.uid()
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  );

CREATE POLICY "Admin can update users in their company"
  ON users FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  );

CREATE POLICY "Only super_admin can insert users"
  ON users FOR INSERT
  WITH CHECK (auth_user_role() IN ('admin', 'super_admin'));

END IF; END $$;

-- =====================================================
-- 3. clients
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN

CREATE POLICY "Users can view clients in their company"
  ON clients FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false));

CREATE POLICY "Users can insert clients in their company"
  ON clients FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update clients in their company"
  ON clients FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 4. vehicles
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicles') THEN

CREATE POLICY "Users can view vehicles in their company"
  ON vehicles FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false));

CREATE POLICY "Users can insert vehicles in their company"
  ON vehicles FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update vehicles in their company"
  ON vehicles FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 5. partners
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'partners') THEN

CREATE POLICY "Users can view partners in their company"
  ON partners FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false));

CREATE POLICY "Users can insert partners in their company"
  ON partners FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update partners in their company"
  ON partners FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 6. mileage_logs
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mileage_logs') THEN

CREATE POLICY "Users can view mileage logs in their company"
  ON mileage_logs FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false OR is_deleted IS NULL));

CREATE POLICY "Users can insert mileage logs in their company"
  ON mileage_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update mileage logs in their company"
  ON mileage_logs FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 7. financial_records
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'financial_records') THEN

CREATE POLICY "Users can view financial records in their company"
  ON financial_records FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false));

CREATE POLICY "Users can insert financial records in their company"
  ON financial_records FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update financial records in their company"
  ON financial_records FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 8. financial_categories
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'financial_categories') THEN

CREATE POLICY "Users can view financial categories"
  ON financial_categories FOR SELECT
  USING (company_id IS NULL OR company_id = auth_user_company_id());

CREATE POLICY "Admin can insert financial categories"
  ON financial_categories FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Admin can update financial categories"
  ON financial_categories FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 9. credits
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credits') THEN

CREATE POLICY "Users can view credits in their company"
  ON credits FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false));

CREATE POLICY "Users can insert credits in their company"
  ON credits FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update credits in their company"
  ON credits FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 10. credit_payment_schedules
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credit_payment_schedules') THEN

CREATE POLICY "Users can view payment schedules in their company"
  ON credit_payment_schedules FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false OR is_deleted IS NULL));

CREATE POLICY "Users can insert payment schedules in their company"
  ON credit_payment_schedules FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update payment schedules in their company"
  ON credit_payment_schedules FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 11. notifications
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    uid = auth.uid()::text
    OR company_id = auth_user_company_id()
  );

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    uid = auth.uid()::text
    OR company_id = auth_user_company_id()
  );

END IF; END $$;

-- =====================================================
-- 12. vehicle_assignment_logs
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicle_assignment_logs') THEN

CREATE POLICY "Users can view assignment logs in their company"
  ON vehicle_assignment_logs FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can insert assignment logs in their company"
  ON vehicle_assignment_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 13. company_change_logs
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_change_logs') THEN

CREATE POLICY "Admin can view company change logs"
  ON company_change_logs FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "System can insert company change logs"
  ON company_change_logs FOR INSERT
  WITH CHECK (true);

END IF; END $$;

-- =====================================================
-- 14. client_change_logs
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_change_logs') THEN

CREATE POLICY "Users can view client change logs"
  ON client_change_logs FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE company_id = auth_user_company_id()
    )
  );

CREATE POLICY "System can insert client change logs"
  ON client_change_logs FOR INSERT
  WITH CHECK (true);

END IF; END $$;

-- =====================================================
-- 15. message_templates
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_templates') THEN

CREATE POLICY "Users can view message templates in their company"
  ON message_templates FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false));

CREATE POLICY "Users can insert message templates in their company"
  ON message_templates FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update message templates in their company"
  ON message_templates FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 16. message_logs
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_logs') THEN

CREATE POLICY "Users can view message logs in their company"
  ON message_logs FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can insert message logs in their company"
  ON message_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 17. multas
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'multas') THEN

CREATE POLICY "Users can view multas in their company"
  ON multas FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false));

CREATE POLICY "Users can insert multas in their company"
  ON multas FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update multas in their company"
  ON multas FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 18. fcm_tokens
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fcm_tokens') THEN

CREATE POLICY "Users can view own FCM tokens"
  ON fcm_tokens FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own FCM tokens"
  ON fcm_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own FCM tokens"
  ON fcm_tokens FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own FCM tokens"
  ON fcm_tokens FOR DELETE
  USING (user_id = auth.uid()::text);

END IF; END $$;

-- =====================================================
-- 19. audit_logs
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN

CREATE POLICY "Admin can view audit logs in their company"
  ON audit_logs FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

END IF; END $$;

-- =====================================================
-- 20. documents
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN

CREATE POLICY "Users can view documents in their company"
  ON documents FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false OR is_deleted IS NULL));

CREATE POLICY "Users can insert documents in their company"
  ON documents FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update documents in their company"
  ON documents FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 21. gps_configs
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gps_configs') THEN

CREATE POLICY "Users can view GPS configs in their company"
  ON gps_configs FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can insert GPS configs in their company"
  ON gps_configs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update GPS configs in their company"
  ON gps_configs FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 22. seguimientos
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'seguimientos') THEN

CREATE POLICY "Users can view seguimientos in their company"
  ON seguimientos FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can insert seguimientos in their company"
  ON seguimientos FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR created_by = auth.uid()::text);

CREATE POLICY "Users can update seguimientos in their company"
  ON seguimientos FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 23. plans
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plans') THEN

CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only super_admin can update plans"
  ON plans FOR UPDATE
  USING (auth_user_role() = 'super_admin');

CREATE POLICY "Only super_admin can insert plans"
  ON plans FOR INSERT
  WITH CHECK (auth_user_role() = 'super_admin');

END IF; END $$;

-- =====================================================
-- 24. user_invitations
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_invitations') THEN

CREATE POLICY "Users can view invitations in their company"
  ON user_invitations FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Admin can insert invitations in their company"
  ON user_invitations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can update invitations in their company"
  ON user_invitations FOR UPDATE
  USING (company_id = auth_user_company_id());

END IF; END $$;

-- =====================================================
-- 25. plan_limit_logs
-- =====================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plan_limit_logs') THEN

CREATE POLICY "Users can view plan limit logs in their company"
  ON plan_limit_logs FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "System can insert plan limit logs"
  ON plan_limit_logs FOR INSERT
  WITH CHECK (true);

END IF; END $$;

-- =====================================================
-- ÍNDICES PARA RENDIMIENTO DE RLS
-- =====================================================
-- CREATE INDEX IF NOT EXISTS solo se ejecuta si la tabla existe

DO $$
DECLARE
    idx_def TEXT;
    idx_defs TEXT[] := ARRAY[
        'CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_partners_company_id ON partners(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_mileage_logs_company_id ON mileage_logs(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_financial_records_company_id ON financial_records(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_credits_company_id ON credits(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_credit_payment_schedules_company_id ON credit_payment_schedules(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_multas_company_id ON multas(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_seguimientos_company_id ON seguimientos(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_gps_configs_company_id ON gps_configs(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_financial_categories_company_id ON financial_categories(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id)',
        'CREATE INDEX IF NOT EXISTS idx_plan_limit_logs_company_id ON plan_limit_logs(company_id)'
    ];
BEGIN
    FOREACH idx_def IN ARRAY idx_defs
    LOOP
        BEGIN
            EXECUTE idx_def;
        EXCEPTION WHEN undefined_table THEN
            -- Tabla no existe, ignorar
            NULL;
        END;
    END LOOP;
END $$;

-- =====================================================
-- FIN
-- =====================================================
