-- Isolated PostgreSQL only. Includes real payment RPCs and assignment guards.
begin;
create role anon;
create role authenticated;
create schema auth;
create schema private;
create function auth.uid() returns uuid language sql stable as $$
 select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
create function public.test_id(n int) returns uuid language sql immutable as $$
 select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid
$$;
create type public.credit_status as enum ('active','completed','cancelled','inactive');
create type public.vehicle_status as enum ('active','rented','sold');
create type public.payment_status as enum ('pending','overdue','paid','cancelled');
create type public.financial_record_type as enum ('income','expense','payment');
create type public.audit_action as enum ('create','update','delete');
create table public.users(id uuid primary key,company_id uuid,role text,is_deleted boolean default false);
create table public.financial_categories(id uuid primary key,company_id uuid,name text,type text,affects text,is_default boolean);
create table public.clients(id uuid primary key,company_id uuid,created_at timestamptz default now(),updated_at timestamptz,
 is_deleted boolean default false,assigned_vehicle_id uuid,vehicle_assigned_at timestamptz,has_active_credit boolean,active_credit_id uuid);
create table public.vehicles(id uuid primary key,company_id uuid,client_id uuid,partner_id uuid,status public.vehicle_status,
 created_at timestamptz default now(),updated_at timestamptz,is_deleted boolean default false,current_mileage int,
 locked_by_credit boolean default false,associated_credit_id uuid);
create table public.partners(id uuid primary key,company_id uuid);
create table public.credits(id uuid primary key,company_id uuid,client_id uuid,vehicle_id uuid,total_amount numeric,paid_amount numeric,
 remaining_balance numeric,payments_made int,status public.credit_status,is_deleted boolean default false,
 last_payment_date date,last_payment_amount numeric,updated_at timestamptz);
create table public.credit_payment_schedules(id uuid primary key default gen_random_uuid(),company_id uuid,credit_id uuid,
 payment_number int,due_date date,amount numeric,paid_amount numeric,is_deleted boolean default false,status public.payment_status,paid_date date);
create table public.financial_records(id uuid primary key default gen_random_uuid(),company_id uuid,client_id uuid,vehicle_id uuid,
 partner_id uuid,category_id uuid,type public.financial_record_type,category text,amount numeric(14,2),date date,payment_method text,
 reference_code text,description text,credit_id uuid,credit_payment boolean default false,credit_granted boolean default false,
 credit_payment_number int,credit_payment_schedule_id uuid,payment_kind text,created_by uuid,is_deleted boolean default false,
 created_at timestamptz default now(),updated_at timestamptz,notes text,source_record_id uuid,source_record_type text);
create table public.financial_record_links(id uuid primary key default gen_random_uuid(),company_id uuid,source_financial_record_id uuid,
 target_financial_record_id uuid,relationship_type text,amount_applied numeric,created_by uuid);
create table public.financial_payment_credit_allocations(company_id uuid,payment_financial_record_id uuid,credit_id uuid,
 credit_payment_schedule_id uuid,amount_applied numeric,is_deleted boolean default false);
create table public.audit_logs(action public.audit_action,entity_type text,entity_id uuid,entity_name text,user_id uuid,user_name text,
 timestamp timestamptz,changes jsonb,company_id uuid);
create table public.vehicle_assignment_logs(id uuid primary key default gen_random_uuid(),vehicle_id uuid,client_id uuid,company_id uuid,
 assigned_at timestamptz,unassigned_at timestamptz,end_date timestamptz,reason text,odometer_reading int,assigned_by uuid);
create table public.mileage_logs(vehicle_id uuid,mileage int,date date,notes text,source text,kind text,company_id uuid,
 created_by uuid,uid uuid,is_deleted boolean default false);
create function public.auth_user_company_id() returns uuid language sql stable security definer set search_path='' as $$
 select company_id from public.users where id=auth.uid()
$$;
create function public.auth_user_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.users where id=auth.uid()
$$;
\ir fixtures/credit_lifecycle_before_20261106.sql
\ir fixtures/payment_functions_before_20261106.sql
\ir ../migrations/20261102190000_enforce_vehicle_assignment_history.sql
\ir ../migrations/20261106214659_scope_atomic_payment_edits.sql
create trigger financial_integrity before insert or update on public.financial_records
 for each row execute function public.enforce_financial_record_integrity();
