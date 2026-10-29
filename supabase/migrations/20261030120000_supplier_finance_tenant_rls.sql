-- FleetEase supplier-finance tenant isolation.
-- Reproduces the RLS protection present in the live Supabase project,
-- which was applied as a live-only migration and was missing from Git.
-- Idempotent so new environments and existing environments converge.

ALTER TABLE public.supplier_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_purchase_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.supplier_purchases,
  public.supplier_purchase_items,
  public.supplier_purchase_allocations,
  public.accounts_payable
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.supplier_purchases,
  public.supplier_purchase_items,
  public.supplier_purchase_allocations,
  public.accounts_payable
TO authenticated;

-- supplier_purchases: direct tenant boundary.
DROP POLICY IF EXISTS supplier_purchases_select ON public.supplier_purchases;
CREATE POLICY supplier_purchases_select ON public.supplier_purchases
  FOR SELECT TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS supplier_purchases_insert ON public.supplier_purchases;
CREATE POLICY supplier_purchases_insert ON public.supplier_purchases
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS supplier_purchases_update ON public.supplier_purchases;
CREATE POLICY supplier_purchases_update ON public.supplier_purchases
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin')
  WITH CHECK (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS supplier_purchases_delete ON public.supplier_purchases;
CREATE POLICY supplier_purchases_delete ON public.supplier_purchases
  FOR DELETE TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

-- supplier_purchase_items has no company_id column; inherit scope from its purchase.
DROP POLICY IF EXISTS supplier_purchase_items_select ON public.supplier_purchase_items;
CREATE POLICY supplier_purchase_items_select ON public.supplier_purchase_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.supplier_purchases p
    WHERE p.id = supplier_purchase_items.purchase_id
      AND (p.company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin')
  ));

DROP POLICY IF EXISTS supplier_purchase_items_insert ON public.supplier_purchase_items;
CREATE POLICY supplier_purchase_items_insert ON public.supplier_purchase_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.supplier_purchases p
    WHERE p.id = supplier_purchase_items.purchase_id
      AND (p.company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin')
  ));

DROP POLICY IF EXISTS supplier_purchase_items_update ON public.supplier_purchase_items;
CREATE POLICY supplier_purchase_items_update ON public.supplier_purchase_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.supplier_purchases p
    WHERE p.id = supplier_purchase_items.purchase_id
      AND (p.company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.supplier_purchases p
    WHERE p.id = supplier_purchase_items.purchase_id
      AND (p.company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin')
  ));

DROP POLICY IF EXISTS supplier_purchase_items_delete ON public.supplier_purchase_items;
CREATE POLICY supplier_purchase_items_delete ON public.supplier_purchase_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.supplier_purchases p
    WHERE p.id = supplier_purchase_items.purchase_id
      AND (p.company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin')
  ));

-- Allocations are company-scoped. This mirrors the current production policy;
-- relationship integrity is enforced separately by the existing financial RPCs.
DROP POLICY IF EXISTS supplier_purchase_allocations_select ON public.supplier_purchase_allocations;
CREATE POLICY supplier_purchase_allocations_select ON public.supplier_purchase_allocations
  FOR SELECT TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS supplier_purchase_allocations_insert ON public.supplier_purchase_allocations;
CREATE POLICY supplier_purchase_allocations_insert ON public.supplier_purchase_allocations
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS supplier_purchase_allocations_update ON public.supplier_purchase_allocations;
CREATE POLICY supplier_purchase_allocations_update ON public.supplier_purchase_allocations
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin')
  WITH CHECK (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS supplier_purchase_allocations_delete ON public.supplier_purchase_allocations;
CREATE POLICY supplier_purchase_allocations_delete ON public.supplier_purchase_allocations
  FOR DELETE TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

-- accounts_payable: direct tenant boundary.
DROP POLICY IF EXISTS accounts_payable_select ON public.accounts_payable;
CREATE POLICY accounts_payable_select ON public.accounts_payable
  FOR SELECT TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS accounts_payable_insert ON public.accounts_payable;
CREATE POLICY accounts_payable_insert ON public.accounts_payable
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS accounts_payable_update ON public.accounts_payable;
CREATE POLICY accounts_payable_update ON public.accounts_payable
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin')
  WITH CHECK (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS accounts_payable_delete ON public.accounts_payable;
CREATE POLICY accounts_payable_delete ON public.accounts_payable
  FOR DELETE TO authenticated
  USING (company_id = public.auth_user_company_id() OR public.auth_user_role() = 'super_admin');
