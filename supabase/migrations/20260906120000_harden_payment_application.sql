-- Blindaje de pagos: evita sobreaplicaciones y centraliza pago + trazabilidad.
-- La validación se realiza dentro de PostgreSQL para evitar carreras entre clientes.

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
  v_expected_target_type text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del pago debe ser mayor que cero';
  end if;

  if p_payment_kind not in ('client_payment','partner_payment','supplier_payment','credit_payment') then
    raise exception 'Tipo de pago no válido: %', p_payment_kind;
  end if;

  if p_target_financial_record_id is not null then
    v_expected_target_type := case
      when p_payment_kind = 'partner_payment' then 'expense'
      else 'income'
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

    select coalesce(sum(amount_applied),0) into v_applied
    from public.financial_record_links
    where target_financial_record_id = v_target.id;

    v_outstanding := greatest(0, v_target.amount - v_applied);

    if p_amount > v_outstanding then
      raise exception 'El pago de % excede el saldo pendiente de %', p_amount, v_outstanding;
    end if;
  end if;

  select id into v_category_id
  from public.financial_categories
  where company_id = p_company_id
    and type = 'payment'
    and payment_kind = p_payment_kind
  order by created_at nulls last
  limit 1;

  if v_category_id is null then
    raise exception 'No existe categoría financiera para %', p_payment_kind;
  end if;

  insert into public.financial_records (
    company_id, type, category_id, category, amount, date,
    payment_method, reference, client_id, partner_id, supplier_id,
    credit_id, credit_payment, credit_payment_schedule_id,
    payment_kind, created_by, is_deleted
  )
  select
    p_company_id, 'payment', v_category_id,
    fc.name, p_amount, coalesce(p_payment_date, current_date),
    p_payment_method, p_reference, p_client_id, p_partner_id, p_supplier_id,
    p_credit_id, p_payment_kind = 'credit_payment', p_credit_payment_schedule_id,
    p_payment_kind, p_created_by, false
  from public.financial_categories fc
  where fc.id = v_category_id
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

create index if not exists idx_financial_record_links_target_amount
  on public.financial_record_links(target_financial_record_id, amount_applied);