create trigger trg_fleetease_assignment_before_write before insert or update of vehicle_id,client_id,company_id,odometer_reading
 on public.vehicle_assignment_logs for each row execute function private.fleetease_assignment_before_write();
create trigger trg_fleetease_assignment_after_write after insert or update of unassigned_at,assigned_at,odometer_reading,vehicle_id,client_id
 on public.vehicle_assignment_logs for each row execute function private.fleetease_assignment_after_write();
create trigger trg_finalize_completed_credit_vehicle after update of status,remaining_balance on public.credits
 for each row execute function public.finalize_completed_credit_vehicle();
create trigger trg_release_resources_on_credit_status_change after update of status on public.credits
 for each row execute function public.release_resources_on_credit_status_change();
insert into public.users values(public.test_id(1),public.test_id(101),'admin',false);
insert into public.financial_categories values(public.test_id(201),null,'Pago de Crédito','payment','credit_payment',true);
insert into public.financial_categories values(public.test_id(202),null,'Nota de Crédito','expense','client_balance',true);
insert into public.clients(id,company_id,created_at) values(public.test_id(301),public.test_id(101),now()-interval '2 days');
insert into public.vehicles(id,company_id,created_at,status,current_mileage,partner_id)
 values(public.test_id(401),public.test_id(101),now()-interval '2 days','active',100,public.test_id(501));
insert into public.vehicle_assignment_logs(vehicle_id,client_id,company_id,assigned_at,assigned_by)
 values(public.test_id(401),public.test_id(301),public.test_id(101),now()-interval '1 day',public.test_id(1));
insert into public.credits(id,company_id,client_id,vehicle_id,total_amount,paid_amount,remaining_balance,payments_made,status)
 values(public.test_id(601),public.test_id(101),public.test_id(301),public.test_id(401),10,0,10,0,'active');
update public.vehicles set locked_by_credit=true,associated_credit_id=public.test_id(601);
update public.clients set has_active_credit=true,active_credit_id=public.test_id(601);
insert into public.credit_payment_schedules(company_id,credit_id,payment_number,amount,paid_amount,status)
 select public.test_id(101),public.test_id(601),n,5,0,'pending' from generate_series(1,2) n;
grant usage on schema auth to authenticated;
grant select on all tables in schema public to authenticated;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(1))::text,true);
-- RED: prove the live completion bug, with all effects rolled back by the block.
do $$ begin
 begin
  perform public.process_credit_payment_atomic(public.test_id(101),public.test_id(601),public.test_id(301),10,current_date,'Efectivo','QA-RED',null);
  raise exception 'Expected assignment-history failure';
 exception when check_violation then
  if sqlerrm<>'CLIENT_ASSIGNMENT_MUST_BE_ENDED_IN_HISTORY' then raise; end if;
 end;
 if (select remaining_balance from public.credits where id=public.test_id(601))<>10
   or exists(select 1 from public.financial_records) then raise exception 'RED did not roll back'; end if;
end $$;
reset role;
-- MIGRATION_UNDER_TEST
\ir ../migrations/20261107053703_respect_credit_assignment_lifecycle.sql
set local role authenticated;
do $$ declare r jsonb; p uuid; p2 uuid; begin
 r:=public.process_credit_payment_atomic(public.test_id(101),public.test_id(601),public.test_id(301),4,current_date,'Efectivo','QA-PARTIAL',null);
 p:=(r->>'payment_id')::uuid;
 perform public.update_financial_payment_atomic(p,5,current_date,'Efectivo','QA-EDIT',null);
 if (select remaining_balance from public.credits where id=public.test_id(601))<>5 then raise exception 'Partial edit balance'; end if;
 perform public.delete_financial_payment_atomic(p);
 if (select remaining_balance from public.credits where id=public.test_id(601))<>10 then raise exception 'Partial reversal balance'; end if;
 r:=public.process_credit_payment_atomic(public.test_id(101),public.test_id(601),public.test_id(301),10,current_date,'Efectivo','QA-FULL',null);
 p2:=(r->>'payment_id')::uuid;
 if (select status from public.credits where id=public.test_id(601))<>'completed' then raise exception 'Not completed'; end if;
 if exists(select 1 from public.vehicle_assignment_logs where unassigned_at is null) then raise exception 'History still open'; end if;
 if exists(select 1 from public.clients where assigned_vehicle_id is not null or has_active_credit) then raise exception 'Client not released'; end if;
 if not exists(select 1 from public.vehicles where status='sold' and client_id is null and partner_id is null and not locked_by_credit and associated_credit_id is null) then raise exception 'Final sale overwritten'; end if;
 -- Reversal after ownership transfer still fails closed; no history is fabricated.
 begin
  perform public.delete_financial_payment_atomic(p2);
  raise exception 'Unexpected reopening of sold assignment';
 exception when check_violation then
  if sqlerrm<>'VEHICLE_CLIENT_ASSIGNMENT_REQUIRES_HISTORY' then raise; end if;
 end;
 if (select is_deleted from public.financial_records where id=p2) then raise exception 'Failed reversal left deleted payment'; end if;
 if (select remaining_balance from public.credits where id=public.test_id(601))<>0 then raise exception 'Failed reversal changed credit'; end if;
 if exists(select 1 from fleetease_private.payment_edit_authorizations) then raise exception 'Capability leaked'; end if;
