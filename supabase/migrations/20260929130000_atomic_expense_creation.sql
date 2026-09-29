-- Atomic expense creation: preserve vehicle/partner relation and keep financial record,
-- mileage log, and vehicle odometer update in one PostgreSQL transaction.
create or replace function public.create_expense_atomic(p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_user_role text := public.auth_user_role();
  v_company_id uuid := public.auth_user_company_id();
  v_requested_company_id uuid;
  v_id uuid;
  v_category_id uuid;
  v_category_name text;
  v_client_id uuid;
  v_vehicle_id uuid;
  v_partner_id uuid;
  v_amount numeric;
  v_date date;
  v_payment_method text;
  v_description text;
  v_mileage integer;
  v_is_maintenance boolean := false;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;

  v_requested_company_id := nullif(p_record->>'company_id','')::uuid;
  if v_user_role = 'super_admin' then
    v_company_id := coalesce(v_requested_company_id, v_company_id);
  elsif v_requested_company_id is not null and v_requested_company_id <> v_company_id then
    raise exception 'INVALID_COMPANY' using errcode='42501';
  end if;
  if v_company_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;

  v_amount := (p_record->>'amount')::numeric;
  if v_amount is null or v_amount <= 0 or v_amount > 100000000 then raise exception 'INVALID_AMOUNT' using errcode='22003'; end if;

  v_category_id := (p_record->>'category_id')::uuid;
  select name into v_category_name from public.financial_categories
  where id=v_category_id and (company_id=v_company_id or company_id is null) limit 1;
  if v_category_name is null then raise exception 'INVALID_CATEGORY' using errcode='23503'; end if;
  v_is_maintenance := lower(trim(v_category_name)) = 'mantenimiento';

  if nullif(p_record->>'client_id','') is not null then
    v_client_id := (p_record->>'client_id')::uuid;
    if not exists (select 1 from public.clients where id=v_client_id and company_id=v_company_id and is_deleted=false) then
      raise exception 'INVALID_CLIENT' using errcode='23503';
    end if;
  end if;

  if nullif(p_record->>'vehicle_id','') is not null then
    v_vehicle_id := (p_record->>'vehicle_id')::uuid;
    if not exists (select 1 from public.vehicles where id=v_vehicle_id and company_id=v_company_id and is_deleted=false) then
      raise exception 'INVALID_VEHICLE' using errcode='23503';
    end if;
  end if;

  if v_vehicle_id is not null then
    select partner_id into v_partner_id from public.vehicles
    where id=v_vehicle_id and company_id=v_company_id and is_deleted=false;
  end if;

  if nullif(p_record->>'partner_id','') is not null and v_vehicle_id is null then
    v_partner_id := (p_record->>'partner_id')::uuid;
  end if;

  if v_partner_id is not null and not exists (
    select 1 from public.partners where id=v_partner_id and company_id=v_company_id and is_deleted=false
  ) then
    raise exception 'INVALID_PARTNER' using errcode='23503';
  end if;

  v_date := coalesce(nullif(p_record->>'date','')::date,current_date);
  v_payment_method := nullif(p_record->>'payment_method','');
  v_description := coalesce(nullif(p_record->>'description',''),'Gasto operativo');
  v_mileage := nullif(p_record->>'mileage_at_expense','')::integer;

  if v_mileage is not null and v_vehicle_id is null then raise exception 'MILEAGE_REQUIRES_VEHICLE' using errcode='23514'; end if;

  insert into public.financial_records (
    company_id,client_id,vehicle_id,partner_id,category_id,category,type,amount,payment_method,description,date,
    credit_id,credit_payment,credit_granted,credit_payment_number,is_pending,is_deleted,created_by,created_at,updated_at,
    evidence_urls,credit_payment_schedule_id,mileage_at_expense,notes,reference_code,source_record_id,source_record_type,related_record_id,related_record_type,items
  ) values (
    v_company_id,v_client_id,v_vehicle_id,v_partner_id,v_category_id,v_category_name,'expense',v_amount,v_payment_method,v_description,v_date,
    null,false,false,null,coalesce((p_record->>'is_pending')::boolean,false),false,v_user_id,now(),now(),
    case when jsonb_typeof(p_record->'evidence_urls')='array' then array(select jsonb_array_elements_text(p_record->'evidence_urls')) else null end,
    null,v_mileage,nullif(p_record->>'notes',''),nullif(p_record->>'reference_code',''),
    (p_record->>'source_record_id')::uuid,nullif(p_record->>'source_record_type',''),
    (p_record->>'related_record_id')::uuid,nullif(p_record->>'related_record_type',''),p_record->'items'
  ) returning id into v_id;

  if v_vehicle_id is not null and v_mileage is not null then
    insert into public.mileage_logs (
      vehicle_id,mileage,date,notes,source,financial_record_id,kind,created_at,updated_at,company_id,is_deleted,created_by,uid
    ) values (
      v_vehicle_id,v_mileage,v_date,v_description,'expense'::public.mileage_source,v_id,
      case when v_is_maintenance then 'maintenance'::public.mileage_kind else 'odometer'::public.mileage_kind end,
      now(),now(),v_company_id,false,v_user_id,v_user_id
    );

    update public.vehicles
    set current_mileage=v_mileage,
        last_maintenance_mileage=case when v_is_maintenance then v_mileage else last_maintenance_mileage end,
        updated_at=now()
    where id=v_vehicle_id and company_id=v_company_id and is_deleted=false;
  end if;

  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  select 'create','financial_record',v_id,v_category_name,v_user_id,coalesce(u.name,u.email),now(),
    jsonb_build_object('amount',v_amount,'type','expense','category_id',v_category_id,'client_id',v_client_id,'vehicle_id',v_vehicle_id,'partner_id',v_partner_id,'payment_method',v_payment_method,'mileage_at_expense',v_mileage),
    v_company_id
  from public.users u where u.id=v_user_id;

  select to_jsonb(fr) into v_result from public.financial_records fr where fr.id=v_id;
  return v_result;
end;
$function$;

revoke execute on function public.create_expense_atomic(jsonb) from anon, public;
grant execute on function public.create_expense_atomic(jsonb) to authenticated;
