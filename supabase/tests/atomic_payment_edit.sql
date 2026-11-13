-- Isolated database only: psql -v ON_ERROR_STOP=1 -f supabase/tests/atomic_payment_edit.sql
-- No production data or credentials. All objects and assertions end with rollback.
begin;
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
 select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
grant usage on schema auth to authenticated;
create function public.test_id(n int) returns uuid language sql immutable as $$
 select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid
$$;
create type public.financial_record_type as enum ('income','expense','payment');
create type public.audit_action as enum ('create','update','delete');
create table public.users(id uuid primary key,company_id uuid,role text,is_deleted boolean default false);
create table public.financial_categories(id uuid primary key default gen_random_uuid(),company_id uuid,
 name text,type public.financial_record_type,affects text,description text,is_default boolean);
create type public.multa_status as enum ('pendiente','pagada','cancelada');
create table public.multas(id uuid primary key,status public.multa_status,fecha_pago date,is_deleted boolean default false,updated_at timestamptz);
create table public.clients(id uuid primary key,company_id uuid);
create table public.vehicles(id uuid primary key,company_id uuid);
create table public.partners(id uuid primary key,company_id uuid);
create table public.credits(id uuid primary key,company_id uuid,total_amount numeric);
create table public.financial_records(
 id uuid primary key,company_id uuid,client_id uuid,vehicle_id uuid,partner_id uuid,category_id uuid,
 type public.financial_record_type,category text,amount numeric(14,2),date date,payment_method text,reference_code text,
 description text,credit_id uuid,credit_payment boolean default false,credit_granted boolean default false,
 payment_kind text,source_record_id uuid,source_record_type text,created_by uuid,is_deleted boolean default false,created_at timestamptz default now(),updated_at timestamptz
);
create table public.financial_record_links(
 id uuid primary key default gen_random_uuid(), company_id uuid,source_financial_record_id uuid,
 target_financial_record_id uuid,relationship_type text,amount_applied numeric(14,2),created_by uuid,
 created_at timestamptz default now()
);
create table public.financial_payment_credit_allocations(
 company_id uuid,payment_financial_record_id uuid,credit_id uuid,credit_payment_schedule_id uuid,
 amount_applied numeric,is_deleted boolean default false
);
create table public.credit_payment_schedules(id uuid,company_id uuid,credit_id uuid,payment_number int,amount numeric,paid_amount numeric,is_deleted boolean,status text);
create table public.supplier_purchases(id uuid primary key,status text,is_deleted boolean default false,updated_at timestamptz);
create table public.accounts_payable(id uuid primary key,company_id uuid,party_type text,source_financial_record_id uuid,is_deleted boolean,
 original_amount numeric,supplier_purchase_id uuid,status text,updated_at timestamptz);
create table public.audit_logs(action public.audit_action,entity_type text,entity_id uuid,entity_name text,user_id uuid,user_name text,"timestamp" timestamptz,changes jsonb,company_id uuid);
-- Credit recalculation is outside this fixture and fails closed if accidentally invoked.
create function public.recalculate_credit_after_payment_change(uuid) returns void language plpgsql as $$
 begin raise exception 'Unexpected credit path in ordinary payment test'; end $$;
\ir fixtures/supplier_reconcile_20261106.sql
create function public.auth_user_company_id() returns uuid language sql stable security definer set search_path='' as $$
 select company_id from public.users where id=auth.uid()
$$;
create function public.auth_user_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.users where id=auth.uid()
$$;
insert into public.users values
 (public.test_id(1),public.test_id(101),'admin',false),
 (public.test_id(2),public.test_id(101),'client',false),
 (public.test_id(3),public.test_id(101),'editor',false),
 (public.test_id(4),public.test_id(101),'admin',true),
 (public.test_id(5),public.test_id(102),'admin',false),
 (public.test_id(6),public.test_id(101),'partner',false),
 (public.test_id(7),public.test_id(101),'super_admin',false);
