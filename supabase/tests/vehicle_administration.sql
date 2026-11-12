-- Extends the isolated credit lifecycle fixture.
reset role;
alter table public.vehicles add column admin_commission numeric;
alter table public.financial_categories add column description text, add column category text;
alter table public.financial_categories alter column id set default gen_random_uuid();
create type public.balance_affects as enum ('partner_balance','none');
\ir ../migrations/20260918000000_partner_credit_and_vehicle_admin_flow.sql
\ir ../migrations/20261112192000_atomic_vehicle_administration.sql

insert into public.financial_categories(id, company_id, name, type, affects)
 values(public.test_id(911),null,'Renta Semanal','income','none'),
       (public.test_id(912),null,'Otro ingreso','income','none');
insert into public.partners values(public.test_id(951),public.test_id(101));
update public.vehicles set partner_id=public.test_id(951), admin_commission=800 where id=public.test_id(401);
select set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(1))::text,true);

do $$
declare
  v_company uuid := public.test_id(101);
  v_rental uuid := public.test_id(921);
  v_vehicle uuid := public.test_id(401);
  v_expense uuid;
begin
  insert into public.financial_records(id,company_id,vehicle_id,category_id,type,amount,date,source_record_type)
    values(v_rental,v_company,v_vehicle,public.test_id(911),'income',4000,current_date,'weekly_rent_with_admin');
  select id into strict v_expense from public.financial_records
    where source_record_id=v_rental and source_record_type='vehicle_admin_rent'
      and amount=800 and partner_id=public.test_id(951) and not is_deleted;
  if not exists(select 1 from public.financial_records where source_record_id=v_expense
    and source_record_type='vehicle_admin_fee' and amount=800 and not is_deleted)
  then raise exception 'Missing paired rental administration income'; end if;

  update public.vehicles set admin_commission=500 where id=v_vehicle;
  update public.financial_records set date=current_date-1 where id=v_rental;
  if (select count(*) from public.financial_records where (id=v_expense or source_record_id=v_expense)
      and not is_deleted and amount=800 and date=current_date-1)<>2
  then raise exception 'Rental edit lost fee snapshot or effective date'; end if;

  begin
    update public.financial_records set is_deleted=true where id=v_expense;
    raise exception 'Direct deletion of generated fee should fail';
  exception when insufficient_privilege then
    if sqlerrm <> 'VEHICLE_ADMINISTRATION_MANAGED_BY_SOURCE' then raise; end if;
  end;
  update public.financial_records set is_deleted=true where id=v_rental;
  if exists(select 1 from public.financial_records where (id=v_expense or source_record_id=v_expense) and not is_deleted)
  then raise exception 'Rental reversal left a fee active'; end if;

  insert into public.financial_records(id,company_id,vehicle_id,category_id,type,amount,date,source_record_type)
    values(public.test_id(922),v_company,v_vehicle,public.test_id(912),'income',4000,current_date,'weekly_rent_with_admin');
  update public.vehicles set admin_commission=0 where id=v_vehicle;
  insert into public.financial_records(id,company_id,vehicle_id,category_id,type,amount,date,source_record_type)
    values(public.test_id(923),v_company,v_vehicle,public.test_id(911),'income',4000,current_date,'weekly_rent_with_admin');
  update public.vehicles set admin_commission=null where id=v_vehicle;
  insert into public.financial_records(id,company_id,vehicle_id,category_id,type,amount,date,source_record_type)
    values(public.test_id(924),v_company,v_vehicle,public.test_id(911),'income',4000,current_date,'weekly_rent_with_admin');
  update public.vehicles set admin_commission=800 where id=v_vehicle;
  update public.financial_records set date=current_date-1 where id=public.test_id(924);
  begin
    update public.financial_categories set name='Categoría temporal'
      where lower(trim(name))='ingreso por administración de vehículo';
    insert into public.financial_records(id,company_id,vehicle_id,category_id,type,amount,date,source_record_type)
      values(public.test_id(925),v_company,v_vehicle,public.test_id(911),'income',4000,current_date,'weekly_rent_with_admin');
    raise exception 'Expected missing category to abort rental';
  exception when raise_exception then
    if sqlerrm <> 'VEHICLE_ADMINISTRATION_CATEGORIES_REQUIRED' then raise; end if;
  end;
  if exists(select 1 from public.financial_records where id=public.test_id(925))
  then raise exception 'Rental survived failed administration'; end if;
  -- Old clients still create their manual companion separately during rollout.
  insert into public.financial_records(id,company_id,vehicle_id,category_id,type,amount,date)
    values(public.test_id(926),v_company,v_vehicle,public.test_id(911),'income',4000,current_date);
  update public.vehicles set partner_id=null where id=v_vehicle;
  insert into public.financial_records(id,company_id,vehicle_id,category_id,type,amount,date,source_record_type)
    values(public.test_id(927),v_company,v_vehicle,public.test_id(911),'income',4000,current_date,'weekly_rent_with_admin');
  if exists(select 1 from public.financial_records where source_record_type='vehicle_admin_rent' and not is_deleted)
  then raise exception 'Other category, zero or null fee was charged'; end if;
