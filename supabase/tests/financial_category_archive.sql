begin;
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;
create function public.test_id(n int) returns uuid language sql immutable as $$ select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid $$;
create table public.users(id uuid primary key,company_id uuid,role text,is_deleted boolean default false);
create table public.financial_categories(id uuid primary key,company_id uuid,is_default boolean default false,name text);
create table public.financial_records(id uuid primary key,category_id uuid references public.financial_categories(id),is_deleted boolean default false);
create function public.auth_user_company_id() returns uuid language sql stable security definer set search_path='' as $$ select company_id from public.users where id=auth.uid() $$;
create function public.auth_user_role() returns text language sql stable security definer set search_path='' as $$ select role from public.users where id=auth.uid() $$;
alter table public.financial_categories enable row level security;
create policy "Users can view financial categories" on public.financial_categories for select using(true);
create policy category_update on public.financial_categories for update using(company_id=public.auth_user_company_id()) with check(company_id=public.auth_user_company_id());
grant select,update on public.financial_categories to authenticated;
grant insert on public.financial_records to authenticated;
insert into public.users values
 (test_id(1),test_id(10),'admin',false),
 (test_id(2),test_id(10),'editor',false),
 (test_id(3),test_id(10),'admin',true),
 (test_id(4),test_id(20),'admin',false),
 (test_id(5),test_id(10),'super_admin',false);
insert into public.financial_categories values
 (test_id(100),test_id(10),false,'Own category'),
 (test_id(101),test_id(10),true,'System category'),
 (test_id(102),null,false,'Global category'),
 (test_id(103),test_id(10),false,'Used category'),
 (test_id(104),test_id(10),false,'Historical category'),
 (test_id(200),test_id(20),false,'Foreign category');
insert into public.financial_records values(test_id(1000),test_id(103),false),(test_id(1001),test_id(104),true);
\ir ../migrations/20261120163445_financial_category_soft_delete.sql
set local role authenticated;
select set_config('request.jwt.claim.sub',test_id(2)::text,true);
do $$ begin
 begin perform archive_financial_category(test_id(100),test_id(10)); raise exception 'Editor archive allowed'; exception when insufficient_privilege then null; end;
 begin update financial_categories set is_deleted=true where id=test_id(100); raise exception 'Direct editor archive allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',test_id(1)::text,true);
do $$ begin
 begin perform archive_financial_category(test_id(200),test_id(20)); raise exception 'Foreign company allowed'; exception when insufficient_privilege then null; end;
 if archive_financial_category(test_id(200),test_id(10))<>0 then raise exception 'Foreign id changed'; end if;
 if archive_financial_category(test_id(999),test_id(10))<>0 then raise exception 'Missing id changed'; end if;
 begin perform archive_financial_category(test_id(101),test_id(10)); raise exception 'Default category archived'; exception when insufficient_privilege then null; end;
 if archive_financial_category(test_id(102),test_id(10))<>0 then raise exception 'Global category archived'; end if;
 begin perform archive_financial_category(test_id(103),test_id(10)); raise exception 'Used category archived'; exception when foreign_key_violation then null; end;
 begin perform archive_financial_category(test_id(104),test_id(10)); raise exception 'Historical category archived'; exception when foreign_key_violation then null; end;
 if archive_financial_category(test_id(100),test_id(10))<>1 then raise exception 'Own category not archived'; end if;
 if archive_financial_category(test_id(100),test_id(10))<>0 then raise exception 'Repeated archive changed row'; end if;
 if exists(select 1 from financial_categories where id=test_id(100)) then raise exception 'Archived category visible'; end if;
 begin insert into financial_records values(test_id(1002),test_id(100),false); raise exception 'Stale form reused archived category'; exception when foreign_key_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub',test_id(3)::text,true);
do $$ begin begin perform archive_financial_category(test_id(100),test_id(10)); raise exception 'Deleted actor allowed'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub',test_id(4)::text,true);
do $$ begin if archive_financial_category(test_id(200),test_id(20))<>1 then raise exception 'Company B own archive failed'; end if; end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin begin perform archive_financial_category(test_id(100),test_id(10)); raise exception 'Missing actor allowed'; exception when insufficient_privilege then null; end; end $$;
reset role;
do $$ begin
 if not exists(select 1 from financial_categories where id=test_id(100) and is_deleted) then raise exception 'Category was physically deleted'; end if;
 if (select count(*) from financial_records)<>2 then raise exception 'Historical records changed'; end if;
 if has_function_privilege('anon','public.archive_financial_category(uuid,uuid)','execute') then raise exception 'Anon archive allowed'; end if;
end $$;
rollback;
