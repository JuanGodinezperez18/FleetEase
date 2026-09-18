-- Atomic payment edit/delete support and exact credit-payment allocation ledger.

create table if not exists public.financial_payment_credit_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_financial_record_id uuid not null references public.financial_records(id) on delete restrict,
  credit_id uuid not null references public.credits(id) on delete restrict,
  credit_payment_schedule_id uuid not null references public.credit_payment_schedules(id) on delete restrict,
  amount_applied numeric(14,2) not null check (amount_applied > 0),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_payment_alloc_payment on public.financial_payment_credit_allocations(payment_financial_record_id, is_deleted);
create index if not exists idx_credit_payment_alloc_schedule on public.financial_payment_credit_allocations(credit_payment_schedule_id, is_deleted);
create index if not exists idx_credit_payment_alloc_credit on public.financial_payment_credit_allocations(credit_id, is_deleted);

alter table public.financial_payment_credit_allocations enable row level security;
revoke all on table public.financial_payment_credit_allocations from anon, authenticated;

with schedules as (
  select s.id,s.credit_id,s.company_id,s.payment_number,s.amount,
    sum(s.amount) over(partition by s.credit_id order by s.payment_number rows between unbounded preceding and 1 preceding) as schedule_start,
    sum(s.amount) over(partition by s.credit_id order by s.payment_number rows between unbounded preceding and current row) as schedule_end
  from public.credit_payment_schedules s where s.is_deleted=false
),
payments as (
  select f.id,f.company_id,f.credit_id,f.amount,
    sum(f.amount) over(partition by f.credit_id order by f.created_at,f.id rows between unbounded preceding and 1 preceding) as payment_start,
    sum(f.amount) over(partition by f.credit_id order by f.created_at,f.id rows between unbounded preceding and current row) as payment_end
  from public.financial_records f
  where f.type='payment' and f.credit_payment=true and f.credit_id is not null and f.is_deleted=false
)
insert into public.financial_payment_credit_allocations(company_id,payment_financial_record_id,credit_id,credit_payment_schedule_id,amount_applied)
select p.company_id,p.id,p.credit_id,s.id,round(least(p.payment_end,s.schedule_end)-greatest(coalesce(p.payment_start,0),coalesce(s.schedule_start,0)),2)
from payments p join schedules s on s.credit_id=p.credit_id
 and greatest(coalesce(p.payment_start,0),coalesce(s.schedule_start,0)) < least(p.payment_end,s.schedule_end)
