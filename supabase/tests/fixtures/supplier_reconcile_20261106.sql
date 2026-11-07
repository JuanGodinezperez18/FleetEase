-- Snapshot of the existing live reconciler for isolated tests only.
CREATE OR REPLACE FUNCTION public.reconcile_supplier_payable_status(p_target_financial_record_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ap record;
  v_applied numeric(14,2);
  v_remaining numeric(14,2);
  v_status text;
BEGIN
  IF p_target_financial_record_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_ap IN
    SELECT id, original_amount, supplier_purchase_id
    FROM public.accounts_payable
    WHERE source_financial_record_id = p_target_financial_record_id
      AND party_type = 'supplier'
      AND is_deleted = false
    FOR UPDATE
  LOOP
    SELECT COALESCE(SUM(COALESCE(l.amount_applied, fr.amount)), 0)
    INTO v_applied
    FROM public.financial_record_links l
    JOIN public.financial_records fr
      ON fr.id = l.source_financial_record_id
    WHERE l.target_financial_record_id = p_target_financial_record_id
      AND l.relationship_type = 'supplier_payment_to_financial_record'
      AND fr.type = 'payment'
      AND fr.is_deleted = false;

    v_remaining := GREATEST(ROUND(v_ap.original_amount - v_applied, 2), 0);

    v_status := CASE
      WHEN v_remaining <= 0.01 THEN 'paid'
      WHEN v_applied > 0 THEN 'partially_paid'
      ELSE 'pending'
    END;

    UPDATE public.accounts_payable
    SET status = v_status, updated_at = now()
    WHERE id = v_ap.id;

    IF v_ap.supplier_purchase_id IS NOT NULL THEN
      UPDATE public.supplier_purchases
      SET status = v_status, updated_at = now()
      WHERE id = v_ap.supplier_purchase_id
        AND is_deleted = false;
    END IF;
  END LOOP;
END;
$function$
;

