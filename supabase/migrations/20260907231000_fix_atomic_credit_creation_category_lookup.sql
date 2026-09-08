-- Fix production schema drift in create_credit_atomic.
-- financial_categories uses affects; payment_kind does not exist in the live schema.
-- Default special categories are global (company_id IS NULL), so the lookup must
-- accept global defaults and prefer a company-specific category when present.
create or replace function public.create_credit_atomic(p_credit jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid := public.auth_user_company_id();
  v_uid uuid := auth.uid();
  v_client_id uuid;
  v_vehicle_id uuid;
  v_total numeric(14,2);
  v_weekly numeric(14,2);
  v_payments integer;
  v_start date;
  v_credit public.credits;
  v_category_id uuid;
  v_category_name text;
begin
  if v_uid is null or v_company_id is null then raise exception 'AUTH_REQUIRED'; end if;
  v_client_id := nullif(p_credit->>'clientId','')::uuid;
  v_vehicle_id := nullif(p_credit->>'vehicleId','')::uuid;
  v_weekly := round((p_credit->>'weeklyPayment')::numeric, 2);
  v_payments := (p_credit->>'numberOfPayments')::integer;
  v_start := (p_credit->>'startDate')::date;
  if v_client_id is null or v_vehicle_id is null or v_weekly is null or v_weekly <= 0 or v_payments is null or v_payments <= 0 or v_start is null then raise exception 'INVALID_CREDIT_DATA'; end if;
  if p_credit ? 'companyId' and nullif(p_credit->>'companyId','')::uuid is distinct from v_company_id then raise exception 'COMPANY_ID_FORBIDDEN'; end if;
  if not exists (select 1 from public.clients c where c.id=v_client_id and c.company_id=v_company_id and coalesce(c.is_deleted,false)=false) then raise exception 'CLIENT_COMPANY_MISMATCH'; end if;
  if not exists (select 1 from public.vehicles v where v.id=v_vehicle_id and v.company_id=v_company_id and coalesce(v.is_deleted,false)=false) then raise exception 'VEHICLE_COMPANY_MISMATCH'; end if;
  if exists (select 1 from public.credits c where c.company_id=v_company_id and c.is_deleted=false and c.status='active' and (c.client_id=v_client_id or c.vehicle_id=v_vehicle_id)) then raise exception 'ACTIVE_CREDIT_ALREADY_EXISTS'; end if;
  v_total := round(v_weekly * v_payments, 2);
  insert into public.credits (client_id,vehicle_id,total_amount,paid_amount,remaining_balance,weekly_payment,number_of_payments,payments_made,start_date,status,is_deleted,company_id,uid,created_at,updated_at)
  values (v_client_id,v_vehicle_id,v_total,0,v_total,v_weekly,v_payments,0,v_start,'active',false,v_company_id,v_uid,now(),now()) returning * into v_credit;
  insert into public.credit_payment_schedules (credit_id,payment_number,due_date,amount,status,paid_amount,company_id,is_deleted,created_at)
  select v_credit.id,gs,(v_start+((gs-1)*interval '7 days'))::date,case when gs<v_payments then v_weekly else round(v_total-(v_weekly*(v_payments-1)),2) end,'pending',0,v_company_id,false,now() from generate_series(1,v_payments) gs;
  select fc.id,fc.name into v_category_id,v_category_name
  from public.financial_categories fc
  where (fc.company_id=v_company_id or fc.company_id is null)
    and fc.affects='credit_granted'
  order by case when fc.company_id=v_company_id then 0 else 1 end, fc.is_default desc, fc.created_at nulls last
  limit 1;
  if v_category_id is null then raise exception 'CREDIT_GRANTED_CATEGORY_NOT_CONFIGURED'; end if;
  insert into public.financial_records (company_id,type,category_id,category,amount,date,payment_method,description,client_id,vehicle_id,credit_id,credit_granted,created_by,is_deleted)
  values (v_company_id,'income',v_category_id,v_category_name,v_total,v_start,'credito','Crédito Otorgado',v_client_id,v_vehicle_id,v_credit.id,true,v_uid,false);
  update public.vehicles set client_id=v_client_id,status='rented',locked_by_credit=true,associated_credit_id=v_credit.id,updated_at=now() where id=v_vehicle_id and company_id=v_company_id;
  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,timestamp,changes,company_id)
  values ('create','credit',v_credit.id,'Crédito',v_uid,null,now(),jsonb_build_object('total_amount',v_total,'client_id',v_client_id,'vehicle_id',v_vehicle_id),v_company_id);
  return to_jsonb(v_credit);
end;
$$;
revoke execute on function public.create_credit_atomic(jsonb) from public;
revoke execute on function public.create_credit_atomic(jsonb) from anon;
grant execute on function public.create_credit_atomic(jsonb) to authenticated;
