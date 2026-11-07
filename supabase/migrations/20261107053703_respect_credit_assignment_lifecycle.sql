-- Close assignment history before releasing credit resources. No backfill.
-- Completion ownership belongs to the existing finalization trigger.
CREATE OR REPLACE FUNCTION public.finalize_completed_credit_vehicle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status = 'completed'::public.credit_status
     and (old.status is distinct from new.status or old.remaining_balance is distinct from new.remaining_balance) then

      update public.vehicle_assignment_logs
         set unassigned_at = coalesce(unassigned_at, now()),
             end_date = coalesce(end_date, now()),
             reason = coalesce(reason, 'Crédito liquidado: vehículo entregado al cliente')
       where vehicle_id = new.vehicle_id
         and client_id = new.client_id
         and company_id = new.company_id
         and unassigned_at is null;

    update public.clients
       set has_active_credit = false,
           active_credit_id = null,
           assigned_vehicle_id = null,
           vehicle_assigned_at = null,
           updated_at = now()
     where id = new.client_id
       and company_id = new.company_id;

    if new.vehicle_id is not null then

      update public.vehicles
         set client_id = null,
             partner_id = null,
             status = 'sold'::public.vehicle_status,
             locked_by_credit = false,
             associated_credit_id = null,
             updated_at = now()
       where id = new.vehicle_id
         and company_id = new.company_id;
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.release_resources_on_credit_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status in ('inactive'::public.credit_status, 'cancelled'::public.credit_status)
     and old.status is distinct from new.status then

    if new.vehicle_id is not null then
      update public.vehicle_assignment_logs
         set unassigned_at = now(),
             end_date = coalesce(end_date, now()),
             reason = coalesce(reason, 'Crédito cancelado o desactivado')
       where vehicle_id = new.vehicle_id
         and client_id = new.client_id
         and company_id = new.company_id
         and unassigned_at is null;
    end if;

    if new.client_id is not null then
      update public.clients
         set has_active_credit = false,
             active_credit_id = null,
             updated_at = now()
       where id = new.client_id and company_id = new.company_id
         and (active_credit_id = new.id or has_active_credit = true);
    end if;

    if new.vehicle_id is not null then
      update public.vehicles
         set status = 'active'::public.vehicle_status,
             client_id = null,
             locked_by_credit = false,
             associated_credit_id = null,
             updated_at = now()
       where id = new.vehicle_id and company_id = new.company_id;
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_credit_payment_atomic(p_company_id uuid, p_credit_id uuid, p_client_id uuid, p_amount numeric, p_payment_date date DEFAULT CURRENT_DATE, p_payment_method text DEFAULT NULL::text, p_reference text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid := public.auth_user_company_id();
  v_credit public.credits;
  v_schedule record;
  v_category_id uuid;
  v_category_name text;
  v_remaining numeric(14,2);
  v_payments_made integer;
  v_completed boolean;
  v_payment_left numeric(14,2);
  v_applied numeric(14,2);
  v_first_schedule_id uuid;
  v_client_id uuid := p_client_id;
  v_payment_id uuid;
begin
  if v_uid is null or v_company_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_company_id is distinct from v_company_id then raise exception 'INVALID_COMPANY' using errcode='42501'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode='22003'; end if;

  select * into v_credit
  from public.credits
  where id=p_credit_id and company_id=v_company_id and is_deleted=false
  for update;

  if not found then raise exception 'CREDIT_NOT_FOUND' using errcode='P0002'; end if;
  if v_client_id is null then v_client_id := v_credit.client_id; end if;
  if v_credit.client_id is distinct from v_client_id then raise exception 'CLIENT_CREDIT_MISMATCH' using errcode='42501'; end if;
  if v_credit.status <> 'active' then raise exception 'CREDIT_NOT_ACTIVE' using errcode='42501'; end if;
  if p_amount > coalesce(v_credit.remaining_balance,0) then raise exception 'PAYMENT_EXCEEDS_BALANCE' using errcode='22003'; end if;

  select fc.id,fc.name into v_category_id,v_category_name
  from public.financial_categories fc
  where (fc.company_id=v_company_id or fc.company_id is null)
    and fc.affects='credit_payment'
  order by case when fc.company_id=v_company_id then 0 else 1 end,fc.is_default desc
  limit 1;
  if v_category_id is null then raise exception 'CREDIT_PAYMENT_CATEGORY_NOT_CONFIGURED'; end if;

  v_payment_left:=round(p_amount,2);
  v_first_schedule_id:=null;

  for v_schedule in
    select id,payment_number,amount,coalesce(paid_amount,0) as paid_amount,status
    from public.credit_payment_schedules
    where credit_id=v_credit.id and company_id=v_company_id and is_deleted=false and status in ('pending','overdue')
    order by payment_number
    for update
  loop
    exit when v_payment_left<=0;
    if v_first_schedule_id is null then v_first_schedule_id:=v_schedule.id; end if;
    v_remaining:=greatest(round(v_schedule.amount-v_schedule.paid_amount,2),0);
    if v_remaining<=0 then continue; end if;
    v_applied:=least(v_payment_left,v_remaining);
    update public.credit_payment_schedules
    set paid_amount=round(coalesce(paid_amount,0)+v_applied,2),
        status=(case when round(coalesce(paid_amount,0)+v_applied,2)>=round(amount,2) then 'paid' else 'pending' end)::public.payment_status,
        paid_date=case when round(coalesce(paid_amount,0)+v_applied,2)>=round(amount,2) then p_payment_date else paid_date end
    where id=v_schedule.id;
    v_payment_left:=round(v_payment_left-v_applied,2);
  end loop;

  if v_payment_left>0 then raise exception 'PAYMENT_ALLOCATION_FAILED'; end if;

  insert into public.financial_records
    (company_id,client_id,vehicle_id,category_id,category,type,amount,payment_method,description,date,credit_id,credit_payment,credit_payment_number,credit_payment_schedule_id,is_deleted,created_by,created_at,updated_at)
  values
    (v_company_id,v_client_id,v_credit.vehicle_id,v_category_id,v_category_name,'payment',p_amount,coalesce(p_payment_method,'transferencia'),coalesce(p_reference,'Pago de crédito'),p_payment_date,v_credit.id,true,0,v_first_schedule_id,false,v_uid,now(),now())
  returning id into v_payment_id;

  v_payment_left:=round(p_amount,2);
  for v_schedule in
    select id,payment_number,amount,coalesce(paid_amount,0) as paid_after
    from public.credit_payment_schedules
    where credit_id=v_credit.id and company_id=v_company_id and is_deleted=false
    order by payment_number
    for update
  loop
    exit when v_payment_left<=0;
    v_applied:=least(
      v_payment_left,
      greatest(round(v_schedule.paid_after,2),0) -
      coalesce((
        select round(sum(a.amount_applied),2)
        from public.financial_payment_credit_allocations a
        join public.financial_records f on f.id=a.payment_financial_record_id
        where a.credit_payment_schedule_id=v_schedule.id
          and a.is_deleted=false
          and f.is_deleted=false
          and f.id<>v_payment_id
      ),0)
    );
    if v_applied>0 then
      insert into public.financial_payment_credit_allocations
        (company_id,payment_financial_record_id,credit_id,credit_payment_schedule_id,amount_applied)
      values
        (v_company_id,v_payment_id,v_credit.id,v_schedule.id,v_applied);
      v_payment_left:=round(v_payment_left-v_applied,2);
    end if;
  end loop;

  if v_payment_left>0 then raise exception 'PAYMENT_ALLOCATION_LEDGER_FAILED'; end if;

  select count(*) into v_payments_made
  from public.credit_payment_schedules
  where credit_id=v_credit.id and company_id=v_company_id and is_deleted=false and status='paid';

  v_completed:=round(coalesce(v_credit.remaining_balance,0)-p_amount,2)<=0;

  update public.credits
  set paid_amount=round(coalesce(paid_amount,0)+p_amount,2),
      remaining_balance=round(greatest(coalesce(remaining_balance,0)-p_amount,0),2),
      payments_made=v_payments_made,
      status=(case when v_completed then 'completed' else 'active' end)::public.credit_status,
      last_payment_date=p_payment_date,
      last_payment_amount=p_amount,
      updated_at=now()
  where id=v_credit.id and company_id=v_company_id;

  update public.financial_records
  set credit_payment_number=v_payments_made
  where id=v_payment_id;

  if v_completed then
    update public.clients set has_active_credit=false,active_credit_id=null,updated_at=now()
    where id=v_client_id and company_id=v_company_id;
  end if;

  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  values
    ('create'::public.audit_action,'credit',v_credit.id,'Pago de crédito',v_uid,null,now(),
      jsonb_build_object('amount',p_amount,'payment_id',v_payment_id,'remaining_balance',greatest(coalesce(v_credit.remaining_balance,0)-p_amount,0),'completed',v_completed),v_company_id);

  return jsonb_build_object('success',true,'creditId',v_credit.id,'credit_id',v_credit.id,'paymentId',v_payment_id,'payment_id',v_payment_id,'newCreditBalance',greatest(coalesce(v_credit.remaining_balance,0)-p_amount,0),'new_remaining_balance',greatest(coalesce(v_credit.remaining_balance,0)-p_amount,0),'paymentScheduleId',v_first_schedule_id,'payment_schedule_id',v_first_schedule_id,'creditCompleted',v_completed,'credit_completed',v_completed,'paymentsMade',v_payments_made);
end;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_credit_after_payment_change(p_credit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_credit public.credits;
  v_paid numeric(14,2);
  v_remaining numeric(14,2);
  v_completed boolean;
  v_last_payment public.financial_records;
begin
  select * into v_credit
  from public.credits
  where id=p_credit_id
  for update;

  if not found then
    raise exception 'CREDIT_NOT_FOUND';
  end if;

  update public.credit_payment_schedules s
  set
    paid_amount = coalesce((
      select round(sum(a.amount_applied),2)
      from public.financial_payment_credit_allocations a
      join public.financial_records f on f.id=a.payment_financial_record_id
      where a.credit_payment_schedule_id=s.id
        and a.is_deleted=false
        and f.is_deleted=false
        and f.type='payment'
        and f.credit_payment=true
    ),0),
    status = case
      when coalesce((
        select round(sum(a.amount_applied),2)
        from public.financial_payment_credit_allocations a
        join public.financial_records f on f.id=a.payment_financial_record_id
        where a.credit_payment_schedule_id=s.id
          and a.is_deleted=false
          and f.is_deleted=false
          and f.type='payment'
          and f.credit_payment=true
      ),0) >= round(s.amount,2) then 'paid'::public.payment_status
      else 'pending'::public.payment_status
    end,
    paid_date = case
      when coalesce((
        select round(sum(a.amount_applied),2)
        from public.financial_payment_credit_allocations a
        join public.financial_records f on f.id=a.payment_financial_record_id
        where a.credit_payment_schedule_id=s.id
          and a.is_deleted=false
          and f.is_deleted=false
          and f.type='payment'
          and f.credit_payment=true
      ),0) >= round(s.amount,2)
      then (
        select max(f.date)
        from public.financial_payment_credit_allocations a
        join public.financial_records f on f.id=a.payment_financial_record_id
        where a.credit_payment_schedule_id=s.id
          and a.is_deleted=false
          and f.is_deleted=false
          and f.type='payment'
          and f.credit_payment=true
      )
      else null
    end
  where s.credit_id=p_credit_id
    and s.is_deleted=false;

  select coalesce(sum(f.amount),0)
    into v_paid
  from public.financial_records f
  where f.credit_id=p_credit_id
    and f.type='payment'
    and f.credit_payment=true
    and f.is_deleted=false;

  v_remaining := greatest(round(coalesce(v_credit.total_amount,0)-v_paid,2),0);
  v_completed := v_remaining=0;

  select f.* into v_last_payment
  from public.financial_records f
  where f.credit_id=p_credit_id
    and f.type='payment'
    and f.credit_payment=true
    and f.is_deleted=false
  order by f.date desc, f.created_at desc, f.id desc
  limit 1;

  update public.credits
  set
    paid_amount=round(v_paid,2),
    remaining_balance=v_remaining,
    payments_made=(select count(*) from public.credit_payment_schedules s where s.credit_id=p_credit_id and s.is_deleted=false and s.status='paid'),
    status=case when v_completed then 'completed'::public.credit_status else 'active'::public.credit_status end,
    last_payment_date=case when v_last_payment.id is not null then v_last_payment.date else null end,
    last_payment_amount=case when v_last_payment.id is not null then v_last_payment.amount else null end,
    updated_at=now()
  where id=p_credit_id;

  if v_completed then
    update public.clients
    set has_active_credit=false, active_credit_id=null, updated_at=now()
    where id=v_credit.client_id and company_id=v_credit.company_id
      and (active_credit_id=p_credit_id or active_credit_id is null or has_active_credit=true);

  else
    update public.clients
    set has_active_credit=true, active_credit_id=p_credit_id, updated_at=now()
    where id=v_credit.client_id and company_id=v_credit.company_id;

    if v_credit.vehicle_id is not null then
      update public.vehicles
      set client_id=v_credit.client_id,status='rented',locked_by_credit=true,associated_credit_id=p_credit_id,updated_at=now()
      where id=v_credit.vehicle_id and company_id=v_credit.company_id;
    end if;
  end if;
end;
$function$;

revoke all on function public.finalize_completed_credit_vehicle() from public,anon,authenticated;
revoke all on function public.release_resources_on_credit_status_change() from public,anon,authenticated;
revoke all on function public.recalculate_credit_after_payment_change(uuid) from public,anon,authenticated;
revoke all on function public.process_credit_payment_atomic(uuid,uuid,uuid,numeric,date,text,text,uuid) from public,anon;
grant execute on function public.process_credit_payment_atomic(uuid,uuid,uuid,numeric,date,text,text,uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.cancel_credit_atomic(p_company_id uuid, p_credit_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid:=auth.uid(); v_auth_company_id uuid:=public.auth_user_company_id();
  v_credit public.credits; v_granted_record_id uuid; v_note_category_id uuid;
  v_note_category_name text:='Nota de Crédito'; v_paid numeric(14,2);
  v_remaining numeric(14,2); v_now timestamptz:=now(); v_note_id uuid;
begin
  if v_uid is null or v_auth_company_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_company_id is distinct from v_auth_company_id then raise exception 'INVALID_COMPANY' using errcode='42501'; end if;
  select * into v_credit from public.credits where id=p_credit_id and company_id=p_company_id and is_deleted=false for update;
  if not found then raise exception 'CREDIT_NOT_FOUND' using errcode='P0002'; end if;
  if v_credit.status <> 'active' then raise exception 'CREDIT_NOT_ACTIVE' using errcode='42501'; end if;
  select coalesce(sum(fr.amount),0)::numeric(14,2) into v_paid from public.financial_records fr
   where fr.company_id=p_company_id and fr.credit_id=p_credit_id and fr.credit_payment=true and fr.is_deleted=false;
  v_paid:=greatest(v_paid,coalesce(v_credit.paid_amount,0)); v_remaining:=greatest(round(coalesce(v_credit.remaining_balance,0),2),0);
  select fr.id into v_granted_record_id from public.financial_records fr
   where fr.company_id=p_company_id and fr.credit_id=p_credit_id and fr.credit_granted=true and fr.type='income' and fr.is_deleted=false
   order by fr.created_at desc limit 1 for update;
  if v_paid<=0 then
    if v_granted_record_id is not null then update public.financial_records set is_deleted=true,updated_at=v_now,notes=concat_ws(' | ',nullif(notes,''),'Crédito cancelado sin pagos') where id=v_granted_record_id; end if;
  else
    select fc.id,fc.name into v_note_category_id,v_note_category_name from public.financial_categories fc
     where (fc.company_id=p_company_id or fc.company_id is null) and fc.type='expense' and lower(fc.name)=lower('Nota de Crédito')
     order by case when fc.company_id=p_company_id then 0 else 1 end,fc.is_default desc limit 1;
    if v_note_category_id is null then raise exception 'CREDIT_CANCELLATION_NOTE_CATEGORY_NOT_CONFIGURED'; end if;
    if v_remaining>0 then
      insert into public.financial_records(company_id,type,category_id,category,amount,date,payment_method,description,client_id,vehicle_id,partner_id,credit_id,is_deleted,created_by,created_at,updated_at,notes,source_record_id,source_record_type)
      values(p_company_id,'expense',v_note_category_id,v_note_category_name,v_remaining,current_date,'ajuste_contable','Nota de crédito por cancelación de crédito',v_credit.client_id,v_credit.vehicle_id,
        (select v.partner_id from public.vehicles v where v.id=v_credit.vehicle_id and v.company_id=p_company_id),p_credit_id,false,v_uid,v_now,v_now,
        concat_ws(' | ','Saldo pendiente cancelado',nullif(p_reason,'')),coalesce(v_granted_record_id,p_credit_id::uuid),'credit_cancellation_note')
      returning id into v_note_id;
    end if;
  end if;
  update public.credit_payment_schedules set status='cancelled'::public.payment_status,is_deleted=true
   where credit_id=p_credit_id and company_id=p_company_id and is_deleted=false and status in ('pending','overdue');
  if v_credit.vehicle_id is not null then
    update public.vehicle_assignment_logs
       set unassigned_at=v_now,end_date=v_now,
           reason=case when nullif(p_reason,'') is null then 'Crédito cancelado' else 'Crédito cancelado: ' || p_reason end
     where vehicle_id=v_credit.vehicle_id and client_id=v_credit.client_id
       and company_id=p_company_id and unassigned_at is null;
  end if;
  update public.credits set status='cancelled',updated_at=v_now where id=p_credit_id and company_id=p_company_id;
  update public.clients set has_active_credit=false,active_credit_id=null,updated_at=v_now where id=v_credit.client_id and company_id=p_company_id;
  if v_credit.vehicle_id is not null then
    update public.vehicles set client_id=null,status='active',locked_by_credit=false,associated_credit_id=null,updated_at=v_now
      where id=v_credit.vehicle_id and company_id=p_company_id;
  end if;
  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  values('delete'::public.audit_action,'credit',p_credit_id,'Cancelación de crédito',v_uid,null,v_now,
    jsonb_build_object('paid_amount',v_paid,'remaining_balance',v_remaining,'mode',case when v_paid<=0 then 'void_granted_income' else 'credit_note' end,'financial_record_id',v_granted_record_id,'credit_note_id',v_note_id,'reason',p_reason),p_company_id);
  return jsonb_build_object('success',true,'creditId',p_credit_id,'paidAmount',v_paid,'remainingBalance',v_remaining,'mode',case when v_paid<=0 then 'void_granted_income' else 'credit_note' end,'financialRecordId',v_granted_record_id,'creditNoteId',v_note_id);
end;
$function$;

revoke all on function public.cancel_credit_atomic(uuid,uuid,text) from public,anon;
grant execute on function public.cancel_credit_atomic(uuid,uuid,text) to authenticated;

