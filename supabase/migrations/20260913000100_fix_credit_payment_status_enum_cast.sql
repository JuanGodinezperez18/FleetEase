-- Fix credit payment schedule status assignment: explicitly cast CASE result to payment_status enum.
-- The live enum contains only: pending, paid, overdue, cancelled.

create or replace function public.process_credit_payment_atomic(
  p_company_id uuid,
  p_credit_id uuid,
  p_client_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_payment_method text default null,
  p_reference text default null,
  p_created_by uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid := public.auth_user_company_id();
  v_credit public.credits;
  v_schedule record;
  v_category_id uuid;
  v_category_name text;
  v_remaining numeric(14,2);
  v_new_paid numeric(14,2);
  v_new_remaining numeric(14,2);
  v_payments_made integer;
  v_completed boolean;
  v_payment_left numeric(14,2);
  v_applied numeric(14,2);
  v_first_schedule_id uuid;
begin
  if v_uid is null or v_company_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'INVALID_COMPANY' using errcode='42501'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode='22003'; end if;

  select * into v_credit from public.credits
  where id=p_credit_id and company_id=v_company_id and is_deleted=false
  for update;
  if not found then raise exception 'CREDIT_NOT_FOUND' using errcode='P0002'; end if;
  if v_credit.client_id is distinct from p_client_id then raise exception 'CLIENT_CREDIT_MISMATCH' using errcode='42501'; end if;
  if v_credit.status <> 'active' then raise exception 'CREDIT_NOT_ACTIVE' using errcode='42501'; end if;
  if p_amount > coalesce(v_credit.remaining_balance,0) then raise exception 'PAYMENT_EXCEEDS_BALANCE' using errcode='22003'; end if;

  select fc.id, fc.name into v_category_id, v_category_name
  from public.financial_categories fc
  where (fc.company_id=v_company_id or fc.company_id is null)
    and fc.affects='credit_payment'
  order by case when fc.company_id=v_company_id then 0 else 1 end,
           fc.is_default desc
  limit 1;
  if v_category_id is null then raise exception 'CREDIT_PAYMENT_CATEGORY_NOT_CONFIGURED'; end if;

  v_payment_left := round(p_amount,2);
  v_payments_made := coalesce(v_credit.payments_made,0);
  v_first_schedule_id := null;

  for v_schedule in
    select id,payment_number,amount,coalesce(paid_amount,0) as paid_amount,status
    from public.credit_payment_schedules
    where credit_id=p_credit_id and company_id=v_company_id and is_deleted=false
      and status in ('pending','overdue')
    order by payment_number
    for update
  loop
    exit when v_payment_left <= 0;
    if v_first_schedule_id is null then v_first_schedule_id := v_schedule.id; end if;
    v_remaining := greatest(round(v_schedule.amount-v_schedule.paid_amount,2),0);
    if v_remaining <= 0 then continue; end if;
    v_applied := least(v_payment_left,v_remaining);

    update public.credit_payment_schedules set
      paid_amount=round(coalesce(paid_amount,0)+v_applied,2),
      status=(case
        when round(coalesce(paid_amount,0)+v_applied,2)>=round(amount,2) then 'paid'
        else 'pending'
      end)::public.payment_status,
      paid_date=case when round(coalesce(paid_amount,0)+v_applied,2)>=round(amount,2) then p_payment_date else paid_date end,
      updated_at=now()
    where id=v_schedule.id;

    if round(coalesce(v_schedule.paid_amount,0)+v_applied,2)>=round(v_schedule.amount,2) then
      v_payments_made := v_payments_made+1;
    end if;
    v_payment_left := round(v_payment_left-v_applied,2);
  end loop;

  if v_payment_left > 0 then raise exception 'PAYMENT_ALLOCATION_FAILED'; end if;

  v_new_paid := round(coalesce(v_credit.paid_amount,0)+p_amount,2);
  v_new_remaining := round(greatest(coalesce(v_credit.remaining_balance,0)-p_amount,0),2);
  v_completed := v_new_remaining=0;

  update public.credits set
    paid_amount=v_new_paid,
    remaining_balance=v_new_remaining,
    payments_made=v_payments_made,
    status=case when v_completed then 'completed' else 'active' end,
    last_payment_date=p_payment_date,
    last_payment_amount=p_amount,
    updated_at=now()
  where id=p_credit_id and company_id=v_company_id;

  if v_completed then
    update public.clients set has_active_credit=false,active_credit_id=null,updated_at=now()
    where id=p_client_id and company_id=v_company_id;
    if v_credit.vehicle_id is not null then
      update public.vehicles set client_id=null,status='active',locked_by_credit=false,associated_credit_id=null,updated_at=now()
      where id=v_credit.vehicle_id and company_id=v_company_id;
    end if;
  end if;

  insert into public.financial_records
    (company_id,client_id,vehicle_id,category_id,category,type,amount,payment_method,description,date,credit_id,credit_payment,credit_payment_number,credit_payment_schedule_id,is_deleted,created_by,created_at,updated_at)
  values
    (v_company_id,p_client_id,v_credit.vehicle_id,v_category_id,v_category_name,'payment',p_amount,coalesce(p_payment_method,'transferencia'),coalesce(p_reference,'Pago de crédito'),p_payment_date,p_credit_id,true,v_payments_made,v_first_schedule_id,false,v_uid,now(),now());

  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  values ('payment','credit',p_credit_id,'Pago de crédito',v_uid,null,now(),jsonb_build_object('amount',p_amount,'remaining_balance',v_new_remaining,'completed',v_completed),v_company_id);

  return jsonb_build_object('success',true,'creditId',p_credit_id,'credit_id',p_credit_id,'newCreditBalance',v_new_remaining,'new_remaining_balance',v_new_remaining,'remaining_balance',v_new_remaining,'paymentScheduleId',v_first_schedule_id,'payment_schedule_id',v_first_schedule_id,'creditCompleted',v_completed,'credit_completed',v_completed,'paymentsMade',v_payments_made);
end;
$function$;
