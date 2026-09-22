-- Fix multa payment flow: use the existing client-payment category as a payment record.
-- The previous implementation searched for Pago de Cliente with type = income,
-- but the canonical category is type = payment. The RPC also makes the multa
-- status update and financial record insertion atomic.

create or replace function public.process_multa_payment_atomic(
  p_multa_id uuid,
  p_client_id uuid,
  p_vehicle_id uuid,
  p_company_id uuid,
  p_amount numeric,
  p_date date,
  p_payment_method text,
  p_description text,
  p_created_by uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_multa public.multas%rowtype;
  v_category_id uuid;
  v_financial_id uuid;
begin
  if p_multa_id is null or p_company_id is null or p_amount is null or p_amount <= 0 or p_date is null then
    raise exception 'Datos de pago inválidos';
  end if;

  select * into v_multa
  from public.multas
  where id = p_multa_id
    and company_id = p_company_id
    and is_deleted = false
  for update;

  if not found then raise exception 'Multa no encontrada'; end if;
  if v_multa.status = 'pagada' then raise exception 'La multa ya está pagada'; end if;
  if v_multa.status = 'cancelada' then raise exception 'Una multa cancelada no puede pagarse'; end if;
  if abs(p_amount - v_multa.total) > 0.01 then
    raise exception 'El importe del pago debe ser igual al total de la multa';
  end if;

  select id into v_category_id
  from public.financial_categories
  where (company_id = p_company_id or company_id is null)
    and lower(name) = lower('Pago de Cliente')
    and type = 'payment'
  order by company_id nulls last
  limit 1;

  if v_category_id is null then
    raise exception 'No existe la categoría financiera Pago de Cliente para pagos';
  end if;

  insert into public.financial_records (
    company_id, client_id, vehicle_id, category_id, category, type, amount,
    payment_method, description, date, is_pending, is_deleted, created_by,
    source_record_id, source_record_type, created_at, updated_at
  ) values (
    p_company_id,
    coalesce(p_client_id, v_multa.client_id),
    coalesce(p_vehicle_id, v_multa.vehicle_id),
    v_category_id,
    'Pago de Cliente',
    'payment'::public.financial_record_type,
    p_amount,
    nullif(trim(coalesce(p_payment_method, '')), ''),
    coalesce(nullif(trim(p_description), ''), 'Pago de multa' || case when v_multa.folio is not null then ' - Folio ' || v_multa.folio else '' end),
    p_date,
    false,
    false,
    p_created_by,
    p_multa_id,
    'multa',
    now(),
    now()
  ) returning id into v_financial_id;

  update public.multas
  set status = 'pagada', fecha_pago = p_date, updated_at = now()
  where id = p_multa_id;

  return jsonb_build_object('multa_id', p_multa_id, 'financial_record_id', v_financial_id, 'status', 'pagada');
end;
$$;

revoke all on function public.process_multa_payment_atomic(uuid,uuid,uuid,uuid,numeric,date,text,text,uuid) from public;
grant execute on function public.process_multa_payment_atomic(uuid,uuid,uuid,uuid,numeric,date,text,text,uuid) to authenticated;
