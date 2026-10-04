-- Bloque B: notifications — solo el dueño (uid) o admin/super_admin pueden ver/actualizar.
-- Applied live 2026-10-03.

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  uid = (SELECT auth.uid())
  OR (SELECT auth_user_role()) IN ('admin', 'super_admin')
    AND company_id = (SELECT auth_user_company_id())
  OR (SELECT auth_user_role()) = 'super_admin'
);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  uid = (SELECT auth.uid())
  OR (
    (SELECT auth_user_role()) IN ('admin', 'super_admin')
    AND company_id = (SELECT auth_user_company_id())
  )
  OR (SELECT auth_user_role()) = 'super_admin'
)
WITH CHECK (
  uid = (SELECT auth.uid())
  OR (
    (SELECT auth_user_role()) IN ('admin', 'super_admin')
    AND company_id = (SELECT auth_user_company_id())
  )
  OR (SELECT auth_user_role()) = 'super_admin'
);