end;
$$;

insert into public.clients(id,company_id,created_at)
 values(public.test_id(931),public.test_id(101),now()-interval '2 days');
insert into public.vehicles(id,company_id,created_at,status,current_mileage,partner_id,admin_commission)
 values(public.test_id(932),public.test_id(101),now()-interval '2 days','active',100,public.test_id(951),800);
insert into public.vehicle_assignment_logs(vehicle_id,client_id,company_id,assigned_at,assigned_by)
 values(public.test_id(932),public.test_id(931),public.test_id(101),now()-interval '1 day',public.test_id(1));
insert into public.credits(id,company_id,client_id,vehicle_id,total_amount,paid_amount,remaining_balance,payments_made,status)
 values(public.test_id(933),public.test_id(101),public.test_id(931),public.test_id(932),12000,0,12000,0,'active');
update public.vehicles set locked_by_credit=true,associated_credit_id=public.test_id(933) where id=public.test_id(932);
update public.clients set has_active_credit=true,active_credit_id=public.test_id(933) where id=public.test_id(931);
insert into public.credit_payment_schedules(company_id,credit_id,payment_number,amount,paid_amount,status,due_date)
 select public.test_id(101),public.test_id(933),n,4000,0,'pending',current_date from generate_series(1,3) n;
grant update on public.credit_payment_schedules to authenticated;
set local role authenticated;

do $$
declare
  v_company uuid := public.test_id(101);
  v_credit uuid := public.test_id(933);
  v_client uuid := public.test_id(931);
  v_vehicle uuid := public.test_id(932);
  v_request uuid := public.test_id(941);
  v_first jsonb;
  v_replay jsonb;
begin
  begin
    update public.credit_payment_schedules set status='paid', paid_date=current_date
      where credit_id=v_credit and payment_number=1;
    raise exception 'Expected direct paid status change to fail';
  exception when insufficient_privilege then
    if sqlerrm <> 'CREDIT_INSTALLMENT_MANAGED_BY_PAYMENT' then raise; end if;
  end;
  perform public.process_credit_payment_once(v_company,v_credit,v_client,1500,public.test_id(940),current_date);
  if exists(select 1 from public.financial_records where vehicle_id=v_vehicle
      and source_record_type='vehicle_admin_installment' and not is_deleted)
  then raise exception 'Partial installment was charged'; end if;
  v_first := public.process_credit_payment_once(v_company,v_credit,v_client,6500,v_request,current_date);
  v_replay := public.process_credit_payment_once(v_company,v_credit,v_client,6500,v_request,current_date);
  if v_first->>'paymentId' is distinct from v_replay->>'paymentId' then raise exception 'Replay changed payment'; end if;
  if (select count(*) from public.financial_records where vehicle_id=v_vehicle and amount=800
      and source_record_type='vehicle_admin_installment' and not is_deleted)<>2
  then raise exception 'One payment must charge each completed installment once'; end if;
  perform public.update_financial_payment_atomic((v_first->>'paymentId')::uuid,2500,current_date-1,'Efectivo','QA edición',null);
  if (select count(*) from public.financial_records where vehicle_id=v_vehicle
      and source_record_type in ('vehicle_admin_installment','vehicle_admin_fee') and not is_deleted)<>2
  then raise exception 'Payment edit should leave one completed installment pair'; end if;
  perform public.delete_financial_payment_atomic((v_first->>'paymentId')::uuid);
  if exists(select 1 from public.financial_records where vehicle_id=v_vehicle
      and source_record_type in ('vehicle_admin_installment','vehicle_admin_fee') and not is_deleted)
  then raise exception 'Payment reversal left administration active'; end if;
  perform public.process_credit_payment_once(v_company,v_credit,v_client,10500,public.test_id(942),current_date);
  if (select count(*) from public.financial_records where vehicle_id=v_vehicle and partner_id=public.test_id(951)
      and amount=800 and source_record_type='vehicle_admin_installment' and not is_deleted)<>3
     or (select count(*) from public.financial_records where vehicle_id=v_vehicle and partner_id=public.test_id(951)
      and amount=800 and source_record_type='vehicle_admin_fee' and not is_deleted)<>3
     or not exists(select 1 from public.vehicles where id=v_vehicle and status='sold' and partner_id is null)
  then raise exception 'Final settlement did not capture all fees before sale'; end if;
end;
$$;

reset role;
select 'VEHICLE_ADMINISTRATION_PASS' as result;
