-- FleetEase: sincronizar pagos de proveedor con Cuentas por Pagar y compras.
-- Esta migración evita depender de columnas obsoletas (payment_kind/supplier_id)
-- que ya no existen en financial_records.

create or replace function public.reconcile_supplier_payable_status(p_target_financial_record_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_ap record;
  v_applied numeric(14,2);
  v_remaining numeric(14,2);
  v_status text;
begin
  if p_target_financial_record_id is null then
    return;
  end if;

  for v_ap in
    select id, original_amount, supplier_purchase_id
    from public.accounts_payable
    where source_financial_record_id = p_target_financial_record_id
      and party_type = 'supplier'
      and is_deleted = false
    for update
  loop
    select coalesce(sum(coalesce(l.amount_applied, fr.amount)), 0)
      into v_applied
    from public.financial_record_links l
    join public.financial_records fr on fr.id = l.source_financial_record_id
    where l.target_financial_record_id = p_target_financial_record_id
      and l.relationship_type = 'supplier_payment_to_financial_record'
      and fr.type = 'payment'
      and fr.is_deleted = false;

    v_remaining := greatest(round(v_ap.original_amount - v_applied, 2), 0);

    v_status := case
      when v_remaining <= 0.01 then 'paid'
      when v_applied > 0 then 'partially_paid'
      else 'pending'
    end;

    update public.accounts_payable
      set status = v_status, updated_at = now()
    where id = v_ap.id;

    if v_ap.supplier_purchase_id is not null then
      update public.supplier_purchases
        set status = v_status, updated_at = now()
      where id = v_ap.supplier_purchase_id
        and is_deleted = false;
    end if;
  end loop;
end;
$$;

revoke all on function public.reconcile_supplier_payable_status(uuid) from public;
grant execute on function public.reconcile_supplier_payable_status(uuid) to authenticated;

create or replace function public.reconcile_supplier_payable_after_payment()
returns trigger
language plpgsql
security invoker
set search_path to public
as $$
begin
  if new.relationship_type = 'supplier_payment_to_financial_record' then
    perform public.reconcile_supplier_payable_status(new.target_financial_record_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reconcile_supplier_payable_after_payment
  on public.financial_record_links;

create trigger trg_reconcile_supplier_payable_after_payment
after insert on public.financial_record_links
for each row
execute function public.reconcile_supplier_payable_after_payment();
