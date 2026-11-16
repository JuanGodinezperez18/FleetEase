create or replace function public.reconcile_supplier_payable_status(p_target_financial_record_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor record;
  v_company_id uuid;
  v_ap record;
  v_applied numeric(14,2);
  v_remaining numeric(14,2);
  v_status text;
begin
  select company_id, role::text into v_actor
  from public.users where id=auth.uid() and is_deleted=false;
  if not found or v_actor.role not in ('admin','editor','super_admin') then
    raise exception 'SUPPLIER_RECONCILIATION_FORBIDDEN' using errcode='42501';
  end if;
  if p_target_financial_record_id is null then return; end if;
  select company_id into v_company_id from public.financial_records
  where id=p_target_financial_record_id
    and (company_id=v_actor.company_id or v_actor.role='super_admin');
  if not found then
    raise exception 'SUPPLIER_RECONCILIATION_TARGET_FORBIDDEN' using errcode='42501';
  end if;
  for v_ap in
    select id, original_amount, supplier_purchase_id
    from public.accounts_payable
    where source_financial_record_id=p_target_financial_record_id
      and company_id=v_company_id and party_type='supplier' and is_deleted=false
    for update
  loop
    select coalesce(sum(coalesce(l.amount_applied,fr.amount)),0) into v_applied
    from public.financial_record_links l
    join public.financial_records fr on fr.id=l.source_financial_record_id
      and fr.company_id=v_company_id
    where l.target_financial_record_id=p_target_financial_record_id
      and l.company_id=v_company_id
      and l.relationship_type='supplier_payment_to_financial_record'
      and fr.type='payment' and fr.is_deleted=false;
    v_remaining := greatest(round(v_ap.original_amount-v_applied,2),0);
    v_status := case when v_remaining<=0.01 then 'paid'
      when v_applied>0 then 'partially_paid' else 'pending' end;
    update public.accounts_payable set status=v_status,updated_at=now()
    where id=v_ap.id and company_id=v_company_id;
    if v_ap.supplier_purchase_id is not null then
      update public.supplier_purchases set status=v_status,updated_at=now()
      where id=v_ap.supplier_purchase_id and company_id=v_company_id and is_deleted=false;
    end if;
  end loop;
end;
$$;
revoke all on function public.reconcile_supplier_payable_status(uuid) from public,anon;
grant execute on function public.reconcile_supplier_payable_status(uuid) to authenticated;
