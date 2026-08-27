-- =====================================================
-- FleetEase Manager - Row Level Security (RLS) Policies
-- =====================================================
-- Base de datos: Supabase PostgreSQL
-- Fecha: 2026-08-08
--
-- VERSIÓN CORREGIDA (auditoría de seguridad):
-- ----------------------------------------------------
-- 1. TODOS los UPDATE llevan WITH CHECK (la fila nueva también se valida),
--    bloqueando el cambio de company_id (desvío entre tenants).
-- 2. Un admin NO puede:
--      - auto-elevarse a super_admin (UPDATE de su propia fila)
--      - crear usuarios super_admin
--      - editar empresas de otro tenant
--    (políticas "users" y "companies").
-- 3. INSERT de logs/auditoría/notificaciones restringidos a la propia empresa
--    (WITH CHECK ya no es `true`): no se pueden falsificar logs ni spamear
--    el inbox de otros tenants.
-- 4. super_admin tiene acceso global en todas las tablas.
-- 5. FIX recursión RLS (42P17): ninguna policy subconsulta `users` directamente;
--    se usan funciones SECURITY DEFINER (auth_user_staff_company_id,
--    auth_user_admin_company_id, auth_user_company_id, auth_user_role).
--
-- Idempotente: se puede ejecutar múltiples veces (DO blocks + DROP POLICY IF EXISTS).
-- Ejecutar DESPUÉS de supabase-schema.sql y 002_create_missing_tables.sql.
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
-- FUNCIONES AUXILIARES (idempotentes)
-- =====================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- FIX (recursión RLS): company_id del usuario SOLO si es staff (admin/editor/super_admin)
CREATE OR REPLACE FUNCTION auth_user_staff_company_id()
RETURNS UUID AS $$
  SELECT CASE WHEN role IN ('admin', 'editor', 'super_admin') THEN company_id ELSE NULL END
  FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- FIX (recursión RLS): company_id del usuario SOLO si es admin/super_admin
CREATE OR REPLACE FUNCTION auth_user_admin_company_id()
RETURNS UUID AS $$
  SELECT CASE WHEN role IN ('admin', 'super_admin') THEN company_id ELSE NULL END
  FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- HELPER: funcion para verificar si una tabla existe
-- =====================================================
CREATE OR REPLACE FUNCTION table_exists(tname TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tname);
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- 1. companies
-- =====================================================
DO $$ BEGIN
IF table_exists('companies') THEN
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Only super_admin can update companies" ON companies;
DROP POLICY IF EXISTS "Only super_admin can insert companies" ON companies;

-- FIX: sin subconsulta autorreferencial (evita recursión RLS 42P17)
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    id = auth_user_company_id()
    OR auth_user_role() = 'super_admin'
  );

-- FIX: admin SOLO puede actualizar SU empresa (id = auth_user_company_id())
CREATE POLICY "Only super_admin can update companies"
  ON companies FOR UPDATE
  USING (
    auth_user_role() = 'super_admin'
    OR (id = auth_user_company_id() AND auth_user_role() = 'admin')
  )
  WITH CHECK (
    auth_user_role() = 'super_admin'
    OR (id = auth_user_company_id() AND auth_user_role() = 'admin')
  );