end $$;
reset role;
-- The cancellation trigger must close history before clearing either pointer.
update public.vehicles set status='active';
insert into public.vehicle_assignment_logs(vehicle_id,client_id,company_id,assigned_at,assigned_by)
 values(public.test_id(401),public.test_id(301),public.test_id(101),now(),public.test_id(1));
update public.credits set status='active',remaining_balance=10;
update public.vehicles set locked_by_credit=true,associated_credit_id=public.test_id(601);
update public.clients set has_active_credit=true,active_credit_id=public.test_id(601);
update public.credits set status='cancelled';
do $$ begin
 if exists(select 1 from public.vehicle_assignment_logs where unassigned_at is null) then raise exception 'Cancellation left open history'; end if;
 if not exists(select 1 from public.vehicles where status='active' and client_id is null and not locked_by_credit) then raise exception 'Cancellation did not release'; end if;
 if exists(select 1 from public.clients where assigned_vehicle_id is not null or has_active_credit) then raise exception 'Cancellation left client assigned'; end if;
end $$;
-- A final payment whose audit fails must restore the open assignment as well.
insert into public.vehicle_assignment_logs(vehicle_id,client_id,company_id,assigned_at,assigned_by)
 values(public.test_id(401),public.test_id(301),public.test_id(101),now(),public.test_id(1));
insert into public.credits(id,company_id,client_id,vehicle_id,total_amount,paid_amount,remaining_balance,payments_made,status)
 values(public.test_id(602),public.test_id(101),public.test_id(301),public.test_id(401),10,0,10,0,'active');
update public.vehicles set locked_by_credit=true,associated_credit_id=public.test_id(602);
update public.clients set has_active_credit=true,active_credit_id=public.test_id(602);
insert into public.credit_payment_schedules(company_id,credit_id,payment_number,amount,paid_amount,status)
 select public.test_id(101),public.test_id(602),n,5,0,'pending' from generate_series(1,2) n;
create function public.fail_credit_test_audit() returns trigger language plpgsql as $$ begin
 if new.entity_id=public.test_id(602) and current_setting('qa.fail_audit',true)='yes' then
  raise exception 'QA_AUDIT_FAILURE';
 end if;
 return new;
end $$;
create trigger credit_test_audit before insert on public.audit_logs for each row execute function public.fail_credit_test_audit();
set local role authenticated;
do $$ declare r jsonb;p uuid;begin
 perform set_config('qa.fail_audit','yes',true);
 begin
  perform public.process_credit_payment_atomic(public.test_id(101),public.test_id(602),public.test_id(301),10,current_date,'Efectivo','QA-FAIL',null);
  raise exception 'Expected audit failure';
 exception when raise_exception then
  if sqlerrm<>'QA_AUDIT_FAILURE' then raise; end if;
 end;
 if not exists(select 1 from public.vehicle_assignment_logs where unassigned_at is null) then raise exception 'Audit failure closed history'; end if;
 if not exists(select 1 from public.vehicles where status='active' and client_id=public.test_id(301) and locked_by_credit) then raise exception 'Audit failure released vehicle'; end if;
 if exists(select 1 from public.financial_records where credit_id=public.test_id(602)) then raise exception 'Audit failure retained payment'; end if;
 perform set_config('qa.fail_audit','no',true);
 r:=public.process_credit_payment_atomic(public.test_id(101),public.test_id(602),public.test_id(301),4,current_date,'Efectivo','QA-EDIT-FULL',null);
 p:=(r->>'payment_id')::uuid;
 perform public.update_financial_payment_atomic(p,10,current_date,'Efectivo','QA-EDIT-FULL',null);
 if not exists(select 1 from public.vehicles where status='sold' and client_id is null and partner_id is null and not locked_by_credit) then raise exception 'Edit completion overwritten'; end if;
 if exists(select 1 from public.vehicle_assignment_logs where unassigned_at is null) then raise exception 'Edit completion left history open'; end if;
 if (select remaining_balance from public.credits where id=public.test_id(602))<>0 then raise exception 'Edit completion balance'; end if;
 if exists(select 1 from fleetease_private.payment_edit_authorizations) then raise exception 'Edit completion capability leaked'; end if;
 if has_function_privilege('anon','public.process_credit_payment_atomic(uuid,uuid,uuid,numeric,date,text,text,uuid)','EXECUTE') then raise exception 'Anon can pay'; end if;
 if has_function_privilege('authenticated','public.recalculate_credit_after_payment_change(uuid)','EXECUTE') then raise exception 'Client can invoke internal recalculator'; end if;
