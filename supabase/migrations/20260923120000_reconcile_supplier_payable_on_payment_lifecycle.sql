-- Keep supplier accounts payable synchronized with the financial payment ledger.
-- Covers payment creation, amount edits, target changes and soft-delete/reversal.

create or replace function public.reconcile_supplier_payable_after_payment_link_change()
returns trigger
language plpgsql
security invoker
set search_path to public
as $$
begin
  if tg_op = 'DELETE' then
    if old.relationship_type = 'supplier_payment_to_financial_record' then
      perform public.reconcile_supplier_payable_status(old.target_financial_record_id);
    end if;
    return old;
  end if;

  if new.relationship_type = 'supplier_payment_to_financial_record' then
    perform public.reconcile_supplier_payable_status(new.target_financial_record_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reconcile_supplier_payable_after_payment
  on public.financial_record_links;

create trigger trg_reconcile_supplier_payable_after_payment
after insert or delete on public.financial_record_links
for each row
execute function public.reconcile_supplier_payable_after_payment_link_change();

create or replace function public.reconcile_supplier_payable_after_payment_update()
returns trigger
language plpgsql
security invoker
set search_path to public
as $$
declare
  v_target_id uuid;
begin
  if new.type <> 'payment' then
    return new;
  end if;

  for v_target_id in
    select distinct target_financial_record_id
    from public.financial_record_links
    where source_financial_record_id = new.id
      and relationship_type = 'supplier_payment_to_financial_record'
  loop
    perform public.reconcile_supplier_payable_status(v_target_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_reconcile_supplier_payable_after_payment_update
  on public.financial_records;

create trigger trg_reconcile_supplier_payable_after_payment_update
after update of amount,is_deleted on public.financial_records
for each row
execute function public.reconcile_supplier_payable_after_payment_update();

revoke all on function public.reconcile_supplier_payable_after_payment_link_change() from public, anon, authenticated;
revoke all on function public.reconcile_supplier_payable_after_payment_update() from public, anon, authenticated;
