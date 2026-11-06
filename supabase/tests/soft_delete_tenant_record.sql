begin;
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.users(id uuid primary key, company_id uuid, role text, is_deleted boolean default false);
create table public.financial_records(id uuid primary key, company_id uuid, is_deleted boolean default false,
 type text default 'income', credit_id uuid, credit_payment boolean default false, credit_granted boolean default false);
create table public.vehicles(id uuid primary key, company_id uuid, is_deleted boolean default false,
 client_id uuid, locked_by_credit boolean default false, associated_credit_id uuid);
create table public.clients(id uuid primary key, company_id uuid, assigned_vehicle_id uuid, is_deleted boolean default false);
create table public.credits(id uuid primary key, company_id uuid, vehicle_id uuid, status text, is_deleted boolean default false);
create table public.vehicle_assignment_logs(id uuid primary key, company_id uuid, vehicle_id uuid, unassigned_at timestamptz);
insert into public.users values
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','admin',false),
('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','client',false),
('10000000-0000-0000-0000-000000000003',null,'super_admin',false),
('10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','admin',true);
insert into public.financial_records(id,company_id,is_deleted) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',false),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002',false);
insert into public.financial_records(id,company_id,type,credit_id,credit_payment,credit_granted) values
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','payment',null,false,false),
('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','income',null,false,true),
('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','expense','50000000-0000-0000-0000-000000000001',false,false),
('30000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000001','income',null,true,false);
insert into public.vehicles(id,company_id,is_deleted) values
('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',false);
insert into public.vehicles(id,company_id,client_id,locked_by_credit,associated_credit_id) values
('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',false,null),
('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001',null,true,null),
('40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001',null,false,'50000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001',null,false,null),
('40000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000001',null,false,null),
('40000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000001',null,false,null);
insert into public.vehicle_assignment_logs values('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005',null);
insert into public.credits values('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','active',false);
insert into public.clients values('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000007',false);
create function public.auth_user_company_id() returns uuid language sql stable security definer set search_path='' as $$
 select company_id from public.users where id=auth.uid() and is_deleted=false
$$;
create function public.auth_user_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.users where id=auth.uid() and is_deleted=false
$$;
alter table public.financial_records enable row level security;
alter table public.vehicles enable row level security;
grant select,update on public.financial_records,public.vehicles to authenticated;
create policy tenant_read on public.financial_records for select to authenticated using
(((company_id=public.auth_user_company_id()) and is_deleted=false) or public.auth_user_role()='super_admin');
create policy tenant_update on public.financial_records for update to authenticated using
(company_id=public.auth_user_company_id() or public.auth_user_role()='super_admin') with check
(company_id=public.auth_user_company_id() or public.auth_user_role()='super_admin');
create policy tenant_read on public.vehicles for select to authenticated using
(((company_id=public.auth_user_company_id()) and is_deleted=false) or public.auth_user_role()='super_admin');
create policy tenant_update on public.vehicles for update to authenticated using
(company_id=public.auth_user_company_id() or public.auth_user_role()='super_admin') with check
(company_id=public.auth_user_company_id() or public.auth_user_role()='super_admin');

\ir ../migrations/20261106165829_soft_delete_tenant_record_rpc.sql

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001"}',true);
do $$
declare n int; protected_id uuid;
begin
  for protected_id in select id from public.vehicles where company_id='20000000-0000-0000-0000-000000000001' and id<>'40000000-0000-0000-0000-000000000001' loop
    begin
      perform public.soft_delete_tenant_record('vehicles',protected_id,'20000000-0000-0000-0000-000000000001');
      raise exception 'Assigned or credit vehicle deleted';
    exception when insufficient_privilege then null; end;
    if not exists(select 1 from public.vehicles where id=protected_id and is_deleted=false) then raise exception 'Protected vehicle changed'; end if;
  end loop;
  for protected_id in select id from public.financial_records where company_id='20000000-0000-0000-0000-000000000001' and (type='payment' or credit_granted or credit_payment or credit_id is not null) loop
    begin
      perform public.soft_delete_tenant_record('financial_records',protected_id,'20000000-0000-0000-0000-000000000001');
      raise exception 'Specialized financial flow bypassed';
    exception when no_data_found then null; end;
    if not exists(select 1 from public.financial_records where id=protected_id and is_deleted=false) then raise exception 'Protected record changed'; end if;
  end loop;
  begin
    update public.financial_records set is_deleted=true where id='30000000-0000-0000-0000-000000000001';
    raise exception 'Direct UPDATE unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  n:=public.soft_delete_tenant_record('financial_records','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
  if n<>1 then raise exception 'Mutation not confirmed'; end if;
  if exists(select 1 from public.financial_records where id='30000000-0000-0000-0000-000000000001') then raise exception 'Deleted row exposed'; end if;
  begin
    perform public.soft_delete_tenant_record('financial_records','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
    raise exception 'Repeated delete reported success';
  exception when no_data_found then null; end;
  begin
    perform public.soft_delete_tenant_record('financial_records','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002');
    raise exception 'Foreign company accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.soft_delete_tenant_record('financial_records','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
    raise exception 'Foreign row ID accepted';
  exception when no_data_found then null; end;
  begin
    perform public.soft_delete_tenant_record('users','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
    raise exception 'Arbitrary table accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.soft_delete_tenant_record('vehicles','40000000-0000-0000-0000-000000000001',null);
    raise exception 'Null company accepted';
  exception when invalid_parameter_value then null; end;
  n:=public.soft_delete_tenant_record('vehicles','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
  if n<>1 then raise exception 'Vehicle mutation not confirmed'; end if;
end $$;

do $$
declare sub text;
begin
 foreach sub in array array[
   '10000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000005',
   ''
 ] loop
   perform set_config('request.jwt.claims',case when sub='' then '{}' else jsonb_build_object('sub',sub)::text end,true);
   begin
     perform public.soft_delete_tenant_record('financial_records','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
     raise exception 'Unauthorized identity accepted: %',sub;
   exception when insufficient_privilege then null; end;
 end loop;
end $$;

reset role;
do $$ begin
 if not exists(select 1 from public.financial_records where id='30000000-0000-0000-0000-000000000001' and is_deleted=true) then raise exception 'Own row was not soft deleted'; end if;
 if not exists(select 1 from public.vehicles where id='40000000-0000-0000-0000-000000000001' and is_deleted=true) then raise exception 'Vehicle was not soft deleted'; end if;
 if not exists(select 1 from public.financial_records where id='30000000-0000-0000-0000-000000000002' and is_deleted=false) then raise exception 'Foreign row changed'; end if;
 if has_function_privilege('anon','public.soft_delete_tenant_record(text,uuid,uuid)','execute') then raise exception 'Anonymous RPC access granted'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003"}',true);
do $$ begin
 if public.soft_delete_tenant_record('financial_records','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002')<>1 then raise exception 'Superadmin mutation failed'; end if;
end $$;
reset role;
rollback;