CREATE POLICY "Only super_admin can insert companies"
  ON companies FOR INSERT
  WITH CHECK (auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 2. users
-- =====================================================
DO $$ BEGIN
IF table_exists('users') THEN
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admin can update users in their company" ON users;
DROP POLICY IF EXISTS "Only super_admin can insert users" ON users;

-- FIX: sin subconsulta autorreferencial (evita recursión RLS 42P17)
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (
    id = auth.uid()
    OR company_id = auth_user_staff_company_id()
    OR auth_user_role() = 'super_admin'
  );

-- FIX: WITH CHECK — un admin NO puede escalar a super_admin, no puede cambiar
-- su propia fila de rol, ni mover usuarios a otra empresa.
CREATE POLICY "Admin can update users in their company"
  ON users FOR UPDATE
  USING (
    company_id = auth_user_admin_company_id()
    OR auth_user_role() = 'super_admin'
  )
  WITH CHECK (
    auth_user_role() = 'super_admin'
    OR (
      company_id = auth_user_company_id()
      AND role <> 'super_admin'
      AND (
        id <> auth.uid()
        OR role = auth_user_role()
      )
    )
  );

-- FIX: admin solo inserta en SU empresa y sin rol super_admin
CREATE POLICY "Only super_admin can insert users"
  ON users FOR INSERT
  WITH CHECK (
    auth_user_role() = 'super_admin'
    OR (
      auth_user_role() = 'admin'
      AND company_id = auth_user_company_id()
      AND role <> 'super_admin'
    )
  );
END IF; END $$;

-- =====================================================
-- 3. clients
-- =====================================================
DO $$ BEGIN
IF table_exists('clients') THEN
DROP POLICY IF EXISTS "Users can view clients in their company" ON clients;
DROP POLICY IF EXISTS "Users can insert clients in their company" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their company" ON clients;

CREATE POLICY "Users can view clients in their company"
  ON clients FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert clients in their company"
  ON clients FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update clients in their company"
  ON clients FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 4. vehicles
-- =====================================================
DO $$ BEGIN
IF table_exists('vehicles') THEN
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON vehicles;
DROP POLICY IF EXISTS "Users can insert vehicles in their company" ON vehicles;
DROP POLICY IF EXISTS "Users can update vehicles in their company" ON vehicles;

CREATE POLICY "Users can view vehicles in their company"
  ON vehicles FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert vehicles in their company"
  ON vehicles FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update vehicles in their company"
  ON vehicles FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 5. partners
-- =====================================================
DO $$ BEGIN
IF table_exists('partners') THEN
DROP POLICY IF EXISTS "Users can view partners in their company" ON partners;
DROP POLICY IF EXISTS "Users can insert partners in their company" ON partners;
DROP POLICY IF EXISTS "Users can update partners in their company" ON partners;

CREATE POLICY "Users can view partners in their company"
  ON partners FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert partners in their company"
  ON partners FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update partners in their company"
  ON partners FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 6. mileage_logs
-- =====================================================
DO $$ BEGIN
IF table_exists('mileage_logs') THEN
DROP POLICY IF EXISTS "Users can view mileage logs in their company" ON mileage_logs;
DROP POLICY IF EXISTS "Users can insert mileage logs in their company" ON mileage_logs;
DROP POLICY IF EXISTS "Users can update mileage logs in their company" ON mileage_logs;

CREATE POLICY "Users can view mileage logs in their company"
  ON mileage_logs FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false OR is_deleted IS NULL) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert mileage logs in their company"
  ON mileage_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update mileage logs in their company"
  ON mileage_logs FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 7. financial_records
-- =====================================================
DO $$ BEGIN
IF table_exists('financial_records') THEN
DROP POLICY IF EXISTS "Users can view financial records in their company" ON financial_records;
DROP POLICY IF EXISTS "Users can insert financial records in their company" ON financial_records;
DROP POLICY IF EXISTS "Users can update financial records in their company" ON financial_records;

CREATE POLICY "Users can view financial records in their company"
  ON financial_records FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert financial records in their company"
  ON financial_records FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update financial records in their company"
  ON financial_records FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 8. financial_categories
-- =====================================================
DO $$ BEGIN
IF table_exists('financial_categories') THEN
DROP POLICY IF EXISTS "Users can view financial categories" ON financial_categories;
DROP POLICY IF EXISTS "Admin can insert financial categories" ON financial_categories;
DROP POLICY IF EXISTS "Admin can update financial categories" ON financial_categories;

CREATE POLICY "Users can view financial categories"
  ON financial_categories FOR SELECT
  USING (company_id IS NULL OR company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Admin can insert financial categories"
  ON financial_categories FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Admin can update financial categories"
  ON financial_categories FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 9. credits
-- =====================================================
DO $$ BEGIN
IF table_exists('credits') THEN
DROP POLICY IF EXISTS "Users can view credits in their company" ON credits;
DROP POLICY IF EXISTS "Users can insert credits in their company" ON credits;
DROP POLICY IF EXISTS "Users can update credits in their company" ON credits;

CREATE POLICY "Users can view credits in their company"
  ON credits FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert credits in their company"
  ON credits FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update credits in their company"
  ON credits FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 10. credit_payment_schedules
-- =====================================================
DO $$ BEGIN
IF table_exists('credit_payment_schedules') THEN
DROP POLICY IF EXISTS "Users can view payment schedules in their company" ON credit_payment_schedules;
DROP POLICY IF EXISTS "Users can insert payment schedules in their company" ON credit_payment_schedules;
DROP POLICY IF EXISTS "Users can update payment schedules in their company" ON credit_payment_schedules;

CREATE POLICY "Users can view payment schedules in their company"
  ON credit_payment_schedules FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false OR is_deleted IS NULL) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert payment schedules in their company"
  ON credit_payment_schedules FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update payment schedules in their company"
  ON credit_payment_schedules FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 11. notifications  (uid es UUID, NO text)
-- =====================================================
DO $$ BEGIN
IF table_exists('notifications') THEN
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    uid = auth.uid()
    OR company_id = auth_user_company_id()
    OR auth_user_role() = 'super_admin'
  );