insert into public.financial_categories(id,company_id) values(public.test_id(201),null);
insert into public.clients values(public.test_id(301),public.test_id(101)),(public.test_id(302),public.test_id(101));
insert into public.financial_records(id,company_id,client_id,category_id,type,category,amount,date,created_by) values
 (public.test_id(401),public.test_id(101),public.test_id(301),public.test_id(201),'income','Renta',10,'2026-11-06',public.test_id(1)),
 (public.test_id(402),public.test_id(101),public.test_id(301),public.test_id(201),'payment','Abono',4,'2026-11-06',public.test_id(1)),
 (public.test_id(403),public.test_id(101),public.test_id(301),public.test_id(201),'income','Renta',20,'2026-11-06',public.test_id(1)),
 (public.test_id(404),public.test_id(102),null,public.test_id(201),'income','Ajeno',20,'2026-11-06',public.test_id(5)),
 (public.test_id(405),public.test_id(102),null,public.test_id(201),'payment','Ajeno',2,'2026-11-06',public.test_id(5)),
 (public.test_id(406),public.test_id(101),public.test_id(302),public.test_id(201),'income','Otro cliente',20,'2026-11-06',public.test_id(1));
insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
 values(public.test_id(101),public.test_id(402),public.test_id(401),'client_payment_to_financial_record',4,public.test_id(1));
insert into public.financial_records(id,company_id,client_id,category_id,type,category,description,amount,date,created_by) values
 (public.test_id(407),public.test_id(101),public.test_id(301),public.test_id(201),'payment','Abono','Depósito aplicado QA',3,'2026-11-06',public.test_id(1)),
 (public.test_id(408),public.test_id(101),public.test_id(301),public.test_id(201),'income','Depósito en Garantía','Garantía QA',5,'2026-11-06',public.test_id(1));
insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by) values
 (public.test_id(101),public.test_id(407),public.test_id(401),'client_payment_to_financial_record',3,public.test_id(1)),
 (public.test_id(101),public.test_id(407),public.test_id(408),'security_deposit_application',3,public.test_id(1));
insert into public.financial_records(id,company_id,client_id,category_id,type,category,amount,date,created_by) values
 (public.test_id(409),public.test_id(101),public.test_id(301),public.test_id(201),'expense',' Devolución de Depósito ',1,'2026-11-06',public.test_id(1)),
 (public.test_id(410),public.test_id(101),public.test_id(301),public.test_id(201),'expense','Mantenimiento',2,'2026-11-06',public.test_id(1)),
 (public.test_id(411),public.test_id(101),public.test_id(301),public.test_id(201),'expense','Devolución de Depósito',1,'2026-11-06',public.test_id(1));
update public.financial_records set description='Depósito aplicado libre' where id=public.test_id(409);
insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
 values(public.test_id(101),public.test_id(409),public.test_id(408),'security_deposit_refund',1,public.test_id(1));
insert into public.financial_records(id,company_id,category_id,type,category,amount,date,created_by) values
 (public.test_id(412),public.test_id(101),public.test_id(201),'expense','Compra proveedor',12,'2026-11-06',public.test_id(1)),
 (public.test_id(413),public.test_id(101),public.test_id(201),'payment','Pago proveedor',4,'2026-11-06',public.test_id(1));
insert into public.supplier_purchases(id,status) values(public.test_id(501),'partially_paid');
insert into public.accounts_payable values(public.test_id(502),public.test_id(101),'supplier',public.test_id(412),false,12,public.test_id(501),'partially_paid',now());
insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
 values(public.test_id(101),public.test_id(413),public.test_id(412),'supplier_payment_to_financial_record',4,public.test_id(1));
insert into public.multas(id,status) values(public.test_id(601),'pendiente');
insert into public.financial_records(id,company_id,client_id,category_id,type,category,amount,date,created_by,source_record_id,source_record_type)
values(public.test_id(602),public.test_id(101),public.test_id(301),public.test_id(201),'income','Multa',12,'2026-11-06',public.test_id(1),public.test_id(601),'multa'),
      (public.test_id(603),public.test_id(101),public.test_id(301),public.test_id(201),'payment','Pago de Multa',4,'2026-11-06',public.test_id(1),null,null);
insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
values(public.test_id(101),public.test_id(603),public.test_id(602),'multa_payment_to_financial_record',4,public.test_id(1));

alter table public.financial_records enable row level security;
grant select,update on public.financial_records to authenticated;
grant select on public.users,public.financial_categories,public.clients,public.vehicles,public.partners,public.credits to authenticated;
create policy tenant_read on public.financial_records for select to authenticated
 using(company_id=public.auth_user_company_id() and is_deleted=false);
create policy tenant_update on public.financial_records for update to authenticated
 using(company_id=public.auth_user_company_id()) with check(company_id=public.auth_user_company_id());

\ir fixtures/payment_functions_before_20261106.sql
create trigger financial_integrity before insert or update on public.financial_records
 for each row execute function public.enforce_financial_record_integrity();
