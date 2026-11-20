begin;
create role anon;
create role authenticated;
create schema auth;
create schema fleetease_private;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;
create function public.test_id(n int) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid $$;
create table public.users(id uuid primary key, company_id uuid, role text, is_deleted boolean default false);
create table public.credits(id uuid primary key, company_id uuid, status text, is_deleted boolean default false);
create table public.financial_records(id uuid primary key, company_id uuid, credit_id uuid, type text, credit_payment boolean, is_deleted boolean default false);
create table fleetease_private.credit_settlement_reversal_context(credit_id uuid primary key, company_id uuid, payment_id uuid);
alter table fleetease_private.credit_settlement_reversal_context enable row level security;
revoke all on fleetease_private.credit_settlement_reversal_context from public,anon,authenticated;
create function public.auth_user_company_id() returns uuid language sql stable security definer set search_path='' as $$ select company_id from public.users where id=auth.uid() $$;
insert into public.users values
 (test_id(1),test_id(10),'admin',false),
 (test_id(2),test_id(10),'editor',false),
 (test_id(3),test_id(10),'client',false),
 (test_id(4),test_id(10),'partner',false),
 (test_id(5),test_id(10),'admin',true),
 (test_id(6),test_id(20),'admin',false),
 (test_id(7),test_id(10),'super_admin',false);
insert into public.credits values
 (test_id(100),test_id(10),'completed',false),
 (test_id(101),test_id(10),'active',false),
 (test_id(102),test_id(10),'completed',true),
 (test_id(103),test_id(10),'completed',false),
 (test_id(104),test_id(10),'completed',false),
 (test_id(200),test_id(20),'completed',false);
insert into public.financial_records values
 (test_id(1000),test_id(10),test_id(100),'payment',true,false),
 (test_id(1001),test_id(10),test_id(100),'payment',true,false),
 (test_id(1002),test_id(10),test_id(101),'payment',true,false),
 (test_id(1003),test_id(10),test_id(102),'payment',true,false),
 (test_id(1004),test_id(10),test_id(103),'payment',true,true),
 (test_id(1005),test_id(10),test_id(104),'payment',true,false),
 (test_id(2000),test_id(20),test_id(200),'payment',true,false);
insert into fleetease_private.credit_settlement_reversal_context values
 (test_id(100),test_id(10),test_id(1000)),
 (test_id(101),test_id(10),test_id(1002)),
 (test_id(102),test_id(10),test_id(1003)),
 (test_id(103),test_id(10),test_id(1004)),
 (test_id(200),test_id(20),test_id(2000));
\ir ../migrations/20261120161115_credit_settlement_payment_lookup.sql
set local role authenticated;
select set_config('request.jwt.claim.sub',public.test_id(1)::text,true);
do $$ begin
 if (select count(*) from public.get_credit_settlement_payments(test_id(10))) <> 1 then raise exception 'Unexpected settlement count'; end if;
 if (select payment_id from public.get_credit_settlement_payments(test_id(10))) <> test_id(1000) then raise exception 'Wrong installment exposed'; end if;
 begin perform public.get_credit_settlement_payments(test_id(20)); raise exception 'Foreign company allowed'; exception when insufficient_privilege then null; end;
 begin perform public.get_credit_settlement_payments(null); raise exception 'Null company allowed'; exception when insufficient_privilege then null; end;
 begin perform * from fleetease_private.credit_settlement_reversal_context; raise exception 'Private context exposed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',public.test_id(2)::text,true);
do $$ begin if (select count(*) from public.get_credit_settlement_payments(test_id(10))) <> 1 then raise exception 'Editor cannot read identity'; end if; end $$;
select set_config('request.jwt.claim.sub',public.test_id(7)::text,true);
do $$ begin if (select count(*) from public.get_credit_settlement_payments(test_id(10))) <> 1 then raise exception 'Super admin cannot read own company'; end if; end $$;
select set_config('request.jwt.claim.sub',public.test_id(6)::text,true);
do $$ begin
 if (select payment_id from public.get_credit_settlement_payments(test_id(20))) <> test_id(2000) then raise exception 'Own company lookup failed'; end if;
 begin perform public.get_credit_settlement_payments(test_id(10)); raise exception 'Cross-tenant lookup allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',public.test_id(3)::text,true);
do $$ begin begin perform public.get_credit_settlement_payments(test_id(10)); raise exception 'Client allowed'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub',public.test_id(4)::text,true);
do $$ begin begin perform public.get_credit_settlement_payments(test_id(10)); raise exception 'Partner allowed'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub',public.test_id(5)::text,true);
do $$ begin begin perform public.get_credit_settlement_payments(test_id(10)); raise exception 'Deleted actor allowed'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin begin perform public.get_credit_settlement_payments(test_id(10)); raise exception 'Missing actor allowed'; exception when insufficient_privilege then null; end; end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.get_credit_settlement_payments(uuid)','execute') then raise exception 'Anon allowed'; end if;
end $$;
rollback;
