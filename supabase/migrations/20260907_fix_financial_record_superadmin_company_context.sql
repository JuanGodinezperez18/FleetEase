-- Keep the authoritative financial write gateway compatible with the Super Admin UI.
-- Super Admins may select a target company in the form; regular users remain
-- restricted to their own company.
create or replace function public.create_financial_record(p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_user_role text := public.auth_user_role();
  v_company_id uuid := public.auth_user_company_id();
  v_requested_company_id uuid;
  v_id uuid;
  v_type public.financial_record_type;
  v_category_id uuid;
  v_category_name text;
  v_client_id uuid;
  v_vehicle_id uuid;
  v_partner_id uuid;
  v_credit_id uuid;
  v_schedule_id uuid;
  v_amount numeric;
  v_date date;
  v_payment_method text;
  v_description text;
  v_credit_payment boolean := coalesce((p_record->>'credit_payment')::boolean,false);
  v_credit_granted boolean := coalesce((p_record->>'credit_granted')::boolean,false);
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

  begin v_type := (p_record->>'type')::public.financial_record_type; exception when invalid_text_representation then raise exception 'INVALID_FINANCIAL_TYPE' using errcode='22023'; end;
  v_amount := (p_record->>'amount')::numeric;
  if v_amount is null or v_amount <= 0 or v_amount > 100000000 then raise exception 'INVALID_AMOUNT' using errcode='22003'; end if;
  v_category_id := (p_record->>'category_id')::uuid;
  select name into v_category_name from public.financial_categories where id=v_category_id and (company_id=v_company_id or company_id is null) limit 1;
  if v_category_name is null then raise exception 'INVALID_CATEGORY' using errcode='23503'; end if;

  if nullif(p_record->>'client_id','') is not null then v_client_id := (p_record->>'client_id')::uuid; if not exists (select 1 from public.clients where id=v_client_id and company_id=v_company_id and is_deleted=false) then raise exception 'INVALID_CLIENT' using errcode='23503'; end if; end if;
  if nullif(p_record->>'vehicle_id','') is not null then v_vehicle_id := (p_record->>'vehicle_id')::uuid; if not exists (select 1 from public.vehicles where id=v_vehicle_id and company_id=v_company_id and is_deleted=false) then raise exception 'INVALID_VEHICLE' using errcode='23503'; end if; end if;
  if nullif(p_record->>'partner_id','') is not null then v_partner_id := (p_record->>'partner_id')::uuid; if not exists (select 1 from public.partners where id=v_partner_id and company_id=v_company_id and is_deleted=false) then raise exception 'INVALID_PARTNER' using errcode='23503'; end if; end if;
  if nullif(p_record->>'credit_id','') is not null then v_credit_id := (p_record->>'credit_id')::uuid; if not exists (select 1 from public.credits where id=v_credit_id and company_id=v_company_id and is_deleted=false) then raise exception 'INVALID_CREDIT' using errcode='23503'; end if; end if;
  if nullif(p_record->>'credit_payment_schedule_id','') is not null then v_schedule_id := (p_record->>'credit_payment_schedule_id')::uuid; if not exists (select 1 from public.credit_payment_schedules where id=v_schedule_id and company_id=v_company_id and is_deleted=false) then raise exception 'INVALID_CREDIT_SCHEDULE' using errcode='23503'; end if; end if;

  if v_credit_payment and v_credit_id is null then raise exception 'CREDIT_PAYMENT_REQUIRES_CREDIT' using errcode='23514'; end if;
  if v_credit_granted and v_credit_id is null then raise exception 'CREDIT_GRANTED_REQUIRES_CREDIT' using errcode='23514'; end if;
  if v_credit_payment and v_credit_granted then raise exception 'PAYMENT_AND_GRANT_MUTUALLY_EXCLUSIVE' using errcode='23514'; end if;
  if v_credit_payment and v_type <> 'payment' then raise exception 'CREDIT_PAYMENT_MUST_BE_PAYMENT' using errcode='23514'; end if;
  if v_credit_granted and v_type <> 'income' then raise exception 'CREDIT_GRANT_MUST_BE_INCOME' using errcode='23514'; end if;

  v_date := coalesce(nullif(p_record->>'date','')::date,current_date);
  v_payment_method := nullif(p_record->>'payment_method','');
  v_description := coalesce(nullif(p_record->>'description',''),'Movimiento financiero');

  insert into public.financial_records (
    company_id,client_id,vehicle_id,partner_id,category_id,category,type,amount,payment_method,description,date,
    credit_id,credit_payment,credit_granted,credit_payment_number,is_pending,is_deleted,created_by,created_at,updated_at,
    evidence_urls,credit_payment_schedule_id,mileage_at_expense,notes,reference_code,source_record_id,source_record_type,related_record_id,related_record_type,items
  ) values (
    v_company_id,v_client_id,v_vehicle_id,v_partner_id,v_category_id,v_category_name,v_type,v_amount,v_payment_method,v_description,v_date,
    v_credit_id,v_credit_payment,v_credit_granted,(p_record->>'credit_payment_number')::integer,coalesce((p_record->>'is_pending')::boolean,false),false,v_user_id,now(),now(),
    case when jsonb_typeof(p_record->'evidence_urls')='array' then array(select jsonb_array_elements_text(p_record->'evidence_urls')) else null end,
    v_schedule_id,(p_record->>'mileage_at_expense')::integer,nullif(p_record->>'notes',''),nullif(p_record->>'reference_code',''),
    (p_record->>'source_record_id')::uuid,nullif(p_record->>'source_record_type',''),(p_record->>'related_record_id')::uuid,nullif(p_record->>'related_record_type',''),p_record->'items'
  ) returning id into v_id;

  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  select 'create','financial_record',v_id,v_category_name,v_user_id,coalesce(u.name,u.email),now(),jsonb_build_object('amount',v_amount,'type',v_type,'category_id',v_category_id,'credit_id',v_credit_id),v_company_id
  from public.users u where u.id=v_user_id;

  select to_jsonb(fr) into v_result from public.financial_records fr where fr.id=v_id;
  return v_result;
end;
$function$;