revoke execute on function public.enforce_financial_record_integrity() from public,anon,authenticated;

\ir ../migrations/20261106214659_scope_atomic_payment_edits.sql

\ir ../migrations/20260922090000_multa_client_balance_and_partial_payments.sql

create function public.fail_test_audit() returns trigger language plpgsql as $$
 begin
  if new.changes->>'reference'='QA-FAIL-AFTER-UPDATE' then raise exception 'TEST_AUDIT_FAILURE'; end if;
  return new;
 end $$;
create trigger test_audit_failure before insert on public.audit_logs for each row execute function public.fail_test_audit();

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(1))::text,true);
do $$ declare result public.financial_records; begin
 result:=public.update_financial_payment_atomic(public.test_id(402),5.001,'2026-11-06','Transferencia','QA-EDIT',public.test_id(401));
 if result.amount<>5 or result.reference_code<>'QA-EDIT' then raise exception 'Edit did not persist'; end if;
 -- Repeated edits and relinking use the persisted amount and update links atomically.
 result:=public.update_financial_payment_atomic(public.test_id(402),3,'2026-11-06','Efectivo','QA-RELINK',public.test_id(403));
 if result.amount<>3 then raise exception 'Decrease did not persist'; end if;
 result:=public.update_financial_payment_atomic(public.test_id(402),3,'2026-11-06','Efectivo','QA-SAME',public.test_id(403));
 if result.reference_code<>'QA-SAME' then raise exception 'Same amount metadata edit failed'; end if;
 result:=public.update_financial_payment_atomic(public.test_id(407),2,'2026-11-06','Transferencia','QA-DEPOSIT-EDIT',public.test_id(401));
 if result.amount<>2 then raise exception 'Deposit edit failed'; end if;
 result:=public.update_financial_payment_atomic(public.test_id(409),2,'2026-11-06','Transferencia','QA-REFUND-EDIT',null);
 if result.type<>'expense' or result.amount<>2 then raise exception 'Refund edit failed'; end if;

 -- Links are private to the RPC in production. Test runner checks them after resetting role below.
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.financial_record_links where source_financial_record_id=public.test_id(402) and target_financial_record_id=public.test_id(403) and amount_applied=3) then raise exception 'Relink failed'; end if;
 if exists(select 1 from fleetease_private.payment_edit_authorizations) then raise exception 'Capability leaked after success'; end if;
 if not exists(select 1 from public.financial_record_links where source_financial_record_id=public.test_id(407) and target_financial_record_id=public.test_id(408) and relationship_type='security_deposit_application' and amount_applied=2) then raise exception 'Deposit allocation not rebuilt'; end if;

