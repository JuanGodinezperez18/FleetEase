-- Authorize only the exact amount transition inside the atomic payment edit RPC.
-- No JWT/GUC flag can grant this capability. The table has no business history.
-- The invoker trigger sees zero authorization rows for direct authenticated writes.
create schema if not exists fleetease_private;
revoke all on schema fleetease_private from public, anon, authenticated;
grant usage on schema fleetease_private to authenticated;
create table fleetease_private.payment_edit_authorizations (
 transaction_id bigint not null, backend_pid integer not null, payment_id uuid not null,
 company_id uuid not null, actor_id uuid not null, old_amount numeric not null, new_amount numeric not null,
 primary key(transaction_id,backend_pid,payment_id)
);
alter table fleetease_private.payment_edit_authorizations enable row level security;
revoke all on fleetease_private.payment_edit_authorizations from public, anon, authenticated;
-- No RLS policies: authenticated SELECT is always empty, writes are not granted.
-- SELECT permits the invoker trigger to reject a direct UPDATE with its domain error.
grant select on fleetease_private.payment_edit_authorizations to authenticated;

CREATE OR REPLACE FUNCTION public.enforce_financial_record_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare caller_company uuid; caller_role text; category_company uuid; rel_company uuid; edit_allowed boolean;
begin
  caller_company := public.auth_user_company_id(); caller_role := public.auth_user_role();
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if caller_role is distinct from 'super_admin' and new.company_id is distinct from caller_company then raise exception 'FINANCIAL_COMPANY_MISMATCH'; end if;
  if new.amount is null or new.amount <= 0 then raise exception 'FINANCIAL_AMOUNT_INVALID'; end if;
  if new.type not in ('income','expense','payment') then raise exception 'FINANCIAL_TYPE_INVALID'; end if;
  if new.category_id is null then raise exception 'FINANCIAL_CATEGORY_REQUIRED'; end if;
  select fc.company_id into category_company from public.financial_categories fc where fc.id = new.category_id;
  if not found then raise exception 'FINANCIAL_CATEGORY_NOT_FOUND'; end if;
  if category_company is not null and category_company is distinct from new.company_id then raise exception 'FINANCIAL_CATEGORY_COMPANY_MISMATCH'; end if;
  if new.client_id is not null then
    select c.company_id into rel_company from public.clients c where c.id = new.client_id;
    if not found or rel_company is distinct from new.company_id then raise exception 'FINANCIAL_CLIENT_COMPANY_MISMATCH'; end if;
  end if;
  if new.vehicle_id is not null then
    select v.company_id into rel_company from public.vehicles v where v.id = new.vehicle_id;
    if not found or rel_company is distinct from new.company_id then raise exception 'FINANCIAL_VEHICLE_COMPANY_MISMATCH'; end if;
  end if;
  if new.partner_id is not null then
    select p.company_id into rel_company from public.partners p where p.id = new.partner_id;
    if not found or rel_company is distinct from new.company_id then raise exception 'FINANCIAL_PARTNER_COMPANY_MISMATCH'; end if;
  end if;
  if new.credit_id is not null then
    select cr.company_id into rel_company from public.credits cr where cr.id = new.credit_id;
    if not found or rel_company is distinct from new.company_id then raise exception 'FINANCIAL_CREDIT_COMPANY_MISMATCH'; end if;
  end if;
  if coalesce(new.credit_payment,false) and (new.type <> 'payment' or new.credit_id is null) then raise exception 'CREDIT_PAYMENT_SEMANTICS_INVALID'; end if;
  if coalesce(new.credit_granted,false) and (new.type <> 'income' or new.credit_id is null) then raise exception 'CREDIT_GRANTED_SEMANTICS_INVALID'; end if;
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.company_id is distinct from old.company_id or new.payment_kind is distinct from old.payment_kind or new.type is distinct from old.type or new.category_id is distinct from old.category_id or new.client_id is distinct from old.client_id or new.vehicle_id is distinct from old.vehicle_id or new.partner_id is distinct from old.partner_id or new.credit_id is distinct from old.credit_id or new.credit_payment is distinct from old.credit_payment or new.credit_granted is distinct from old.credit_granted or new.created_by is distinct from old.created_by then
      if caller_role is distinct from 'super_admin' then raise exception 'FINANCIAL_SENSITIVE_FIELDS_IMMUTABLE'; end if;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.amount is distinct from old.amount and caller_role is distinct from 'super_admin' then
    select exists (
      select 1 from fleetease_private.payment_edit_authorizations a
      where a.transaction_id=pg_catalog.txid_current() and a.backend_pid=pg_catalog.pg_backend_pid()
        and a.payment_id=old.id and a.company_id=old.company_id and a.actor_id=auth.uid()
        and a.old_amount=old.amount and a.new_amount=new.amount
    ) into edit_allowed;
    if (old.type <> 'payment' and (old.type <> 'expense' or lower(trim(old.category)) is distinct from 'devolución de depósito')) or old.is_deleted
       or caller_role is null or caller_role not in ('admin','editor') or not edit_allowed then
      raise exception 'FINANCIAL_SENSITIVE_FIELDS_IMMUTABLE';
    end if;
    -- Consume exactly one transition; a subsequent UPDATE needs a new authorization.
    delete from fleetease_private.payment_edit_authorizations a
    where a.transaction_id=pg_catalog.txid_current() and a.backend_pid=pg_catalog.pg_backend_pid()
      and a.payment_id=old.id and a.actor_id=auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_financial_payment_atomic(p_payment_id uuid, p_amount numeric, p_payment_date date, p_payment_method text DEFAULT NULL::text, p_reference text DEFAULT NULL::text, p_target_financial_record_id uuid DEFAULT NULL::uuid)
 RETURNS public.financial_records
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid := auth.uid(); v_company_id uuid := public.auth_user_company_id();
 v_payment public.financial_records; v_target public.financial_records; v_credit_id uuid;
 v_left numeric(14,2); v_applied numeric(14,2); v_deposit record; v_deposit_used numeric(14,2);
 v_available numeric(14,2); v_link record; v_other_paid numeric(14,2); v_credit_total numeric(14,2);
 v_old_supplier_target uuid;
