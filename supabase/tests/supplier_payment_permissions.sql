begin;
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;
create function public.test_id(n int) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid $$;
create table public.users(id uuid primary key, company_id uuid, role text, is_deleted boolean default false);
create table public.financial_records(id uuid primary key, company_id uuid, type text, amount numeric, is_deleted boolean default false);
create table public.financial_record_links(id uuid primary key, company_id uuid, source_financial_record_id uuid, target_financial_record_id uuid, relationship_type text, amount_applied numeric);
create table public.supplier_purchases(id uuid primary key, company_id uuid, status text, is_deleted boolean default false, updated_at timestamptz);
create table public.accounts_payable(id uuid primary key, company_id uuid, source_financial_record_id uuid, party_type text, original_amount numeric, supplier_purchase_id uuid, status text, is_deleted boolean default false, updated_at timestamptz);
insert into public.users values (test_id(1),test_id(10),'admin',false),(test_id(2),test_id(10),'client',false),(test_id(3),test_id(10),'admin',true),(test_id(4),test_id(20),'admin',false);
insert into public.financial_records values (test_id(100),test_id(10),'expense',12,false),(test_id(101),test_id(10),'payment',4,false),(test_id(200),test_id(20),'expense',20,false);
insert into public.supplier_purchases values (test_id(300),test_id(10),'pending',false,null),(test_id(301),test_id(20),'pending',false,null);
insert into public.accounts_payable values (test_id(400),test_id(10),test_id(100),'supplier',12,test_id(300),'pending',false,null),(test_id(401),test_id(20),test_id(200),'supplier',20,test_id(301),'pending',false,null);
\ir fixtures/supplier_reconcile_20261106.sql
\ir ../migrations/20260923120000_reconcile_supplier_payable_on_payment_lifecycle.sql
revoke all on function public.reconcile_supplier_payable_status(uuid) from public,anon,authenticated;
grant select on public.users to authenticated;
grant select,insert,update,delete on public.financial_records,public.financial_record_links,public.supplier_purchases,public.accounts_payable to authenticated;
do $$ declare t text; begin foreach t in array array['financial_records','financial_record_links','supplier_purchases','accounts_payable'] loop
execute format('alter table public.%I enable row level security',t);
execute format('create policy tenant on public.%I to authenticated using (company_id=(select company_id from public.users where id=auth.uid())) with check (company_id=(select company_id from public.users where id=auth.uid()))',t);
end loop; end $$;
\ir ../migrations/20261116030412_scope_supplier_payable_reconciliation.sql
set local role authenticated;
select set_config('request.jwt.claim.sub',public.test_id(1)::text,true);
insert into public.financial_record_links values (test_id(500),test_id(10),test_id(101),test_id(100),'supplier_payment_to_financial_record',4);
do $$ begin
if (select status from public.accounts_payable where id=test_id(400)) <> 'partially_paid' then raise exception 'Partial payment missing'; end if;
if (select status from public.supplier_purchases where id=test_id(300)) <> 'partially_paid' then raise exception 'Purchase partial missing'; end if;
end $$;
update public.financial_records set amount=12 where id=test_id(101);
update public.financial_record_links set amount_applied=12 where id=test_id(500);
select public.reconcile_supplier_payable_status(test_id(100));
do $$ begin if (select status from public.accounts_payable where id=test_id(400)) <> 'paid' then raise exception 'Full payment missing'; end if; end $$;
update public.financial_records set is_deleted=true where id=test_id(101);
do $$ begin if (select status from public.accounts_payable where id=test_id(400)) <> 'pending' then raise exception 'Reversal missing'; end if; end $$;
do $$ begin
begin perform public.reconcile_supplier_payable_status(test_id(200)); raise exception 'Foreign target allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',public.test_id(2)::text,true);
do $$ begin begin perform public.reconcile_supplier_payable_status(test_id(100)); raise exception 'Client allowed'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub',public.test_id(3)::text,true);
do $$ begin begin perform public.reconcile_supplier_payable_status(test_id(100)); raise exception 'Deleted actor allowed'; exception when insufficient_privilege then null; end; end $$;
reset role;
do $$ begin
if has_function_privilege('anon','public.reconcile_supplier_payable_status(uuid)','execute') then raise exception 'Anon allowed'; end if;
if (select status from public.accounts_payable where id=test_id(401)) <> 'pending' then raise exception 'Foreign payable changed'; end if;
end $$;
select 'SUPPLIER_PAYMENT_PERMISSIONS_PASS' result;
rollback;
