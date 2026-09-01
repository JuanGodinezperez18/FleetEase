begin;

alter table public.clients add column if not exists reference_code text;
alter table public.clients add column if not exists written_off_amount numeric not null default 0;
alter table public.clients add column if not exists write_off_reason text;
alter table public.clients add column if not exists written_off_at timestamptz;
alter table public.clients add column if not exists written_off_by uuid;
alter table public.credits add column if not exists reference_code text;
alter table public.financial_records add column if not exists reference_code text;
alter table public.financial_records add column if not exists source_record_id uuid;
alter table public.financial_records add column if not exists source_record_type text;
alter table public.financial_records add column if not exists related_record_id uuid;
alter table public.financial_records add column if not exists related_record_type text;

create unique index if not exists clients_company_reference_code_uidx on public.clients(company_id, reference_code) where reference_code is not null;
create unique index if not exists credits_company_reference_code_uidx on public.credits(company_id, reference_code) where reference_code is not null;
create unique index if not exists financial_records_company_reference_code_uidx on public.financial_records(company_id, reference_code) where reference_code is not null;

create or replace function public.next_fleetease_reference_code(p_company_id uuid,p_prefix text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_next bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(coalesce(p_company_id::text,'global')||':'||upper(p_prefix),0));
 select coalesce(max(substring(reference_code from '[0-9]+$')::bigint),0)+1 into v_next from (
   select reference_code from public.clients where company_id is not distinct from p_company_id and reference_code like upper(p_prefix)||'-%'
   union all select reference_code from public.credits where company_id is not distinct from p_company_id and reference_code like upper(p_prefix)||'-%'
   union all select reference_code from public.financial_records where company_id is not distinct from p_company_id and reference_code like upper(p_prefix)||'-%'
 ) s where reference_code ~ ('^'||upper(p_prefix)||'-[0-9]+$');
 return upper(p_prefix)||'-'||lpad(v_next::text,7,'0');
end; $$;

create or replace function public.assign_fleetease_reference_code()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.reference_code is null or btrim(new.reference_code)='' then
   new.reference_code:=public.next_fleetease_reference_code(new.company_id,case tg_table_name when 'clients' then 'CLI' when 'credits' then 'CRE' when 'financial_records' then 'FIN' else 'REC' end);
 end if;
 return new;
end; $$;

drop trigger if exists clients_assign_fleetease_reference_code on public.clients;
create trigger clients_assign_fleetease_reference_code before insert on public.clients for each row execute function public.assign_fleetease_reference_code();
drop trigger if exists credits_assign_fleetease_reference_code on public.credits;
create trigger credits_assign_fleetease_reference_code before insert on public.credits for each row execute function public.assign_fleetease_reference_code();
drop trigger if exists financial_records_assign_fleetease_reference_code on public.financial_records;
create trigger financial_records_assign_fleetease_reference_code before insert on public.financial_records for each row execute function public.assign_fleetease_reference_code();

update public.clients set reference_code=public.next_fleetease_reference_code(company_id,'CLI') where reference_code is null;
update public.credits set reference_code=public.next_fleetease_reference_code(company_id,'CRE') where reference_code is null;
update public.financial_records set reference_code=public.next_fleetease_reference_code(company_id,'FIN') where reference_code is null;

create table if not exists public.record_audit_log(id uuid primary key default gen_random_uuid(),company_id uuid,entity_type text not null,entity_id uuid not null,entity_reference_code text,action text not null,actor_user_id uuid,occurred_at timestamptz not null default now(),old_data jsonb,new_data jsonb,metadata jsonb not null default '{}'::jsonb);
create index if not exists record_audit_log_entity_idx on public.record_audit_log(company_id,entity_type,entity_id,occurred_at desc);
create index if not exists record_audit_log_reference_idx on public.record_audit_log(company_id,entity_reference_code);
alter table public.record_audit_log enable row level security;
drop policy if exists record_audit_log_company_select on public.record_audit_log;
create policy record_audit_log_company_select on public.record_audit_log for select to authenticated using(company_id=public.get_user_company_id() or public.is_user_admin());

create or replace function public.audit_business_record()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_company uuid; v_ref text; v_action text;
begin
 v_company:=coalesce(new.company_id,old.company_id); v_ref:=coalesce(new.reference_code,old.reference_code); v_action:=case when tg_op='INSERT' then 'CREATE' when tg_op='UPDATE' then 'UPDATE' else 'DELETE' end;
 insert into public.record_audit_log(company_id,entity_type,entity_id,entity_reference_code,action,actor_user_id,old_data,new_data,metadata) values(v_company,tg_table_name,coalesce(new.id,old.id),v_ref,v_action,auth.uid(),case when tg_op in('UPDATE','DELETE') then to_jsonb(old) end,case when tg_op in('INSERT','UPDATE') then to_jsonb(new) end,jsonb_build_object('trigger',tg_name));
 return coalesce(new,old);
end; $$;

drop trigger if exists clients_record_audit on public.clients; create trigger clients_record_audit after insert or update or delete on public.clients for each row execute function public.audit_business_record();
drop trigger if exists credits_record_audit on public.credits; create trigger credits_record_audit after insert or update or delete on public.credits for each row execute function public.audit_business_record();
drop trigger if exists financial_records_record_audit on public.financial_records; create trigger financial_records_record_audit after insert or update or delete on public.financial_records for each row execute function public.audit_business_record();
drop trigger if exists credit_payment_schedules_record_audit on public.credit_payment_schedules; create trigger credit_payment_schedules_record_audit after insert or update or delete on public.credit_payment_schedules for each row execute function public.audit_business_record();

