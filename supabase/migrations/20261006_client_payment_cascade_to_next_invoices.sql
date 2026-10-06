-- Allow client_payment amount > selected invoice; cascade remainder to next open incomes.

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
  v_other public.financial_records;
  v_applied numeric(14,2);
  v_outstanding numeric(14,2);
  v_category_id uuid;
  v_category_name text;
  v_expected_target_type public.financial_record_type;
  v_reference text := nullif(btrim(coalesce(p_reference, '')), '');
  v_description text;
  v_remaining numeric(14,2);
  v_chunk numeric(14,2);
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
    if p_payment_kind = 'multa_payment' and (v_target.source_record_type is distinct from 'multa' or v_target.source_record_id is null) then
      raise exception 'El registro seleccionado no corresponde a una multa';
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

    -- Multa y otros: no permitir exceso. Cliente: sí (cascada).
    if p_payment_kind is distinct from 'client_payment' and p_amount > v_outstanding + 0.009 then
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
    v_description, v_reference,
    p_client_id, p_partner_id, p_credit_id,
    p_payment_kind = 'credit_payment',
    p_credit_payment_schedule_id, p_created_by, false
  )
  returning * into v_payment;

  -- Aplicación del pago (con cascada solo para client_payment)
  if p_target_financial_record_id is not null then
    v_remaining := p_amount;
    v_chunk := least(v_outstanding, v_remaining);

    if v_chunk > 0.009 then
      insert into public.financial_record_links (
        company_id, source_financial_record_id, target_financial_record_id,
        relationship_type, amount_applied, created_by
      )
      values (
        p_company_id, v_payment.id, p_target_financial_record_id,
        p_payment_kind || '_to_financial_record', v_chunk, p_created_by
      );
      v_remaining := v_remaining - v_chunk;
    end if;

    if p_payment_kind = 'client_payment' and v_remaining > 0.009 then
      for v_other in
        select fr.*
        from public.financial_records fr
        where fr.company_id = p_company_id
          and fr.client_id = p_client_id
          and fr.type = 'income'
          and fr.is_deleted = false
          and fr.id is distinct from p_target_financial_record_id
          and coalesce(fr.category, '') is distinct from 'Depósito en Garantía'
        order by fr.date asc, fr.created_at asc nulls last
        for update
      loop
        exit when v_remaining <= 0.009;

        select coalesce(sum(l.amount_applied), 0) into v_applied
        from public.financial_record_links l
        join public.financial_records src on src.id = l.source_financial_record_id
        where l.target_financial_record_id = v_other.id
          and l.company_id = p_company_id
          and src.is_deleted = false;

        v_outstanding := greatest(0, coalesce(v_other.amount, 0) - coalesce(v_applied, 0));
        if v_outstanding <= 0.009 then
          continue;
        end if;

        v_chunk := least(v_outstanding, v_remaining);
        insert into public.financial_record_links (
          company_id, source_financial_record_id, target_financial_record_id,
          relationship_type, amount_applied, created_by
        )
        values (
          p_company_id, v_payment.id, v_other.id,
          'client_payment_to_financial_record', v_chunk, p_created_by
        );
        v_remaining := v_remaining - v_chunk;
      end loop;
    end if;
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