where not exists (select 1 from public.financial_payment_credit_allocations a where a.payment_financial_record_id=p.id);

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

    if v_credit.vehicle_id is not null then
      update public.vehicles
      set client_id=null,status='active',locked_by_credit=false,associated_credit_id=null,updated_at=now()
      where id=v_credit.vehicle_id and company_id=v_credit.company_id
        and (associated_credit_id=p_credit_id or associated_credit_id is null);
    end if;
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
    if v_credit.vehicle_id is not null then
      update public.vehicles set client_id=null,status='active',locked_by_credit=false,associated_credit_id=null,updated_at=now()
      where id=v_credit.vehicle_id and company_id=v_company_id;
    end if;
  end if;

  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  values
    ('create'::public.audit_action,'credit',v_credit.id,'Pago de crédito',v_uid,null,now(),
      jsonb_build_object('amount',p_amount,'payment_id',v_payment_id,'remaining_balance',greatest(coalesce(v_credit.remaining_balance,0)-p_amount,0),'completed',v_completed),v_company_id);

  return jsonb_build_object('success',true,'creditId',v_credit.id,'credit_id',v_credit.id,'paymentId',v_payment_id,'payment_id',v_payment_id,'newCreditBalance',greatest(coalesce(v_credit.remaining_balance,0)-p_amount,0),'new_remaining_balance',greatest(coalesce(v_credit.remaining_balance,0)-p_amount,0),'paymentScheduleId',v_first_schedule_id,'payment_schedule_id',v_first_schedule_id,'creditCompleted',v_completed,'credit_completed',v_completed,'paymentsMade',v_payments_made);
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_financial_payment_atomic(p_payment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid := public.auth_user_company_id();
  v_payment public.financial_records;
  v_credit_id uuid;
begin
  if v_uid is null or v_company_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;

  select * into v_payment
  from public.financial_records
  where id=p_payment_id and company_id=v_company_id and type='payment'
  for update;

  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.is_deleted then raise exception 'PAYMENT_ALREADY_DELETED'; end if;

  v_credit_id:=v_payment.credit_id;

  update public.financial_records
  set is_deleted=true, updated_at=now()
  where id=p_payment_id and company_id=v_company_id;

  if v_credit_id is not null and v_payment.credit_payment=true then
    perform public.recalculate_credit_after_payment_change(v_credit_id);
  end if;

  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  values
    ('delete'::public.audit_action,'financial_record',p_payment_id,'Pago',v_uid,null,now(),
      jsonb_build_object('payment_id',p_payment_id,'amount',v_payment.amount,'credit_id',v_payment.credit_id),v_company_id);

  return jsonb_build_object('success',true,'paymentId',p_payment_id,'creditId',v_credit_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_financial_payment_atomic(p_payment_id uuid, p_amount numeric, p_payment_date date, p_payment_method text DEFAULT NULL::text, p_reference text DEFAULT NULL::text, p_target_financial_record_id uuid DEFAULT NULL::uuid)
 RETURNS financial_records
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid := public.auth_user_company_id();
  v_payment public.financial_records;
  v_target public.financial_records;
  v_kind text;
  v_credit_id uuid;
  v_left numeric(14,2);
  v_applied numeric(14,2);
  v_deposit record;
  v_deposit_used numeric(14,2);
  v_available numeric(14,2);
  v_link record;
  v_old_target uuid;
begin
  if v_uid is null or v_company_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_payment
  from public.financial_records
  where id=p_payment_id and company_id=v_company_id and type='payment'
  for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.is_deleted then raise exception 'PAYMENT_ALREADY_DELETED'; end if;

  v_credit_id:=v_payment.credit_id;

  if v_payment.credit_payment=true and v_credit_id is not null then
    update public.financial_payment_credit_allocations
    set is_deleted=true
    where payment_financial_record_id=p_payment_id and is_deleted=false;

    update public.financial_records
    set amount=0,updated_at=now()
    where id=p_payment_id;

    perform public.recalculate_credit_after_payment_change(v_credit_id);

    if p_amount > (select remaining_balance from public.credits where id=v_credit_id) then
      raise exception 'PAYMENT_EXCEEDS_BALANCE';
    end if;

    v_left:=round(p_amount,2);
    for v_link in
      select s.id,s.payment_number,s.amount,s.paid_amount
      from public.credit_payment_schedules s
      where s.credit_id=v_credit_id and s.company_id=v_company_id and s.is_deleted=false and s.status in ('pending','overdue')
      order by s.payment_number
      for update
    loop
      exit when v_left<=0;
      v_applied:=least(v_left,greatest(round(v_link.amount-v_link.paid_amount,2),0));
      if v_applied>0 then
        insert into public.financial_payment_credit_allocations(company_id,payment_financial_record_id,credit_id,credit_payment_schedule_id,amount_applied)
        values(v_company_id,p_payment_id,v_credit_id,v_link.id,v_applied);
        v_left:=round(v_left-v_applied,2);
      end if;
    end loop;
    if v_left>0 then raise exception 'PAYMENT_ALLOCATION_FAILED'; end if;

    update public.financial_records
    set amount=p_amount,date=coalesce(p_payment_date,date),payment_method=p_payment_method,reference_code=p_reference,updated_at=now()
    where id=p_payment_id;

    perform public.recalculate_credit_after_payment_change(v_credit_id);

  elsif lower(coalesce(v_payment.description,'')) like '%depósito%aplicado%' or exists (
    select 1 from public.financial_record_links l
    where l.source_financial_record_id=p_payment_id and l.relationship_type='security_deposit_application'
  ) then
    if p_target_financial_record_id is null then raise exception 'TARGET_REQUIRED'; end if;

    select * into v_target
    from public.financial_records
    where id=p_target_financial_record_id and company_id=v_company_id and type='income' and is_deleted=false
    for update;
    if not found then raise exception 'TARGET_NOT_FOUND'; end if;
    if v_target.client_id is distinct from v_payment.client_id then raise exception 'CLIENT_TARGET_MISMATCH'; end if;

    delete from public.financial_record_links
    where source_financial_record_id=p_payment_id
      and relationship_type in ('security_deposit_application','client_payment_to_financial_record');

    select coalesce(sum(coalesce(l2.amount_applied,f2.amount)),0) into v_applied
    from public.financial_record_links l2
    join public.financial_records f2 on f2.id=l2.source_financial_record_id
    where l2.target_financial_record_id=v_target.id
      and l2.relationship_type='client_payment_to_financial_record'
      and f2.is_deleted=false;
    if p_amount > greatest(v_target.amount-v_applied,0) then raise exception 'PAYMENT_EXCEEDS_OUTSTANDING'; end if;

    v_left:=p_amount;
    for v_deposit in
      select d.id,d.amount
      from public.financial_records d
      where d.company_id=v_company_id and d.client_id=v_payment.client_id and d.type='income'
        and d.category='Depósito en Garantía' and d.is_deleted=false
      order by d.date,d.created_at,d.id
      for update
    loop
      exit when v_left<=0;
      select coalesce(sum(l.amount_applied),0) into v_deposit_used
      from public.financial_record_links l
      join public.financial_records f on f.id=l.source_financial_record_id
      where l.target_financial_record_id=v_deposit.id
        and l.relationship_type in ('security_deposit_application','security_deposit_refund')
        and f.is_deleted=false and f.id<>p_payment_id;
      v_available:=greatest(v_deposit.amount-v_deposit_used,0);
      v_applied:=least(v_left,v_available);
      if v_applied>0 then
        insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
        values(v_company_id,p_payment_id,v_deposit.id,'security_deposit_application',v_applied,v_uid);
        v_left:=round(v_left-v_applied,2);
      end if;
    end loop;
    if v_left>0 then raise exception 'DEPOSIT_INSUFFICIENT'; end if;

    insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
    values(v_company_id,p_payment_id,v_target.id,'client_payment_to_financial_record',p_amount,v_uid);

    update public.financial_records
    set amount=p_amount,date=coalesce(p_payment_date,date),payment_method=p_payment_method,reference_code=p_reference,updated_at=now()
    where id=p_payment_id;

  elsif lower(coalesce(v_payment.category,''))='devolución de depósito' then
    delete from public.financial_record_links
    where source_financial_record_id=p_payment_id and relationship_type='security_deposit_refund';

    v_left:=p_amount;
    for v_deposit in
      select d.id,d.amount
      from public.financial_records d
      where d.company_id=v_company_id and d.client_id=v_payment.client_id and d.type='income'
        and d.category='Depósito en Garantía' and d.is_deleted=false
      order by d.date,d.created_at,d.id
      for update
    loop
      exit when v_left<=0;
      select coalesce(sum(l.amount_applied),0) into v_deposit_used
      from public.financial_record_links l
      join public.financial_records f on f.id=l.source_financial_record_id
      where l.target_financial_record_id=v_deposit.id
        and l.relationship_type in ('security_deposit_application','security_deposit_refund')
        and f.is_deleted=false and f.id<>p_payment_id;
      v_available:=greatest(d.amount-v_deposit_used,0);
      v_applied:=least(v_left,v_available);
      if v_applied>0 then
        insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
        values(v_company_id,p_payment_id,v_deposit.id,'security_deposit_refund',v_applied,v_uid);
        v_left:=round(v_left-v_applied,2);
      end if;
    end loop;
    if v_left>0 then raise exception 'DEPOSIT_INSUFFICIENT'; end if;

    update public.financial_records
    set amount=p_amount,date=coalesce(p_payment_date,date),payment_method=p_payment_method,reference_code=p_reference,updated_at=now()
    where id=p_payment_id;

  else
    select l.relationship_type,l.target_financial_record_id into v_link
    from public.financial_record_links l
    where l.source_financial_record_id=p_payment_id
    order by l.created_at desc
    limit 1;

    if v_link.relationship_type is not null then
      if p_target_financial_record_id is null then raise exception 'TARGET_REQUIRED'; end if;

      select * into v_target
      from public.financial_records
      where id=p_target_financial_record_id and company_id=v_company_id and is_deleted=false
      for update;
      if not found then raise exception 'TARGET_NOT_FOUND'; end if;
      if v_link.relationship_type='client_payment_to_financial_record' and v_target.type<>'income' then raise exception 'TARGET_TYPE_INVALID'; end if;
      if v_link.relationship_type in ('supplier_payment_to_financial_record') and v_target.type<>'expense' then raise exception 'TARGET_TYPE_INVALID'; end if;
      if v_link.relationship_type='client_payment_to_financial_record' and v_target.client_id is distinct from v_payment.client_id then raise exception 'CLIENT_TARGET_MISMATCH'; end if;

      v_applied:=coalesce((
        select sum(coalesce(l2.amount_applied,f2.amount))
        from public.financial_record_links l2
        join public.financial_records f2 on f2.id=l2.source_financial_record_id
        where l2.target_financial_record_id=v_target.id
          and l2.relationship_type=v_link.relationship_type
          and f2.is_deleted=false
          and f2.id<>p_payment_id
      ),0);
      if p_amount>greatest(v_target.amount-v_applied,0) then raise exception 'PAYMENT_EXCEEDS_OUTSTANDING'; end if;

      delete from public.financial_record_links where source_financial_record_id=p_payment_id and relationship_type=v_link.relationship_type;
      insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
      values(v_company_id,p_payment_id,p_target_financial_record_id,v_link.relationship_type,p_amount,v_uid);

    else
      if v_payment.partner_id is null then raise exception 'PAYMENT_KIND_NOT_RECOGNIZED'; end if;
      if p_target_financial_record_id is not null then raise exception 'PARTNER_TARGET_NOT_ALLOWED'; end if;
    end if;

    update public.financial_records
    set amount=p_amount,date=coalesce(p_payment_date,date),payment_method=p_payment_method,reference_code=p_reference,updated_at=now()
    where id=p_payment_id;
  end if;

  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  values
    ('update'::public.audit_action,'financial_record',p_payment_id,'Pago',v_uid,null,now(),
      jsonb_build_object('payment_id',p_payment_id,'amount',p_amount,'date',p_payment_date,'reference',p_reference),v_company_id);

  select * into v_payment from public.financial_records where id=p_payment_id;
  return v_payment;
end;
$function$;

revoke all on function public.recalculate_credit_after_payment_change(uuid) from public, anon, authenticated;
revoke all on function public.delete_financial_payment_atomic(uuid) from public, anon;
revoke all on function public.update_financial_payment_atomic(uuid,numeric,date,text,text,uuid) from public, anon;
revoke all on function public.process_credit_payment_atomic(uuid,uuid,uuid,numeric,date,text,text,uuid) from public, anon;
grant execute on function public.delete_financial_payment_atomic(uuid) to authenticated;
grant execute on function public.update_financial_payment_atomic(uuid,numeric,date,text,text,uuid) to authenticated;
grant execute on function public.process_credit_payment_atomic(uuid,uuid,uuid,numeric,date,text,text,uuid) to authenticated;
