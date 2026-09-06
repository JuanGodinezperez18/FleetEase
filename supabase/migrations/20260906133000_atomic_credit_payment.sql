-- Pago de crédito atómico: actualiza crédito, cuotas, movimiento FIN y trazabilidad
-- dentro de una sola transacción PostgreSQL.

create or replace function public.process_credit_payment_atomic(
  p_company_id uuid,
  p_credit_id uuid,
  p_client_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text default null,
  p_reference text default null,
  p_created_by uuid default null
)
returns public.financial_records
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_credit public.credits;
  v_schedule public.credit_payment_schedules;
  v_payment public.financial_records;
  v_category_id uuid;
  v_remaining numeric(14,2);
  v_due numeric(14,2);
  v_paid_amount numeric(14,2);
  v_fully_paid integer := 0;
  v_has_schedule boolean := false;
  v_new_paid numeric(14,2);
  v_new_balance numeric(14,2);
  v_new_payments integer;
  v_income_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del pago debe ser mayor que cero';
  end if;

  select * into v_credit
  from public.credits
  where id = p_credit_id
    and company_id = p_company_id
    and is_deleted = false
  for update;

  if not found then
    raise exception 'El crédito no existe o no pertenece a la empresa';
  end if;

  if v_credit.status <> 'active' then
    raise exception 'El crédito no está activo';
  end if;

  if p_client_id is not null and v_credit.client_id <> p_client_id then
    raise exception 'El cliente no corresponde al crédito seleccionado';
  end if;

  if p_amount > greatest(0, v_credit.remaining_balance) + 0.009 then
    raise exception 'El pago de % excede el saldo pendiente del crédito de %', p_amount, v_credit.remaining_balance;
  end if;

  select id into v_category_id
  from public.financial_categories
  where company_id = p_company_id
    and type = 'payment'
    and payment_kind = 'credit_payment'
  order by created_at nulls last
  limit 1;

  if v_category_id is null then
    raise exception 'No existe categoría financiera para Pago de Crédito';
  end if;

  v_remaining := p_amount;

  for v_schedule in
    select *
    from public.credit_payment_schedules
    where credit_id = p_credit_id
      and company_id = p_company_id
      and coalesce(is_deleted, false) = false
      and status = 'pending'
    order by payment_number asc
    for update
  loop
    v_has_schedule := true;
    exit when v_remaining <= 0;

    v_paid_amount := coalesce(v_schedule.paid_amount, 0);
    v_due := greatest(0, v_schedule.amount - v_paid_amount);
    if v_due <= 0 then
      continue;
    end if;

    if v_remaining >= v_due then
      update public.credit_payment_schedules
      set paid_amount = v_schedule.amount,
          status = 'paid',
          paid_date = coalesce(p_payment_date, current_date)
      where id = v_schedule.id;
      v_remaining := v_remaining - v_due;
      v_fully_paid := v_fully_paid + 1;
    else
      update public.credit_payment_schedules
      set paid_amount = v_paid_amount + v_remaining
      where id = v_schedule.id;
      v_remaining := 0;
    end if;
  end loop;

  if v_remaining > 0.009 then
    raise exception 'El pago no pudo asignarse completamente a las cuotas pendientes';
  end if;

  v_new_paid := least(v_credit.total_amount, v_credit.paid_amount + p_amount);
  v_new_balance := greatest(0, v_credit.remaining_balance - p_amount);
  v_new_payments := coalesce(v_credit.payments_made, 0) + case when v_has_schedule then v_fully_paid else 1 end;

  update public.credits
  set paid_amount = v_new_paid,
      remaining_balance = v_new_balance,
      payments_made = v_new_payments,
      status = case when v_new_balance <= 0.009 then 'completed' else 'active' end,
      last_payment_date = coalesce(p_payment_date, current_date),
      last_payment_amount = p_amount,
      last_payment_status = 'paid',
      updated_at = now()
  where id = p_credit_id;

  insert into public.financial_records (
    company_id, type, category_id, category, amount, date,
    payment_method, reference, description, client_id,
    credit_id, credit_payment, credit_payment_schedule_id,
    payment_kind, created_by, is_deleted
  )
  select
    p_company_id, 'payment', v_category_id, fc.name, p_amount,
    coalesce(p_payment_date, current_date), p_payment_method, p_reference,
    coalesce(p_reference, fc.name), v_credit.client_id,
    p_credit_id, true, null,
    'credit_payment', p_created_by, false
  from public.financial_categories fc
  where fc.id = v_category_id
  returning * into v_payment;

  -- La cuota exacta queda registrada mediante credit_payment_schedule_id cuando
  -- el pago cubre una sola cuota. Para pagos que cubren varias cuotas, la
  -- relación detallada permanece en el cronograma y el FIN conserva el crédito.
  if v_fully_paid = 1 and p_amount <= v_credit.weekly_payment + 0.009 then
    select id into v_schedule.id
    from public.credit_payment_schedules
    where credit_id = p_credit_id
      and company_id = p_company_id
      and status = 'paid'
      and coalesce(is_deleted, false) = false
      and paid_date = coalesce(p_payment_date, current_date)
    order by payment_number desc
    limit 1;

    update public.financial_records
    set credit_payment_schedule_id = v_schedule.id
    where id = v_payment.id;
  end if;

  select id into v_income_id
  from public.financial_records
  where company_id = p_company_id
    and credit_id = p_credit_id
    and type = 'income'
    and coalesce(credit_granted, false) = true
    and is_deleted = false
  order by date asc, created_at asc
  limit 1;

  if v_income_id is not null then
    insert into public.financial_record_links (
      company_id, source_financial_record_id, target_financial_record_id,
      relationship_type, amount_applied, created_by
    ) values (
      p_company_id, v_payment.id, v_income_id,
      'credit_payment_to_income', p_amount, p_created_by
    );
  end if;

  return v_payment;
end;
$$;
