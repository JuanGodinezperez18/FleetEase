-- Security hardening for multa RPCs.
-- Keep authenticated application access, but derive tenant/actor from the session
-- instead of trusting client-supplied company_id/created_by values.

create or replace function public.create_multa_atomic(p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid := public.auth_user_company_id();
  v_requested_company_id uuid := nullif(p_record->>'company_id','')::uuid;
  v_multa_id uuid;
  v_financial_id uuid;
  v_category_id uuid;
  v_description text;
  v_total numeric := coalesce((p_record->>'total')::numeric,0);
  v_client_id uuid := nullif(p_record->>'client_id','')::uuid;
  v_vehicle_id uuid := nullif(p_record->>'vehicle_id','')::uuid;
  v_created_by uuid := v_user_id;
begin
  if v_user_id is null or v_company_id is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;

  if v_requested_company_id is distinct from v_company_id then
    raise exception 'INVALID_COMPANY' using errcode='42501';
  end if;

  if v_total <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode='22003';
  end if;

  if v_client_id is not null and not exists (
    select 1 from public.clients
    where id=v_client_id and company_id=v_company_id and is_deleted=false
  ) then
    raise exception 'INVALID_CLIENT' using errcode='23503';
  end if;

  if v_vehicle_id is not null and not exists (
    select 1 from public.vehicles
    where id=v_vehicle_id and company_id=v_company_id and is_deleted=false
  ) then
    raise exception 'INVALID_VEHICLE' using errcode='23503';
  end if;

  select id into v_category_id
  from public.financial_categories
  where lower(trim(name))='multa'
    and type='income'
    and affects='client_balance'
    and (company_id=v_company_id or company_id is null)
  order by company_id nulls last
  limit 1;

  if v_category_id is null then
    raise exception 'MISSING_MULTA_CATEGORY';
  end if;

  insert into public.multas(
    vehicle_id,client_id,folio,fecha_infraccion,direccion,descripcion,importe,
    recargos,total,status,fecha_pago,evidencia_urls,notas,asignado_automaticamente,
    assignment_date,company_id,created_by,is_deleted,created_at,updated_at
  )
  values(
    v_vehicle_id,v_client_id,nullif(p_record->>'folio',''),
    nullif(p_record->>'fecha_infraccion','')::date,
    nullif(p_record->>'direccion',''),nullif(p_record->>'descripcion',''),
    coalesce((p_record->>'importe')::numeric,0),
    coalesce((p_record->>'recargos')::numeric,0),v_total,
    coalesce(nullif(p_record->>'status',''),'pendiente')::public.multa_status,
    nullif(p_record->>'fecha_pago','')::date,
    case when jsonb_typeof(p_record->'evidencia_urls')='array'
      then array(select jsonb_array_elements_text(p_record->'evidencia_urls'))
      else null end,
    nullif(p_record->>'notas',''),
    coalesce((p_record->>'asignado_automaticamente')::boolean,false),
    nullif(p_record->>'assignment_date','')::timestamptz,
    v_company_id,v_created_by,false,now(),now()
  )
  returning id into v_multa_id;

  if v_client_id is not null then
    v_description := coalesce(nullif(p_record->>'descripcion',''),'Infracción');
    if nullif(p_record->>'folio','') is not null then
      v_description := v_description || ' (Folio: ' || (p_record->>'folio') || ')';
    end if;

    insert into public.financial_records(
      company_id,client_id,vehicle_id,category_id,category,type,amount,date,
      description,is_pending,is_deleted,created_by,source_record_id,
      source_record_type,created_at,updated_at
    )
    values(
      v_company_id,v_client_id,v_vehicle_id,v_category_id,'Multa','income',v_total,
      coalesce(nullif(p_record->>'fecha_infraccion','')::date,current_date),
      'Multa: ' || v_description,true,false,v_created_by,v_multa_id,'multa',now(),now()
    )
    returning id into v_financial_id;
  end if;

  return jsonb_build_object(
    'multa_id',v_multa_id,
    'financial_record_id',v_financial_id,
    'status','pendiente'
  );
end;
$$;

revoke all on function public.create_multa_atomic(jsonb) from public, anon;
grant execute on function public.create_multa_atomic(jsonb) to authenticated;

create or replace function public.cancel_multa_atomic(
  p_multa_id uuid,
  p_company_id uuid,
  p_cancel_reason text default null,
  p_created_by uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid := public.auth_user_company_id();
  v_requested_company_id uuid := p_company_id;
  v_multa public.multas%rowtype;
  v_charge public.financial_records%rowtype;
  v_paid numeric := 0;
  v_remaining numeric := 0;
begin
  if v_uid is null or v_company_id is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;

  if v_requested_company_id is distinct from v_company_id then
    raise exception 'INVALID_COMPANY' using errcode='42501';
  end if;

  select * into v_multa
  from public.multas
  where id=p_multa_id and company_id=v_company_id
  for update;

  if not found then
    raise exception 'Multa no encontrada';
  end if;

  if v_multa.status='cancelada' then
    return jsonb_build_object(
      'multa_id',p_multa_id,'status','cancelada','reverted_amount',0
    );
  end if;

  select * into v_charge
  from public.financial_records
  where company_id=v_company_id
    and source_record_id=p_multa_id
    and source_record_type='multa'
    and type='income'
  order by created_at asc
  limit 1
  for update;

  if found then
    select coalesce(sum(
      case when fr.is_deleted then 0 else l.amount_applied end
    ),0)
    into v_paid
    from public.financial_record_links l
    left join public.financial_records fr
      on fr.id=l.source_financial_record_id
    where l.target_financial_record_id=v_charge.id
      and l.relationship_type='multa_payment_to_financial_record';

    v_remaining := greatest(0,coalesce(v_charge.amount,0)-v_paid);

    if v_paid<=0.009 then
      update public.financial_records
      set is_deleted=true,is_pending=false
      where id=v_charge.id;
    elsif v_remaining>0.009 then
      update public.financial_records
      set amount=v_paid,is_pending=false
      where id=v_charge.id;
    else
      update public.financial_records
      set is_pending=false
      where id=v_charge.id;
    end if;
  end if;

  update public.multas
  set status='cancelada',fecha_pago=null,updated_at=now()
  where id=p_multa_id and company_id=v_company_id;

  return jsonb_build_object(
    'multa_id',p_multa_id,
    'status','cancelada',
    'paid_amount',v_paid,
    'reverted_amount',v_remaining
  );
end;
$function$;

revoke all on function public.cancel_multa_atomic(uuid,uuid,text,uuid) from public, anon;
grant execute on function public.cancel_multa_atomic(uuid,uuid,text,uuid) to authenticated;

-- This RPC is SECURITY INVOKER and should never be callable anonymously.
revoke execute on function public.process_multa_payment_atomic(
  uuid,uuid,uuid,uuid,numeric,date,text,text,uuid
) from anon, public;
grant execute on function public.process_multa_payment_atomic(
  uuid,uuid,uuid,uuid,numeric,date,text,text,uuid
) to authenticated;
