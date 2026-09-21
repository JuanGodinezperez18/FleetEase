-- FleetEase: conectar pagos de proveedor con Cuentas por Pagar.
create or replace function public.reconcile_supplier_payable_after_payment()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_payment public.financial_records; v_payable public.accounts_payable; v_applied numeric(14,2); v_remaining numeric(14,2);
begin
  if new.relationship_type <> 'supplier_payment_to_financial_record' then return new; end if;
  select * into v_payment from public.financial_records where id=new.source_financial_record_id and company_id=new.company_id and is_deleted=false for update;
  if not found or v_payment.type <> 'payment' or v_payment.payment_kind <> 'supplier_payment' then raise exception 'El vínculo no corresponde a un pago válido de proveedor'; end if;
  select * into v_payable from public.accounts_payable where company_id=new.company_id and party_type='supplier' and source_financial_record_id=new.target_financial_record_id and is_deleted=false and status in ('pending','partially_paid') for update;
  if not found then raise exception 'No existe una cuenta por pagar de proveedor para la compra seleccionada'; end if;
  if v_payment.supplier_id is distinct from v_payable.party_id then raise exception 'El proveedor del pago no coincide con el proveedor de la cuenta por pagar'; end if;
  select coalesce(sum(l.amount_applied),0) into v_applied from public.financial_record_links l join public.financial_records p on p.id=l.source_financial_record_id where l.company_id=new.company_id and l.target_financial_record_id=v_payable.source_financial_record_id and l.relationship_type='supplier_payment_to_financial_record' and p.is_deleted=false;
  v_remaining:=greatest(0,round(v_payable.original_amount-v_applied,2));
  update public.accounts_payable set status=case when v_remaining<=0.01 then 'paid' else 'partially_paid' end,updated_at=now() where id=v_payable.id;
  if v_payable.supplier_purchase_id is not null then
    update public.supplier_purchases set status=case when v_remaining<=0.01 then 'paid' else 'partially_paid' end,updated_at=now() where id=v_payable.supplier_purchase_id and company_id=new.company_id and is_deleted=false;
  end if;
  return new;
end; $$;
drop trigger if exists trg_reconcile_supplier_payable_after_payment on public.financial_record_links;
create trigger trg_reconcile_supplier_payable_after_payment after insert on public.financial_record_links for each row execute function public.reconcile_supplier_payable_after_payment();