end $$;
reset role;
select 'CREDIT_ASSIGNMENT_LIFECYCLE_PASS' as result;
-- Real cancellation RPC after a partial payment preserves note and caller reason.
update public.vehicles set status='active';
insert into public.vehicle_assignment_logs(vehicle_id,client_id,company_id,assigned_at,assigned_by)
 values(public.test_id(401),public.test_id(301),public.test_id(101),now(),public.test_id(1));
insert into public.credits(id,company_id,client_id,vehicle_id,total_amount,paid_amount,remaining_balance,payments_made,status)
 values(public.test_id(603),public.test_id(101),public.test_id(301),public.test_id(401),10,0,10,0,'active');
update public.vehicles set locked_by_credit=true,associated_credit_id=public.test_id(603);
update public.clients set has_active_credit=true,active_credit_id=public.test_id(603);
insert into public.credit_payment_schedules(company_id,credit_id,payment_number,amount,paid_amount,status)
 select public.test_id(101),public.test_id(603),n,5,0,'pending' from generate_series(1,2) n;
set local role authenticated;
do $$ declare r jsonb;begin
 begin
  perform public.cancel_credit_atomic(public.test_id(999),public.test_id(603),'Otro tenant');
  raise exception 'Expected tenant rejection';
 exception when insufficient_privilege then
  if sqlerrm<>'INVALID_COMPANY' then raise; end if;
 end;
 perform public.process_credit_payment_atomic(public.test_id(101),public.test_id(603),public.test_id(301),4,current_date,'Efectivo','QA-CANCEL-PARTIAL',null);
 r:=public.cancel_credit_atomic(public.test_id(101),public.test_id(603),'QA motivo conservado');
 if r->>'mode'<>'credit_note' then raise exception 'Cancellation mode'; end if;
 if not exists(select 1 from public.financial_records where credit_id=public.test_id(603) and source_record_type='credit_cancellation_note' and amount=6 and not is_deleted) then raise exception 'Credit note missing'; end if;
 if not exists(select 1 from public.vehicle_assignment_logs where reason='Crédito cancelado: QA motivo conservado' and unassigned_at is not null) then raise exception 'Cancellation reason missing'; end if;
 if exists(select 1 from public.vehicle_assignment_logs where unassigned_at is null) then raise exception 'Cancellation history open'; end if;
 if not exists(select 1 from public.vehicles where status='active' and client_id is null and not locked_by_credit) then raise exception 'Cancellation RPC resources'; end if;
end $$;
reset role;
-- Inactivation uses the same guarded release without a cancellation-note writer.
insert into public.vehicle_assignment_logs(vehicle_id,client_id,company_id,assigned_at,assigned_by)
 values(public.test_id(401),public.test_id(301),public.test_id(101),now(),public.test_id(1));
update public.credits set status='active' where id=public.test_id(603);
update public.vehicles set locked_by_credit=true,associated_credit_id=public.test_id(603);
update public.clients set has_active_credit=true,active_credit_id=public.test_id(603);
update public.credits set status='inactive' where id=public.test_id(603);
do $$ begin
 if exists(select 1 from public.vehicle_assignment_logs where unassigned_at is null) then raise exception 'Inactivation history open'; end if;
 if not exists(select 1 from public.vehicles where status='active' and client_id is null and not locked_by_credit) then raise exception 'Inactivation resources'; end if;
end $$;
select 'CREDIT_CANCELLATION_LIFECYCLE_PASS' as result;
rollback;