create table if not exists public.financial_record_links(id uuid primary key default gen_random_uuid(),company_id uuid not null,source_financial_record_id uuid not null references public.financial_records(id),target_financial_record_id uuid not null references public.financial_records(id),relationship_type text not null,created_by uuid,created_at timestamptz not null default now(),unique(source_financial_record_id,target_financial_record_id,relationship_type),check(source_financial_record_id<>target_financial_record_id));
create index if not exists financial_record_links_source_idx on public.financial_record_links(source_financial_record_id);
create index if not exists financial_record_links_target_idx on public.financial_record_links(target_financial_record_id);
alter table public.financial_record_links enable row level security;
drop policy if exists financial_record_links_company_select on public.financial_record_links; create policy financial_record_links_company_select on public.financial_record_links for select to authenticated using(company_id=public.get_user_company_id() or public.is_user_admin());
drop policy if exists financial_record_links_company_insert on public.financial_record_links; create policy financial_record_links_company_insert on public.financial_record_links for insert to authenticated with check(company_id=public.get_user_company_id() or public.is_user_admin());

create or replace function public.link_financial_records(p_source_id uuid,p_target_id uuid,p_relationship_type text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; s_company uuid; t_company uuid;
begin
 select company_id into s_company from public.financial_records where id=p_source_id and not is_deleted;
 select company_id into t_company from public.financial_records where id=p_target_id and not is_deleted;
 if s_company is null or t_company is null or s_company is distinct from t_company then raise exception 'Invalid financial record relationship'; end if;
 if not(s_company=public.get_user_company_id() or public.is_user_admin()) then raise exception 'Unauthorized'; end if;
 insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,created_by) values(s_company,p_source_id,p_target_id,p_relationship_type,auth.uid()) on conflict(source_financial_record_id,target_financial_record_id,relationship_type) do update set company_id=excluded.company_id returning id into v_id;
 insert into public.record_audit_log(company_id,entity_type,entity_id,action,actor_user_id,metadata) values(s_company,'financial_record_link',v_id,'LINK',auth.uid(),jsonb_build_object('source_record_id',p_source_id,'target_record_id',p_target_id,'relationship_type',p_relationship_type));
 return v_id;
end; $$;

create table if not exists public.client_write_offs(id uuid primary key default gen_random_uuid(),company_id uuid not null,client_id uuid not null references public.clients(id),amount numeric not null check(amount>0),financial_record_id uuid not null references public.financial_records(id),reason text not null,created_by uuid,created_at timestamptz not null default now(),reversed_at timestamptz,reversed_by uuid,reversal_reason text);
create index if not exists client_write_offs_client_idx on public.client_write_offs(company_id,client_id,created_at desc);
alter table public.client_write_offs enable row level security;
drop policy if exists client_write_offs_company_select on public.client_write_offs; create policy client_write_offs_company_select on public.client_write_offs for select to authenticated using(company_id=public.get_user_company_id() or public.is_user_admin());

create or replace function public.offboard_client_with_writeoff(p_client_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.clients%rowtype; v_amount numeric; v_cat uuid; v_fin uuid; v_wo uuid;
begin
 select * into c from public.clients where id=p_client_id for update;
 if not found then raise exception 'Client not found'; end if;
 if not(c.company_id=public.get_user_company_id() or public.is_user_admin()) then raise exception 'Unauthorized'; end if;
 if c.is_deleted then return jsonb_build_object('status','already_offboarded','client_id',c.id,'reference_code',c.reference_code); end if;
 v_amount:=greatest(coalesce(c.balance,0),0);
 if v_amount>0 then
   select id into v_cat from public.financial_categories where company_id=c.company_id and lower(name)=lower('Pérdida por incobrable') limit 1;
   if v_cat is null then insert into public.financial_categories(company_id,name,type,affects,description,is_default,category) values(c.company_id,'Pérdida por incobrable','expense','none','Baja de saldo incobrable de cliente',false,'Pérdida por incobrable') returning id into v_cat; end if;
   insert into public.financial_records(company_id,client_id,category_id,category,type,amount,description,date,is_deleted,created_by,notes,source_record_id,source_record_type) values(c.company_id,c.id,v_cat,'Pérdida por incobrable','expense',v_amount,'Baja de cliente: deuda incobrable',current_date,false,auth.uid(),p_reason,c.id,'client') returning id into v_fin;
   insert into public.client_write_offs(company_id,client_id,amount,financial_record_id,reason,created_by) values(c.company_id,c.id,v_amount,v_fin,p_reason,auth.uid()) returning id into v_wo;
 end if;
 update public.clients set status='inactive',is_deleted=true,written_off_amount=v_amount,write_off_reason=p_reason,written_off_at=now(),written_off_by=auth.uid(),updated_at=now() where id=c.id;
 return jsonb_build_object('status','offboarded','client_id',c.id,'client_reference_code',c.reference_code,'written_off_amount',v_amount,'financial_record_id',v_fin,'write_off_id',v_wo);
end; $$;

grant execute on function public.link_financial_records(uuid,uuid,text) to authenticated;
grant execute on function public.offboard_client_with_writeoff(uuid,text) to authenticated;
revoke execute on function public.link_financial_records(uuid,uuid,text) from public,anon;
revoke execute on function public.offboard_client_with_writeoff(uuid,text) from public,anon;
revoke execute on function public.assign_fleetease_reference_code() from public,anon,authenticated;
revoke execute on function public.audit_business_record() from public,anon,authenticated;
revoke execute on function public.next_fleetease_reference_code(uuid,text) from public,anon,authenticated;
revoke delete on public.clients,public.credits,public.financial_records,public.credit_payment_schedules from authenticated;

commit;