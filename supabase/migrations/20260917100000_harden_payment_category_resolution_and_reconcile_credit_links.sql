-- Harden payment category resolution for company-scoped categories and legacy names.
-- Partner payments remain balance-level operations; client payments remain
-- linked to a specific income folio; credit payments remain handled by the
-- atomic credit-payment RPC.

create or replace function public.create_financial_payment(
  p_company_id uuid,
  p_payment_kind text,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text default null,
  p_reference text default null,
  p_client_id uuid default null,
  p_partner_id uuid default null,
  p_supplier_id uuid default null,
  p_target_financial_record_id uuid default null,
  p_credit_id uuid default null,
  p_credit_payment_schedule_id uuid default null,
  p_created_by uuid default null
)
returns public.financial_records
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.financial_records;
  v_target public.financial_records;
  v_applied numeric(14,2);
  v_outstanding numeric(14,2);
  v_category_id uuid;
  v_category_name text;
  v_expected_target_type public.financial_record_type;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del pago debe ser mayor que cero';
  end if;

  if p_payment_kind not in ('client_payment','partner_payment','supplier_payment','credit_payment') then
    raise exception 'Tipo de pago no válido: %', p_payment_kind;
  end if;

  if p_payment_kind = 'client_payment' and p_client_id is null then
    raise exception 'Un Pago de Cliente requiere seleccionar un cliente';
  end if;

  if p_payment_kind = 'partner_payment' and p_partner_id is null then
    raise exception 'Un Pago a Socio requiere seleccionar un socio';
  end if;

  if p_payment_kind = 'client_payment' and p_target_financial_record_id is null then
    raise exception 'Un Pago de Cliente requiere seleccionar el folio/cargo pendiente que está liquidando';
  end if;

  -- A partner payment is applied to the partner balance, not to an individual expense.
  if p_payment_kind = 'partner_payment' and p_target_financial_record_id is not null then
    raise exception 'Los pagos a socios se aplican al balance del socio, no a un gasto individual';
  end if;

  if p_target_financial_record_id is not null then
    v_expected_target_type := case
      when p_payment_kind in ('partner_payment','supplier_payment') then 'expense'::public.financial_record_type
      else 'income'::public.financial_record_type
    end;

    select * into v_target
    from public.financial_records
    where id = p_target_financial_record_id
      and company_id = p_company_id
      and is_deleted = false
    for update;

    if not found then
      raise exception 'El cargo financiero indicado no existe o no pertenece a la empresa';
    end if;

    if v_target.type <> v_expected_target_type then
      raise exception 'El registro seleccionado no corresponde al tipo de obligación del pago';
    end if;

    if p_payment_kind = 'client_payment' and v_target.client_id is distinct from p_client_id then
      raise exception 'El folio seleccionado no pertenece al cliente indicado';
    end if;

    select coalesce(sum(coalesce(l.amount_applied, fr.amount)), 0)
      into v_applied
    from public.financial_record_links l
    join public.financial_records fr on fr.id = l.source_financial_record_id
    where l.target_financial_record_id = v_target.id
      and l.relationship_type = p_payment_kind || '_to_financial_record'
      and fr.is_deleted = false;

    v_outstanding := greatest(0, v_target.amount - v_applied);

    if v_outstanding <= 0 then
      raise exception 'El folio seleccionado ya está liquidado';
    end if;

    if p_amount > v_outstanding then
      raise exception 'El pago de % excede el saldo pendiente de %', p_amount, v_outstanding;
    end if;
  end if;

  -- Resolve only the company's own category first. Legacy category names are
  -- accepted so existing companies do not fail merely because `affects` was
  -- not populated consistently in an older category row.
  select fc.id, fc.name
    into v_category_id, v_category_name
  from public.financial_categories fc
  where fc.company_id = p_company_id
    and fc.type::text = 'payment'
    and (
      (p_payment_kind = 'client_payment' and (
        fc.affects::text = 'client_balance'
        or lower(trim(fc.name)) in ('pago de cliente','pago cliente','abono de cliente')
      ))
      or (p_payment_kind = 'partner_payment' and (
        fc.affects::text = 'partner_balance'
        or lower(trim(fc.name)) in ('pago a socio','pago de socio','abono a socio','comisión socio','comision socio')
      ))
      or (p_payment_kind = 'credit_payment' and (
        fc.affects::text = 'credit_payment'
        or lower(trim(fc.name)) in ('pago de crédito','pago credito','pago de crédito semanal')
      ))
      or (p_payment_kind = 'supplier_payment' and (
        fc.affects::text = 'supplier_balance'
        or lower(trim(fc.name)) in ('pago a proveedor','pago de proveedor','abono a proveedor')
      ))
    )
  order by
    case when fc.affects::text = case
      when p_payment_kind = 'client_payment' then 'client_balance'
      when p_payment_kind = 'partner_payment' then 'partner_balance'
      when p_payment_kind = 'credit_payment' then 'credit_payment'
      when p_payment_kind = 'supplier_payment' then 'supplier_balance'
      else '' end then 0 else 1 end,
    fc.is_default desc nulls last,
    fc.created_at asc nulls last
  limit 1;

  if v_category_id is null then
    raise exception 'No existe una categoría de pago configurada para % en la empresa seleccionada', p_payment_kind;
  end if;

  insert into public.financial_records (
    company_id, type, category_id, category, amount, date,
    payment_method, description, reference_code,
    client_id, partner_id, credit_id, credit_payment,
    credit_payment_schedule_id, created_by, is_deleted
  )
  values (
    p_company_id, 'payment', v_category_id, v_category_name, p_amount,
    coalesce(p_payment_date, current_date), p_payment_method,
    case when p_payment_kind = 'client_payment' then 'Pago de Cliente' else v_category_name end,
    p_reference, p_client_id, p_partner_id, p_credit_id,
    p_payment_kind = 'credit_payment', p_credit_payment_schedule_id,
    p_created_by, false
  )
  returning * into v_payment;

  if p_target_financial_record_id is not null then
    insert into public.financial_record_links (
      company_id, source_financial_record_id, target_financial_record_id,
      relationship_type, amount_applied, created_by
    ) values (
      p_company_id, v_payment.id, p_target_financial_record_id,
      p_payment_kind || '_to_financial_record', p_amount, p_created_by
    );
  end if;

  return v_payment;
end;
$$;

-- Historical credit-payment links created by the previous RPC version could
-- have amount_applied = 0 even though the payment record itself has the real
-- amount. Reconcile only those zero-value links; no payment or credit amount
-- is changed and no records are deleted.
update public.financial_record_links l
set amount_applied = fr.amount
from public.financial_records fr
where l.source_financial_record_id = fr.id
  and l.relationship_type = 'credit_payment_to_income'
  and coalesce(l.amount_applied, 0) = 0
  and fr.type = 'payment'
  and coalesce(fr.credit_payment, false) = true
  and fr.is_deleted = false;

revoke execute on function public.create_financial_payment(uuid,text,numeric,date,text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid) from public, anon;
grant execute on function public.create_financial_payment(uuid,text,numeric,date,text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid) to authenticated;
