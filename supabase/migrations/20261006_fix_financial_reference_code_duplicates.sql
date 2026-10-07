-- Fix: duplicate key on financial_records_company_reference_code_uidx
-- Causes:
-- 1) Usuario reutiliza la misma referencia manual
-- 2) Colisión al auto-generar FIN-####### (secuencia / imports)
-- Strategy: normalizar, detectar conflicto amigable, y endurecer el trigger de asignación

create or replace function public.next_fleetease_reference_code(p_company_id uuid, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_next bigint;
  v_prefix text := upper(btrim(p_prefix));
  v_code text;
  v_attempt int := 0;
begin
  if v_prefix is null or v_prefix = '' then
    v_prefix := 'FIN';
  end if;

  -- Serializa generación por empresa+prefijo dentro de la transacción
  perform pg_advisory_xact_lock(
    hashtextextended(coalesce(p_company_id::text, 'global') || ':' || v_prefix, 0)
  );

  select coalesce(max(substring(s.reference_code from '[0-9]+$')::bigint), 0) + 1
    into v_next
  from (
    select reference_code from public.clients
      where company_id is not distinct from p_company_id
        and reference_code like v_prefix || '-%'
    union all
    select reference_code from public.credits
      where company_id is not distinct from p_company_id
        and reference_code like v_prefix || '-%'
    union all
    select reference_code from public.financial_records
      where company_id is not distinct from p_company_id
        and reference_code like v_prefix || '-%'
  ) s
  where s.reference_code ~ ('^' || v_prefix || '-[0-9]+$');

  -- Evita devolver un código que ya exista (p. ej. folio manual fuera de secuencia)
  loop
    v_attempt := v_attempt + 1;
    v_code := v_prefix || '-' || lpad(v_next::text, 7, '0');

    exit when not exists (
      select 1 from public.financial_records
      where company_id is not distinct from p_company_id
        and reference_code = v_code
    )
    and not exists (
      select 1 from public.clients
      where company_id is not distinct from p_company_id
        and reference_code = v_code
    )
    and not exists (
      select 1 from public.credits
      where company_id is not distinct from p_company_id
        and reference_code = v_code
    );

    v_next := v_next + 1;
    if v_attempt > 1000 then
      -- Fallback único por tiempo
      v_code := v_prefix || '-' || to_char(clock_timestamp(), 'YYMMDDHH24MISSMS');
      exit;
    end if;
  end loop;

  return v_code;
end;
$$;

create or replace function public.assign_fleetease_reference_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prefix text;
  v_trimmed text;
begin
  v_prefix := case tg_table_name
    when 'clients' then 'CLI'
    when 'credits' then 'CRE'
    when 'financial_records' then 'FIN'
    else 'REC'
  end;

  v_trimmed := nullif(btrim(coalesce(new.reference_code, '')), '');

  if v_trimmed is null then
    new.reference_code := public.next_fleetease_reference_code(new.company_id, v_prefix);
    return new;
  end if;

  new.reference_code := v_trimmed;

  -- Si el folio manual ya existe en financial_records de la misma empresa,
  -- no fallar el pago: generar folio automático (el valor manual puede ir en description).
  if tg_table_name = 'financial_records' and exists (
    select 1
    from public.financial_records fr
    where fr.company_id is not distinct from new.company_id
      and fr.reference_code = v_trimmed
  ) then
    if new.description is null or btrim(new.description) = '' then
      new.description := 'Ref. manual: ' || v_trimmed;
    elsif position(v_trimmed in new.description) = 0 then
      new.description := new.description || ' · Ref. manual: ' || v_trimmed;
    end if;
    new.reference_code := public.next_fleetease_reference_code(new.company_id, v_prefix);
  end if;

  return new;
end;
$$;

-- Asegura que create_financial_payment normalice la referencia antes del INSERT
-- (usa la definición más reciente y solo ajusta p_reference → nullif trim)
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
  v_reference text := nullif(btrim(coalesce(p_reference, '')), '');
  v_description text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del pago debe ser mayor que cero';
  end if;
  if p_payment_kind not in ('client_payment','multa_payment','partner_payment','supplier_payment','credit_payment') then
    raise exception 'Tipo de pago no válido: %', p_payment_kind;
  end if;
  if p_payment_kind in ('client_payment','multa_payment') and p_client_id is null then
    raise exception 'Un pago de cliente/multa requiere seleccionar un cliente';
  end if;
  if p_payment_kind in ('client_payment','multa_payment') and p_target_financial_record_id is null then
    raise exception 'Debe seleccionar el cargo pendiente';
  end if;
  if p_payment_kind = 'partner_payment' and p_partner_id is null then
    raise exception 'Un Pago a Socio requiere seleccionar un socio';
  end if;
  if p_payment_kind = 'supplier_payment' and p_supplier_id is null then
    raise exception 'Un Pago a Proveedor requiere seleccionar un proveedor';
  end if;
  if p_payment_kind = 'partner_payment' and p_target_financial_record_id is not null then
    raise exception 'Los pagos a socios se aplican al balance del socio';
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
      raise exception 'El registro seleccionado no corresponde al tipo de obligación esperado';
    end if;
    if p_payment_kind in ('client_payment','multa_payment') and v_target.client_id is distinct from p_client_id then
      raise exception 'El folio seleccionado no pertenece al cliente indicado';
    end if;

    select coalesce(sum(l.amount_applied), 0) into v_applied
    from public.financial_record_links l
    join public.financial_records src on src.id = l.source_financial_record_id
    where l.target_financial_record_id = p_target_financial_record_id
      and l.company_id = p_company_id
      and src.is_deleted = false;

    v_outstanding := greatest(0, coalesce(v_target.amount, 0) - coalesce(v_applied, 0));
    if v_outstanding <= 0.009 then
      raise exception 'El folio seleccionado ya está liquidado';
    end if;
    if p_amount > v_outstanding + 0.009 then
      raise exception 'El pago de % excede el saldo pendiente de %', p_amount, v_outstanding;
    end if;
  end if;

  select fc.id, fc.name
    into v_category_id, v_category_name
  from public.financial_categories fc
  where (fc.company_id = p_company_id or fc.company_id is null)
    and fc.type::text = 'payment'
    and (
      (p_payment_kind = 'client_payment' and (
        fc.affects::text = 'client_balance'
        or lower(trim(fc.name)) in ('pago de cliente','pago cliente','abono de cliente')
      ))
      or (p_payment_kind = 'multa_payment' and (
        (lower(trim(fc.name)) = 'pago de multa' and fc.affects::text = 'client_balance')
        or lower(trim(fc.name)) in ('pago de multa','pago multa','abono de multa')
      ))
      or (p_payment_kind = 'partner_payment' and fc.affects::text = 'partner_balance')
      or (p_payment_kind = 'credit_payment' and fc.affects::text = 'credit_payment')
      or (p_payment_kind = 'supplier_payment' and lower(trim(fc.name)) in ('pago a proveedor','pago de proveedor','abono a proveedor'))
    )
  order by
    case when fc.company_id = p_company_id then 0 else 1 end,
    fc.is_default desc nulls last,
    fc.name asc
  limit 1;

  if v_category_id is null then
    raise exception 'No existe una categoría configurada para %', p_payment_kind;
  end if;

  v_description := case
    when p_payment_kind = 'multa_payment' then 'Pago de Multa'
    when p_payment_kind = 'client_payment' then 'Pago de Cliente'
    else v_category_name
  end;

  insert into public.financial_records (
    company_id, type, category_id, category, amount, date,
    payment_method, description, reference_code,
    client_id, partner_id, credit_id, credit_payment,
    credit_payment_schedule_id, created_by, is_deleted
  )
  values (
    p_company_id, 'payment', v_category_id, v_category_name, p_amount,
    coalesce(p_payment_date, current_date), p_payment_method,
    v_description,
    v_reference,
    p_client_id, p_partner_id, p_credit_id,
    p_payment_kind = 'credit_payment',
    p_credit_payment_schedule_id, p_created_by, false
  )
  returning * into v_payment;

  if p_target_financial_record_id is not null then
    insert into public.financial_record_links (
      company_id, source_financial_record_id, target_financial_record_id,
      relationship_type, amount_applied, created_by
    )
    values (
      p_company_id, v_payment.id, p_target_financial_record_id,
      p_payment_kind || '_to_financial_record', p_amount, p_created_by
    );
  end if;

  if p_payment_kind = 'multa_payment'
     and v_target.source_record_id is not null
     and v_outstanding - p_amount <= 0.009 then
    update public.multas
       set status = 'pagada',
           fecha_pago = coalesce(p_payment_date, current_date),
           updated_at = now()
     where id = v_target.source_record_id
       and company_id = p_company_id
       and is_deleted = false;
  end if;

  return v_payment;
end;
$$;

revoke execute on function public.create_financial_payment(uuid,text,numeric,date,text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid) from public, anon;
grant execute on function public.create_financial_payment(uuid,text,numeric,date,text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid) to authenticated;

revoke execute on function public.next_fleetease_reference_code(uuid,text) from public, anon, authenticated;
revoke execute on function public.assign_fleetease_reference_code() from public, anon, authenticated;