BEGIN
 IF v_uid IS NULL OR v_company_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING errcode='42501'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.users u WHERE u.id=v_uid AND u.is_deleted=false
     AND u.company_id=v_company_id AND u.role IN ('admin','editor','super_admin')
 ) THEN RAISE EXCEPTION 'PAYMENT_ROLE_FORBIDDEN' USING errcode='42501'; END IF;

 IF p_amount IS NULL OR p_amount<=0 OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
 -- Match financial_records.amount numeric(14,2) before authorizing or allocating.
 p_amount:=round(p_amount,2);
 IF p_amount<=0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

 SELECT * INTO v_payment FROM public.financial_records
 WHERE id=p_payment_id AND company_id=v_company_id AND (type='payment' OR (
   type='expense' AND lower(trim(category))='devolución de depósito' AND EXISTS (
     SELECT 1 FROM public.financial_record_links l
     WHERE l.company_id=v_company_id AND l.source_financial_record_id=p_payment_id
       AND l.relationship_type='security_deposit_refund'
   )
 )) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;
 IF v_payment.is_deleted THEN RAISE EXCEPTION 'PAYMENT_ALREADY_DELETED'; END IF;
 INSERT INTO fleetease_private.payment_edit_authorizations
   (transaction_id,backend_pid,payment_id,company_id,actor_id,old_amount,new_amount)
 VALUES(pg_catalog.txid_current(),pg_catalog.pg_backend_pid(),v_payment.id,v_company_id,v_uid,v_payment.amount,p_amount);
 v_credit_id:=v_payment.credit_id;

 SELECT l.target_financial_record_id INTO v_old_supplier_target
 FROM public.financial_record_links l
 WHERE l.source_financial_record_id=p_payment_id
   AND l.relationship_type='supplier_payment_to_financial_record'
 LIMIT 1;

 IF v_payment.credit_payment=true AND v_credit_id IS NOT NULL THEN
   SELECT coalesce(sum(f.amount),0), c.total_amount INTO v_other_paid, v_credit_total
   FROM public.credits c
   LEFT JOIN public.financial_records f ON f.credit_id=c.id AND f.type='payment' AND f.credit_payment=true AND f.is_deleted=false AND f.id<>p_payment_id
   WHERE c.id=v_credit_id AND c.company_id=v_company_id GROUP BY c.total_amount;
   IF NOT FOUND THEN RAISE EXCEPTION 'CREDIT_NOT_FOUND'; END IF;
   IF p_amount > greatest(round(coalesce(v_credit_total,0)-coalesce(v_other_paid,0),2),0) THEN RAISE EXCEPTION 'PAYMENT_EXCEEDS_BALANCE'; END IF;

   UPDATE public.financial_payment_credit_allocations SET is_deleted=true
   WHERE payment_financial_record_id=p_payment_id AND is_deleted=false;
   UPDATE public.financial_records SET amount=p_amount,date=coalesce(p_payment_date,date),payment_method=p_payment_method,reference_code=p_reference,updated_at=now()
   WHERE id=p_payment_id;
   PERFORM public.recalculate_credit_after_payment_change(v_credit_id);

   v_left:=round(p_amount,2);
   FOR v_link IN
     SELECT s.id,s.payment_number,s.amount,s.paid_amount
     FROM public.credit_payment_schedules s
     WHERE s.credit_id=v_credit_id AND s.company_id=v_company_id AND s.is_deleted=false AND s.status IN ('pending','overdue')
     ORDER BY s.payment_number FOR UPDATE
   LOOP
     EXIT WHEN v_left<=0;
     v_applied:=least(v_left,greatest(round(v_link.amount-v_link.paid_amount,2),0));
     IF v_applied>0 THEN
       INSERT INTO public.financial_payment_credit_allocations(company_id,payment_financial_record_id,credit_id,credit_payment_schedule_id,amount_applied)
       VALUES(v_company_id,p_payment_id,v_credit_id,v_link.id,v_applied);
       v_left:=round(v_left-v_applied,2);
     END IF;
   END LOOP;
   IF v_left>0 THEN RAISE EXCEPTION 'PAYMENT_ALLOCATION_FAILED'; END IF;
   PERFORM public.recalculate_credit_after_payment_change(v_credit_id);

 ELSIF v_payment.type='payment' AND (lower(coalesce(v_payment.description,'')) LIKE '%depósito%aplicado%' OR EXISTS (
   SELECT 1 FROM public.financial_record_links l WHERE l.source_financial_record_id=p_payment_id AND l.relationship_type='security_deposit_application')) THEN
   IF p_target_financial_record_id IS NULL THEN RAISE EXCEPTION 'TARGET_REQUIRED'; END IF;
   SELECT * INTO v_target FROM public.financial_records
   WHERE id=p_target_financial_record_id AND company_id=v_company_id AND type='income' AND is_deleted=false FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'TARGET_NOT_FOUND'; END IF;
   IF v_target.client_id IS DISTINCT FROM v_payment.client_id THEN RAISE EXCEPTION 'CLIENT_TARGET_MISMATCH'; END IF;
   DELETE FROM public.financial_record_links WHERE source_financial_record_id=p_payment_id AND relationship_type IN ('security_deposit_application','client_payment_to_financial_record');
   SELECT coalesce(sum(coalesce(l2.amount_applied,f2.amount)),0) INTO v_applied
   FROM public.financial_record_links l2 JOIN public.financial_records f2 ON f2.id=l2.source_financial_record_id
   WHERE l2.target_financial_record_id=v_target.id AND l2.relationship_type='client_payment_to_financial_record' AND f2.is_deleted=false;
   IF p_amount > greatest(v_target.amount-v_applied,0) THEN RAISE EXCEPTION 'PAYMENT_EXCEEDS_OUTSTANDING'; END IF;
   v_left:=p_amount;
   FOR v_deposit IN SELECT d.id,d.amount FROM public.financial_records d
   WHERE d.company_id=v_company_id AND d.client_id=v_payment.client_id AND d.type='income' AND d.category='Depósito en Garantía' AND d.is_deleted=false
   ORDER BY d.date,d.created_at,d.id FOR UPDATE LOOP
     EXIT WHEN v_left<=0;
     SELECT coalesce(sum(l.amount_applied),0) INTO v_deposit_used
     FROM public.financial_record_links l JOIN public.financial_records f ON f.id=l.source_financial_record_id
     WHERE l.target_financial_record_id=v_deposit.id AND l.relationship_type IN ('security_deposit_application','security_deposit_refund') AND f.is_deleted=false AND f.id<>p_payment_id;
     v_available:=greatest(v_deposit.amount-v_deposit_used,0); v_applied:=least(v_left,v_available);
     IF v_applied>0 THEN
       INSERT INTO public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
       VALUES(v_company_id,p_payment_id,v_deposit.id,'security_deposit_application',v_applied,v_uid);
       v_left:=round(v_left-v_applied,2);
     END IF;
   END LOOP;
   IF v_left>0 THEN RAISE EXCEPTION 'DEPOSIT_INSUFFICIENT'; END IF;
   INSERT INTO public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
   VALUES(v_company_id,p_payment_id,v_target.id,'client_payment_to_financial_record',p_amount,v_uid);
   UPDATE public.financial_records SET amount=p_amount,date=coalesce(p_payment_date,date),payment_method=p_payment_method,reference_code=p_reference,updated_at=now() WHERE id=p_payment_id;

 ELSIF lower(trim(coalesce(v_payment.category,'')))='devolución de depósito' THEN
   DELETE FROM public.financial_record_links WHERE source_financial_record_id=p_payment_id AND relationship_type='security_deposit_refund';
   v_left:=p_amount;
   FOR v_deposit IN SELECT d.id,d.amount FROM public.financial_records d
   WHERE d.company_id=v_company_id AND d.client_id=v_payment.client_id AND d.type='income' AND d.category='Depósito en Garantía' AND d.is_deleted=false
   ORDER BY d.date,d.created_at,d.id FOR UPDATE LOOP
     EXIT WHEN v_left<=0;
     SELECT coalesce(sum(l.amount_applied),0) INTO v_deposit_used
     FROM public.financial_record_links l JOIN public.financial_records f ON f.id=l.source_financial_record_id
     WHERE l.target_financial_record_id=v_deposit.id AND l.relationship_type IN ('security_deposit_application','security_deposit_refund') AND f.is_deleted=false AND f.id<>p_payment_id;
     v_available:=greatest(v_deposit.amount-v_deposit_used,0); v_applied:=least(v_left,v_available);
     IF v_applied>0 THEN
       INSERT INTO public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
       VALUES(v_company_id,p_payment_id,v_deposit.id,'security_deposit_refund',v_applied,v_uid);
       v_left:=round(v_left-v_applied,2);
     END IF;
   END LOOP;
   IF v_left>0 THEN RAISE EXCEPTION 'DEPOSIT_INSUFFICIENT'; END IF;
   UPDATE public.financial_records SET amount=p_amount,date=coalesce(p_payment_date,date),payment_method=p_payment_method,reference_code=p_reference,updated_at=now() WHERE id=p_payment_id;

 ELSE
   SELECT l.relationship_type,l.target_financial_record_id INTO v_link
   FROM public.financial_record_links l
   WHERE l.source_financial_record_id=p_payment_id
   ORDER BY l.created_at DESC LIMIT 1;

   IF v_link.relationship_type IS NOT NULL THEN
     IF p_target_financial_record_id IS NULL THEN RAISE EXCEPTION 'TARGET_REQUIRED'; END IF;
     SELECT * INTO v_target FROM public.financial_records
     WHERE id=p_target_financial_record_id AND company_id=v_company_id AND is_deleted=false FOR UPDATE;
     IF NOT FOUND THEN RAISE EXCEPTION 'TARGET_NOT_FOUND'; END IF;
     IF v_link.relationship_type='client_payment_to_financial_record' AND v_target.type<>'income' THEN RAISE EXCEPTION 'TARGET_TYPE_INVALID'; END IF;
     IF v_link.relationship_type='supplier_payment_to_financial_record' AND v_target.type<>'expense' THEN RAISE EXCEPTION 'TARGET_TYPE_INVALID'; END IF;
     IF v_link.relationship_type='client_payment_to_financial_record' AND v_target.client_id IS DISTINCT FROM v_payment.client_id THEN RAISE EXCEPTION 'CLIENT_TARGET_MISMATCH'; END IF;
     IF v_link.relationship_type='supplier_payment_to_financial_record' AND NOT EXISTS (
       SELECT 1 FROM public.accounts_payable ap
       WHERE ap.company_id=v_company_id AND ap.party_type='supplier'
         AND ap.source_financial_record_id=p_target_financial_record_id AND ap.is_deleted=false
     ) THEN RAISE EXCEPTION 'SUPPLIER_TARGET_INVALID'; END IF;

     v_applied:=coalesce((
       SELECT sum(coalesce(l2.amount_applied,f2.amount))
       FROM public.financial_record_links l2
       JOIN public.financial_records f2 ON f2.id=l2.source_financial_record_id
       WHERE l2.target_financial_record_id=v_target.id
         AND l2.relationship_type=v_link.relationship_type
         AND f2.is_deleted=false AND f2.id<>p_payment_id),0);
     IF p_amount>greatest(v_target.amount-v_applied,0) THEN RAISE EXCEPTION 'PAYMENT_EXCEEDS_OUTSTANDING'; END IF;

     DELETE FROM public.financial_record_links
     WHERE source_financial_record_id=p_payment_id AND relationship_type=v_link.relationship_type;

     INSERT INTO public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
     VALUES(v_company_id,p_payment_id,p_target_financial_record_id,v_link.relationship_type,p_amount,v_uid);

     IF v_link.relationship_type='supplier_payment_to_financial_record' THEN
       IF v_old_supplier_target IS NOT NULL AND v_old_supplier_target IS DISTINCT FROM p_target_financial_record_id THEN
         PERFORM public.reconcile_supplier_payable_status(v_old_supplier_target);
       END IF;
       PERFORM public.reconcile_supplier_payable_status(p_target_financial_record_id);
     END IF;
   ELSE
     IF v_payment.partner_id IS NULL THEN RAISE EXCEPTION 'PAYMENT_KIND_NOT_RECOGNIZED'; END IF;
     IF p_target_financial_record_id IS NOT NULL THEN RAISE EXCEPTION 'PARTNER_TARGET_NOT_ALLOWED'; END IF;
   END IF;

   UPDATE public.financial_records
   SET amount=p_amount,date=coalesce(p_payment_date,date),payment_method=p_payment_method,reference_code=p_reference,updated_at=now()
   WHERE id=p_payment_id;
 END IF;

 INSERT INTO public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
 VALUES('update'::public.audit_action,'financial_record',p_payment_id,'Pago',v_uid,null,now(),
        jsonb_build_object('payment_id',p_payment_id,'amount',p_amount,'date',p_payment_date,'reference',p_reference),v_company_id);

 SELECT * INTO v_payment FROM public.financial_records WHERE id=p_payment_id;
 DELETE FROM fleetease_private.payment_edit_authorizations a
 WHERE a.transaction_id=pg_catalog.txid_current() AND a.backend_pid=pg_catalog.pg_backend_pid()
   AND a.payment_id=p_payment_id AND a.actor_id=v_uid;
 RETURN v_payment;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_financial_payment_atomic(p_payment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid := auth.uid();
 v_company_id uuid := public.auth_user_company_id();
 v_payment public.financial_records;
 v_credit_id uuid;
 v_supplier_target uuid;
BEGIN
 IF v_uid IS NULL OR v_company_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING errcode='42501'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.users u WHERE u.id=v_uid AND u.is_deleted=false
     AND u.company_id=v_company_id AND u.role IN ('admin','editor','super_admin')
 ) THEN RAISE EXCEPTION 'PAYMENT_ROLE_FORBIDDEN' USING errcode='42501'; END IF;


 SELECT * INTO v_payment
 FROM public.financial_records
 WHERE id=p_payment_id AND company_id=v_company_id AND (type='payment' OR (
   type='expense' AND lower(trim(category))='devolución de depósito' AND EXISTS (
     SELECT 1 FROM public.financial_record_links l
     WHERE l.company_id=v_company_id AND l.source_financial_record_id=p_payment_id
       AND l.relationship_type='security_deposit_refund'
   )
 ))
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;
 IF v_payment.is_deleted THEN RAISE EXCEPTION 'PAYMENT_ALREADY_DELETED'; END IF;

 v_credit_id:=v_payment.credit_id;

 SELECT l.target_financial_record_id INTO v_supplier_target
 FROM public.financial_record_links l
 WHERE l.source_financial_record_id=p_payment_id
   AND l.relationship_type='supplier_payment_to_financial_record'
 LIMIT 1;

 UPDATE public.financial_records
 SET is_deleted=true, updated_at=now()
 WHERE id=p_payment_id AND company_id=v_company_id;

 IF v_credit_id IS NOT NULL AND v_payment.credit_payment=true THEN
   PERFORM public.recalculate_credit_after_payment_change(v_credit_id);
 END IF;

 IF v_supplier_target IS NOT NULL THEN
   PERFORM public.reconcile_supplier_payable_status(v_supplier_target);
 END IF;

 INSERT INTO public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
 VALUES('delete'::public.audit_action,'financial_record',p_payment_id,'Pago',v_uid,null,now(),
        jsonb_build_object('payment_id',p_payment_id,'amount',v_payment.amount,'credit_id',v_payment.credit_id,
                           'supplier_target_financial_record_id',v_supplier_target),v_company_id);

 RETURN jsonb_build_object('success',true,'paymentId',p_payment_id,'creditId',v_credit_id);
END;
$function$
;

revoke execute on function public.enforce_financial_record_integrity() from public,anon,authenticated;
revoke execute on function public.update_financial_payment_atomic(uuid,numeric,date,text,text,uuid) from public,anon;
grant execute on function public.update_financial_payment_atomic(uuid,numeric,date,text,text,uuid) to authenticated;
revoke execute on function public.delete_financial_payment_atomic(uuid) from public,anon;
grant execute on function public.delete_financial_payment_atomic(uuid) to authenticated;