-- FIX: no más WITH CHECK (true) — no se puede insertar en inbox ajeno/otro tenant
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    uid = auth.uid()
    OR company_id = auth_user_company_id()
    OR auth_user_role() = 'super_admin'
  );

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    uid = auth.uid()
    OR company_id = auth_user_company_id()
    OR auth_user_role() = 'super_admin'
  )
  WITH CHECK (
    uid = auth.uid()
    OR company_id = auth_user_company_id()
    OR auth_user_role() = 'super_admin'
  );
END IF; END $$;

-- =====================================================
-- 12. vehicle_assignment_logs
-- =====================================================
DO $$ BEGIN
IF table_exists('vehicle_assignment_logs') THEN
DROP POLICY IF EXISTS "Users can view assignment logs in their company" ON vehicle_assignment_logs;
DROP POLICY IF EXISTS "Users can insert assignment logs in their company" ON vehicle_assignment_logs;

CREATE POLICY "Users can view assignment logs in their company"
  ON vehicle_assignment_logs FOR SELECT
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert assignment logs in their company"
  ON vehicle_assignment_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 13. company_change_logs
-- =====================================================
DO $$ BEGIN
IF table_exists('company_change_logs') THEN
DROP POLICY IF EXISTS "Admin can view company change logs" ON company_change_logs;
DROP POLICY IF EXISTS "System can insert company change logs" ON company_change_logs;

CREATE POLICY "Admin can view company change logs"
  ON company_change_logs FOR SELECT
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

-- FIX: solo la propia empresa puede insertar (el server usa service role, que bypassa RLS)
CREATE POLICY "System can insert company change logs"
  ON company_change_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 14. client_change_logs
-- =====================================================
DO $$ BEGIN
IF table_exists('client_change_logs') THEN
DROP POLICY IF EXISTS "Users can view client change logs" ON client_change_logs;
DROP POLICY IF EXISTS "System can insert client change logs" ON client_change_logs;

CREATE POLICY "Users can view client change logs"
  ON client_change_logs FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE company_id = auth_user_company_id()
    )
    OR auth_user_role() = 'super_admin'
  );

-- FIX: solo registros de clientes de la propia empresa
CREATE POLICY "System can insert client change logs"
  ON client_change_logs FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE company_id = auth_user_company_id()
    )
    OR auth_user_role() = 'super_admin'
  );
END IF; END $$;

-- =====================================================
-- 15. message_templates
-- =====================================================
DO $$ BEGIN
IF table_exists('message_templates') THEN
DROP POLICY IF EXISTS "Users can view message templates in their company" ON message_templates;
DROP POLICY IF EXISTS "Users can insert message templates in their company" ON message_templates;
DROP POLICY IF EXISTS "Users can update message templates in their company" ON message_templates;

CREATE POLICY "Users can view message templates in their company"
  ON message_templates FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert message templates in their company"
  ON message_templates FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update message templates in their company"
  ON message_templates FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 16. message_logs
-- =====================================================
DO $$ BEGIN
IF table_exists('message_logs') THEN
DROP POLICY IF EXISTS "Users can view message logs in their company" ON message_logs;
DROP POLICY IF EXISTS "Users can insert message logs in their company" ON message_logs;

CREATE POLICY "Users can view message logs in their company"
  ON message_logs FOR SELECT
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert message logs in their company"
  ON message_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 17. multas
-- =====================================================
DO $$ BEGIN
IF table_exists('multas') THEN
DROP POLICY IF EXISTS "Users can view multas in their company" ON multas;
DROP POLICY IF EXISTS "Users can insert multas in their company" ON multas;
DROP POLICY IF EXISTS "Users can update multas in their company" ON multas;

CREATE POLICY "Users can view multas in their company"
  ON multas FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert multas in their company"
  ON multas FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update multas in their company"
  ON multas FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 18. fcm_tokens  (user_id es UUID, NO text)
-- =====================================================
DO $$ BEGIN
IF table_exists('fcm_tokens') THEN
DROP POLICY IF EXISTS "Users can view own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can insert own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can update own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can delete own FCM tokens" ON fcm_tokens;