end $$;
set local role authenticated;
do $$ declare action text; begin
 for action in select unnest(array['direct','guc','private','overpay','foreign-target','other-client','foreign-payment','income','zero','rounded-zero','nan','infinity','identity','client-change','kind-change','audit-failure','expense','orphan-refund','refund-overpay']) loop
  begin
   case action
    when 'direct' then update public.financial_records set amount=7 where id=public.test_id(402);
    when 'guc' then
     perform set_config('app.allow_payment_edit','true',true);
     update public.financial_records set amount=7 where id=public.test_id(402);
    when 'private' then insert into fleetease_private.payment_edit_authorizations values(txid_current(),pg_backend_pid(),public.test_id(402),public.test_id(101),public.test_id(1),3,7);
    when 'overpay' then perform public.update_financial_payment_atomic(public.test_id(402),21,'2026-11-06',null,null,public.test_id(403));
    when 'foreign-target' then perform public.update_financial_payment_atomic(public.test_id(402),2,'2026-11-06',null,null,public.test_id(404));
    when 'other-client' then perform public.update_financial_payment_atomic(public.test_id(402),2,'2026-11-06',null,null,public.test_id(406));
    when 'foreign-payment' then perform public.update_financial_payment_atomic(public.test_id(405),2,'2026-11-06',null,null,public.test_id(404));
    when 'income' then perform public.update_financial_payment_atomic(public.test_id(401),2,'2026-11-06',null,null,public.test_id(403));
    when 'zero' then perform public.update_financial_payment_atomic(public.test_id(402),0,'2026-11-06',null,null,public.test_id(403));
    when 'rounded-zero' then perform public.update_financial_payment_atomic(public.test_id(402),0.001,'2026-11-06',null,null,public.test_id(403));
    when 'nan' then perform public.update_financial_payment_atomic(public.test_id(402),'NaN','2026-11-06',null,null,public.test_id(403));
    when 'infinity' then perform public.update_financial_payment_atomic(public.test_id(402),'Infinity','2026-11-06',null,null,public.test_id(403));
    when 'identity' then update public.financial_records set id=public.test_id(499) where id=public.test_id(402);
    when 'client-change' then update public.financial_records set client_id=public.test_id(302) where id=public.test_id(402);
    when 'kind-change' then update public.financial_records set payment_kind='supplier_payment' where id=public.test_id(402);
    when 'audit-failure' then perform public.update_financial_payment_atomic(public.test_id(402),7,'2026-11-06',null,'QA-FAIL-AFTER-UPDATE',public.test_id(403));
    when 'expense' then perform public.update_financial_payment_atomic(public.test_id(410),3,'2026-11-06',null,null,null);
    when 'orphan-refund' then perform public.update_financial_payment_atomic(public.test_id(411),2,'2026-11-06',null,null,null);
    when 'refund-overpay' then perform public.update_financial_payment_atomic(public.test_id(409),6,'2026-11-06',null,null,null);


   end case;
   raise exception 'UNEXPECTED_SUCCESS_%',action using errcode='XX000';
  exception when others then
   if sqlstate='XX000' then raise; end if;
   if action in ('direct','guc') and sqlerrm<>'FINANCIAL_SENSITIVE_FIELDS_IMMUTABLE' then raise; end if;
   if action='private' and sqlstate<>'42501' then raise; end if;
   if action='audit-failure' and sqlerrm<>'TEST_AUDIT_FAILURE' then raise; end if;
   if action in ('identity','client-change','kind-change') and sqlerrm<>'FINANCIAL_SENSITIVE_FIELDS_IMMUTABLE' then raise; end if;
   if action='overpay' and sqlerrm<>'PAYMENT_EXCEEDS_OUTSTANDING' then raise; end if;
   if action='other-client' and sqlerrm<>'CLIENT_TARGET_MISMATCH' then raise; end if;
  end;
 end loop;
end $$;
reset role;
do $$ begin
 if (select amount from public.financial_records where id=public.test_id(402))<>3 then raise exception 'Failed operation changed amount'; end if;
 if (select count(*) from public.audit_logs)<>5 then raise exception 'Failed operation leaked audit'; end if;
 if exists(select 1 from fleetease_private.payment_edit_authorizations) then raise exception 'Capability leaked after failure'; end if;
 if (select count(*) from public.financial_record_links where source_financial_record_id=public.test_id(402) and target_financial_record_id=public.test_id(403) and amount_applied=3)<>1 then raise exception 'Failed operation changed links'; end if;
end $$;
set local role authenticated;
do $$ declare user_num int; begin
 foreach user_num in array array[2,4,5,6,99] loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(user_num))::text,true);
  begin
   perform public.update_financial_payment_atomic(public.test_id(402),2,'2026-11-06',null,null,public.test_id(403));
   raise exception 'UNEXPECTED_ROLE_EDIT_%',user_num using errcode='XX000';
  exception when others then if sqlstate='XX000' then raise; end if; end;
  begin
   perform public.delete_financial_payment_atomic(public.test_id(402));
   raise exception 'UNEXPECTED_ROLE_DELETE_%',user_num using errcode='XX000';
  exception when others then if sqlstate='XX000' then raise; end if; end;
 end loop;
 perform set_config('request.jwt.claims','{}',true);
 begin
  perform public.update_financial_payment_atomic(public.test_id(402),2,'2026-11-06',null,null,public.test_id(403));
  raise exception 'No auth accepted' using errcode='XX000';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(7))::text,true);
 perform public.update_financial_payment_atomic(public.test_id(402),2,'2026-11-06',null,'QA-SUPER',public.test_id(403));
 perform set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(3))::text,true);
 perform public.update_financial_payment_atomic(public.test_id(402),2,'2026-11-06',null,null,public.test_id(403));
 perform public.delete_financial_payment_atomic(public.test_id(402));
 perform public.delete_financial_payment_atomic(public.test_id(409));
 begin
  perform public.delete_financial_payment_atomic(public.test_id(410));
  raise exception 'Ordinary expense deleted through payment RPC' using errcode='XX000';
 exception when raise_exception then if sqlerrm<>'PAYMENT_NOT_FOUND' then raise; end if; end;
 begin
  perform public.update_financial_payment_atomic(public.test_id(402),2,'2026-11-06',null,null,public.test_id(403));
  raise exception 'Deleted payment edited' using errcode='XX000';
 exception when raise_exception then if sqlerrm<>'PAYMENT_ALREADY_DELETED' then raise; end if; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(1))::text,true);
