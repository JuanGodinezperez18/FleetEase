-- Fix the shared payment RPC to match the production financial schema.
-- The production DB does not expose payment_kind/reference/supplier_id on financial_records
-- or payment_kind on financial_categories. The previous RPC referenced those columns,
-- so client/rent partial payments failed at runtime before the payment was inserted.
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

  if p_payment_kind = 'client_payment' and p_target_financial_record_id is null then
    raise exception 'Un Pago de Cliente requiere seleccionar el folio/cargo pendiente que está liquidando';
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

  select id, name
    into v_category_id, v_category_name
  from public.financial_categories
  where type::text = 'payment'
    and (
      (p_payment_kind = 'client_payment' and lower(trim(name)) in ('pago de cliente','pago cliente','abono de cliente'))
      or (p_payment_kind = 'partner_payment' and lower(trim(name)) in ('pago a socio','pago de socio','abono a socio'))
      or (p_payment_kind = 'supplier_payment' and lower(trim(name)) in ('pago a proveedor','pago de proveedor','abono a proveedor'))
      or (p_payment_kind = 'credit_payment' and lower(trim(name)) in ('pago de crédito','pago credito','pago de crédito semanal'))
    )
  order by case when company_id = p_company_id then 0 else 1 end,
           is_default desc nulls last,
           name asc
  limit 1;

  if v_category_id is null then
    raise exception 'No existe una categoría configurada para %', p_payment_kind;
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