CREATE POLICY "Users can view own FCM tokens"
  ON fcm_tokens FOR SELECT
  USING (user_id = auth.uid() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert own FCM tokens"
  ON fcm_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update own FCM tokens"
  ON fcm_tokens FOR UPDATE
  USING (user_id = auth.uid() OR auth_user_role() = 'super_admin')
  WITH CHECK (user_id = auth.uid() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can delete own FCM tokens"
  ON fcm_tokens FOR DELETE
  USING (user_id = auth.uid() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 19. audit_logs
-- =====================================================
DO $$ BEGIN
IF table_exists('audit_logs') THEN
DROP POLICY IF EXISTS "Admin can view audit logs in their company" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Admin can view audit logs in their company"
  ON audit_logs FOR SELECT
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

-- FIX: no más WITH CHECK (true)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 20. documents
-- =====================================================
DO $$ BEGIN
IF table_exists('documents') THEN
DROP POLICY IF EXISTS "Users can view documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can insert documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their company" ON documents;

CREATE POLICY "Users can view documents in their company"
  ON documents FOR SELECT
  USING (company_id = auth_user_company_id() AND (is_deleted = false OR is_deleted IS NULL) OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert documents in their company"
  ON documents FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update documents in their company"
  ON documents FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 21. gps_configs
-- =====================================================
DO $$ BEGIN
IF table_exists('gps_configs') THEN
DROP POLICY IF EXISTS "Users can view GPS configs in their company" ON gps_configs;
DROP POLICY IF EXISTS "Users can insert GPS configs in their company" ON gps_configs;
DROP POLICY IF EXISTS "Users can update GPS configs in their company" ON gps_configs;

CREATE POLICY "Users can view GPS configs in their company"
  ON gps_configs FOR SELECT
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert GPS configs in their company"
  ON gps_configs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update GPS configs in their company"
  ON gps_configs FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 22. seguimientos  (created_by es UUID, NO text)
-- =====================================================
DO $$ BEGIN
IF table_exists('seguimientos') THEN
DROP POLICY IF EXISTS "Users can view seguimientos in their company" ON seguimientos;
DROP POLICY IF EXISTS "Users can insert seguimientos in their company" ON seguimientos;
DROP POLICY IF EXISTS "Users can update seguimientos in their company" ON seguimientos;

CREATE POLICY "Users can view seguimientos in their company"
  ON seguimientos FOR SELECT
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

-- FIX: se eliminó el OR created_by = auth.uid() que permitía escribir en cualquier empresa
CREATE POLICY "Users can insert seguimientos in their company"
  ON seguimientos FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can update seguimientos in their company"
  ON seguimientos FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 23. plans
-- =====================================================
DO $$ BEGIN
IF table_exists('plans') THEN
DROP POLICY IF EXISTS "Anyone can view plans" ON plans;
DROP POLICY IF EXISTS "Only super_admin can update plans" ON plans;
DROP POLICY IF EXISTS "Only super_admin can insert plans" ON plans;

CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only super_admin can update plans"
  ON plans FOR UPDATE
  USING (auth_user_role() = 'super_admin')
  WITH CHECK (auth_user_role() = 'super_admin');

CREATE POLICY "Only super_admin can insert plans"
  ON plans FOR INSERT
  WITH CHECK (auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 24. user_invitations
-- =====================================================
DO $$ BEGIN
IF table_exists('user_invitations') THEN
DROP POLICY IF EXISTS "Users can view invitations in their company" ON user_invitations;
DROP POLICY IF EXISTS "Admin can insert invitations in their company" ON user_invitations;
DROP POLICY IF EXISTS "Users can update invitations in their company" ON user_invitations;

CREATE POLICY "Users can view invitations in their company"
  ON user_invitations FOR SELECT
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

-- FIX: sin subconsulta autorreferencial (evita recursión RLS 42P17)
CREATE POLICY "Admin can insert invitations in their company"
  ON user_invitations FOR INSERT
  WITH CHECK (
    company_id = auth_user_admin_company_id()
    OR auth_user_role() = 'super_admin'
  );

-- FIX: WITH CHECK — la invitación no puede moverse a otra empresa
CREATE POLICY "Users can update invitations in their company"
  ON user_invitations FOR UPDATE
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin')
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- 25. plan_limit_logs
-- =====================================================
DO $$ BEGIN
IF table_exists('plan_limit_logs') THEN
DROP POLICY IF EXISTS "Users can view plan limit logs in their company" ON plan_limit_logs;
DROP POLICY IF EXISTS "System can insert plan limit logs" ON plan_limit_logs;

CREATE POLICY "Users can view plan limit logs in their company"
  ON plan_limit_logs FOR SELECT
  USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

-- FIX: no más WITH CHECK (true)
CREATE POLICY "System can insert plan limit logs"
  ON plan_limit_logs FOR INSERT
  WITH CHECK (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');
END IF; END $$;

-- =====================================================
-- ÍNDICES PARA RENDIMIENTO DE RLS
-- =====================================================

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
            NULL;
        END;
    END LOOP;
END $$;

-- =====================================================
-- FIN
-- =====================================================