select public.update_financial_payment_atomic(public.test_id(413),5,'2026-11-06','Transferencia','QA-SUPPLIER-PARTIAL',public.test_id(412));
reset role;
do $$ begin
 if (select status from public.accounts_payable where id=public.test_id(502))<>'partially_paid' then raise exception 'Supplier partial state wrong'; end if;
end $$;
set local role authenticated;
select public.update_financial_payment_atomic(public.test_id(413),12,'2026-11-06','Transferencia','QA-SUPPLIER-FULL',public.test_id(412));
reset role;
do $$ begin
 if (select status from public.accounts_payable where id=public.test_id(502))<>'paid' or
    (select status from public.supplier_purchases where id=public.test_id(501))<>'paid' then raise exception 'Supplier full state wrong'; end if;
end $$;
set local role authenticated;
select public.delete_financial_payment_atomic(public.test_id(413));
reset role;
do $$ begin
 if (select status from public.accounts_payable where id=public.test_id(502))<>'pending' or
    (select status from public.supplier_purchases where id=public.test_id(501))<>'pending' then raise exception 'Supplier reversal state wrong'; end if;
end $$;
-- Edit a partial fine payment to full, reduce it, then reverse it.
set local role authenticated;
select public.update_financial_payment_atomic(public.test_id(603),12,'2026-11-06','Transferencia','QA-FINE-FULL',public.test_id(602));
reset role;
do $$ begin
 if not exists(select 1 from public.multas where id=public.test_id(601) and status='pagada' and fecha_pago is not null)
    or not exists(select 1 from public.financial_record_links where source_financial_record_id=public.test_id(603) and amount_applied=12)
 then raise exception 'Fine full state or applied amount wrong'; end if;
end $$;
set local role authenticated;
select public.update_financial_payment_atomic(public.test_id(603),5,'2026-11-06','Transferencia','QA-FINE-PARTIAL',public.test_id(602));
reset role;
do $$ begin
 if not exists(select 1 from public.multas where id=public.test_id(601) and status='pendiente' and fecha_pago is null)
    or not exists(select 1 from public.financial_record_links where source_financial_record_id=public.test_id(603) and amount_applied=5)
 then raise exception 'Fine partial state or applied amount wrong'; end if;
end $$;
set local role authenticated;
select public.delete_financial_payment_atomic(public.test_id(603));
reset role;
do $$ begin
 if not exists(select 1 from public.multas where id=public.test_id(601) and status='pendiente' and fecha_pago is null)
    or exists(select 1 from public.financial_record_links l join public.financial_records f on f.id=l.source_financial_record_id
      where l.target_financial_record_id=public.test_id(602) and f.is_deleted=false)
 then raise exception 'Fine reversal did not restore the outstanding balance'; end if;
end $$;
do $$ begin
 if not (select is_deleted from public.financial_records where id=public.test_id(402)) then raise exception 'Delete failed'; end if;
 if not (select is_deleted from public.financial_records where id=public.test_id(409)) then raise exception 'Refund delete failed'; end if;
 if (select coalesce(sum(l.amount_applied),0) from public.financial_record_links l join public.financial_records f on f.id=l.source_financial_record_id where l.target_financial_record_id=public.test_id(408) and f.is_deleted=false)<>2 then raise exception 'Refund reversal did not restore availability'; end if;

 if exists(select 1 from fleetease_private.payment_edit_authorizations) then raise exception 'Final capability leak'; end if;
 if has_schema_privilege('anon','fleetease_private','usage') then raise exception 'Private schema exposed to anon'; end if;
 if has_table_privilege('authenticated','fleetease_private.payment_edit_authorizations','insert,update,delete') then raise exception 'Capability writable by client'; end if;
 if has_function_privilege('anon','public.update_financial_payment_atomic(uuid,numeric,date,text,text,uuid)','execute') then raise exception 'Anon edit exposed'; end if;
 if has_function_privilege('anon','public.delete_financial_payment_atomic(uuid)','execute') then raise exception 'Anon delete exposed'; end if;
end $$;
select 'ATOMIC_PAYMENT_EDIT_PASS' as result;
rollback;
