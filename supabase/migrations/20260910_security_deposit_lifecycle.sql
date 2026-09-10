-- Security deposit lifecycle: separate client debt from retained deposits.
update public.financial_categories
set affects = 'security_deposit'::public.balance_affects
where lower(trim(name)) = 'depósito en garantía' and company_id is null;

insert into public.financial_categories (name, type, affects, description, is_default, company_id, category)
select 'Devolución de Depósito', 'expense'::public.financial_record_type, 'none'::public.balance_affects,
       'Devolución de dinero retenido como depósito en garantía al cliente.', true, null, 'Devolución de Depósito'
where not exists (
  select 1 from public.financial_categories
  where lower(trim(name)) = 'devolución de depósito' and company_id is null
);

alter table public.financial_record_links add column if not exists amount_applied numeric(14,2);
update public.financial_record_links l
set amount_applied = fr.amount
from public.financial_records fr
where fr.id = l.source_financial_record_id and l.amount_applied is null;
alter table public.financial_record_links alter column amount_applied set default 0;
alter table public.financial_record_links alter column amount_applied set not null;

-- The production definition is maintained here so partial applications can be audited precisely.
create or replace function public.create_financial_payment(
  p_company_id uuid, p_payment_kind text, p_amount numeric,
  p_payment_date date default null, p_payment_method text default null,
  p_reference text default null, p_client_id uuid default null,
  p_partner_id uuid default null, p_supplier_id uuid default null,
  p_target_financial_record_id uuid default null, p_credit_id uuid default null,
  p_credit_payment_schedule_id uuid default null, p_created_by uuid default null
) returns public.financial_records
language plpgsql set search_path=public as $$
declare v_payment public.financial_records; v_target public.financial_records; v_applied numeric(14,2); v_outstanding numeric(14,2); v_category_id uuid; v_category_name text; v_expected_target_type text;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'El monto del pago debe ser mayor que cero'; end if;
  if p_payment_kind not in ('client_payment','partner_payment','supplier_payment','credit_payment') then raise exception 'Tipo de pago no válido: %',p_payment_kind; end if;
  if p_payment_kind='client_payment' and p_client_id is null then raise exception 'Un Pago de Cliente requiere seleccionar un cliente'; end if;
  if p_payment_kind='client_payment' and p_target_financial_record_id is null then raise exception 'Un Pago de Cliente requiere seleccionar el folio/cargo pendiente que está liquidando'; end if;
  if p_target_financial_record_id is not null then
    v_expected_target_type := case when p_payment_kind='partner_payment' then 'expense' else 'income' end;
    select * into v_target from public.financial_records where id=p_target_financial_record_id and company_id=p_company_id and is_deleted=false for update;
    if not found then raise exception 'El cargo financiero indicado no existe o no pertenece a la empresa'; end if;
    if v_target.type::text <> v_expected_target_type then raise exception 'El registro seleccionado no corresponde al tipo de obligación del pago'; end if;
    if p_payment_kind='client_payment' and v_target.client_id is distinct from p_client_id then raise exception 'El folio seleccionado no pertenece al cliente indicado'; end if;
    select coalesce(sum(coalesce(l.amount_applied,fr.amount)),0) into v_applied from public.financial_record_links l join public.financial_records fr on fr.id=l.source_financial_record_id where l.target_financial_record_id=v_target.id and l.relationship_type=p_payment_kind||'_to_financial_record' and fr.is_deleted=false;
    v_outstanding := greatest(0,v_target.amount-v_applied);
    if v_outstanding<=0 then raise exception 'El folio seleccionado ya está liquidado'; end if;
    if p_amount>v_outstanding then raise exception 'El pago de % excede el saldo pendiente de %',p_amount,v_outstanding; end if;
  end if;
  select id,name into v_category_id,v_category_name from public.financial_categories where type::text='payment' and ((p_payment_kind='client_payment' and lower(trim(name)) in ('pago de cliente','pago cliente','abono de cliente')) or (p_payment_kind='partner_payment' and lower(trim(name)) in ('pago a socio','pago de socio','abono a socio')) or (p_payment_kind='supplier_payment' and lower(trim(name)) in ('pago a proveedor','pago de proveedor','abono a proveedor')) or (p_payment_kind='credit_payment' and lower(trim(name)) in ('pago de crédito','pago credito','pago de crédito semanal'))) order by case when company_id=p_company_id then 0 else 1 end,is_default desc nulls last,name asc limit 1;
  if v_category_id is null then raise exception 'No existe una categoría configurada para %',p_payment_kind; end if;
  insert into public.financial_records(company_id,type,category_id,category,amount,date,payment_method,description,reference_code,client_id,partner_id,credit_id,credit_payment,credit_payment_schedule_id,created_by,is_deleted)
  values(p_company_id,'payment',v_category_id,v_category_name,p_amount,coalesce(p_payment_date,current_date),p_payment_method,case when p_payment_kind='client_payment' then 'Pago de Cliente' else v_category_name end,p_reference,p_client_id,p_partner_id,p_credit_id,p_payment_kind='credit_payment',p_credit_payment_schedule_id,p_created_by,false) returning * into v_payment;
  insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
  select p_company_id,v_payment.id,p_target_financial_record_id,p_payment_kind||'_to_financial_record',p_amount,p_created_by where p_target_financial_record_id is not null;
  return v_payment;
end; $$;

create or replace function public.apply_security_deposit_payment(
  p_company_id uuid, p_client_id uuid, p_target_financial_record_id uuid, p_amount numeric,
  p_payment_date date default null, p_payment_method text default null, p_reference text default null, p_created_by uuid default null
) returns public.financial_records
language plpgsql set search_path=public as $$
declare v_role text; v_caller_company uuid; v_target public.financial_records; v_payment public.financial_records; v_category_id uuid; v_category_name text; v_applied numeric(14,2); v_outstanding numeric(14,2); v_remaining numeric(14,2); v_deposit public.financial_records; v_deposit_used numeric(14,2); v_deposit_available numeric(14,2); v_chunk numeric(14,2);
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_role:=public.auth_user_role(); v_caller_company:=public.auth_user_company_id();
  if v_role<>'super_admin' and p_company_id is distinct from v_caller_company then raise exception 'FINANCIAL_COMPANY_MISMATCH'; end if;
  if p_client_id is null then raise exception 'Selecciona un cliente'; end if;
  if p_target_financial_record_id is null then raise exception 'Selecciona el folio/cargo pendiente'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'El monto debe ser mayor que cero'; end if;
  select * into v_target from public.financial_records where id=p_target_financial_record_id and company_id=p_company_id and client_id=p_client_id and type='income' and is_deleted=false and category<>'Depósito en Garantía' for update;
  if not found then raise exception 'El folio seleccionado no existe, no pertenece al cliente o no es un cargo cobrable'; end if;
  select coalesce(sum(coalesce(l.amount_applied,fr.amount)),0) into v_applied from public.financial_record_links l join public.financial_records fr on fr.id=l.source_financial_record_id where l.target_financial_record_id=v_target.id and l.relationship_type='client_payment_to_financial_record' and fr.is_deleted=false;
  v_outstanding:=greatest(0,v_target.amount-v_applied);
  if v_outstanding<=0 then raise exception 'El folio seleccionado ya está liquidado'; end if;
  if p_amount>v_outstanding then raise exception 'El pago de % excede el saldo pendiente de %',p_amount,v_outstanding; end if;
  select id,name into v_category_id,v_category_name from public.financial_categories where type::text='payment' and lower(trim(name)) in ('pago de cliente','pago cliente','abono de cliente') order by case when company_id=p_company_id then 0 else 1 end,is_default desc nulls last,name asc limit 1;
  if v_category_id is null then raise exception 'No existe la categoría Pago de Cliente'; end if;
  v_remaining:=p_amount;
  for v_deposit in select * from public.financial_records where company_id=p_company_id and client_id=p_client_id and type='income' and category='Depósito en Garantía' and is_deleted=false order by date asc,created_at asc,id asc for update loop
    select coalesce(sum(coalesce(l.amount_applied,fr.amount)),0) into v_deposit_used from public.financial_record_links l join public.financial_records fr on fr.id=l.source_financial_record_id where l.target_financial_record_id=v_deposit.id and l.relationship_type in ('security_deposit_application','security_deposit_refund') and fr.is_deleted=false;
    v_deposit_available:=greatest(0,v_deposit.amount-v_deposit_used);
    if v_deposit_available>0 then v_remaining:=v_remaining-least(v_remaining,v_deposit_available); end if;
    exit when v_remaining<=0;
  end loop;
  if v_remaining>0 then raise exception 'El depósito en garantía disponible es insuficiente. Disponible: %',p_amount-v_remaining; end if;
  insert into public.financial_records(company_id,type,category_id,category,amount,date,payment_method,description,reference_code,client_id,created_by,is_deleted)
  values(p_company_id,'payment',v_category_id,v_category_name,p_amount,coalesce(p_payment_date,current_date),p_payment_method,'Pago de Cliente aplicado con Depósito en Garantía',p_reference,p_client_id,p_created_by,false) returning * into v_payment;
  insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by) values(p_company_id,v_payment.id,v_target.id,'client_payment_to_financial_record',p_amount,p_created_by);
  v_remaining:=p_amount;
  for v_deposit in select * from public.financial_records where company_id=p_company_id and client_id=p_client_id and type='income' and category='Depósito en Garantía' and is_deleted=false order by date asc,created_at asc,id asc for update loop
    select coalesce(sum(coalesce(l.amount_applied,fr.amount)),0) into v_deposit_used from public.financial_record_links l join public.financial_records fr on fr.id=l.source_financial_record_id where l.target_financial_record_id=v_deposit.id and l.relationship_type in ('security_deposit_application','security_deposit_refund') and fr.is_deleted=false;
    v_deposit_available:=greatest(0,v_deposit.amount-v_deposit_used);
    if v_deposit_available>0 and v_remaining>0 then
      v_chunk:=least(v_remaining,v_deposit_available);
      insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by) values(p_company_id,v_payment.id,v_deposit.id,'security_deposit_application',v_chunk,p_created_by);
      v_remaining:=v_remaining-v_chunk;
    end if;
    exit when v_remaining<=0;
  end loop;
  return v_payment;
end; $$;

create or replace function public.refund_security_deposit(
  p_company_id uuid, p_client_id uuid, p_amount numeric, p_payment_date date default null,
  p_payment_method text default null, p_reference text default null, p_created_by uuid default null
) returns public.financial_records
language plpgsql set search_path=public as $$
declare v_role text; v_caller_company uuid; v_refund public.financial_records; v_category_id uuid; v_category_name text; v_remaining numeric(14,2); v_deposit public.financial_records; v_deposit_used numeric(14,2); v_available numeric(14,2); v_chunk numeric(14,2);
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_role:=public.auth_user_role(); v_caller_company:=public.auth_user_company_id();
  if v_role<>'super_admin' and p_company_id is distinct from v_caller_company then raise exception 'FINANCIAL_COMPANY_MISMATCH'; end if;
  if p_client_id is null then raise exception 'Selecciona un cliente'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'El monto debe ser mayor que cero'; end if;
  select id,name into v_category_id,v_category_name from public.financial_categories where type::text='expense' and lower(trim(name))='devolución de depósito' order by case when company_id=p_company_id then 0 else 1 end,is_default desc nulls last,name asc limit 1;
  if v_category_id is null then raise exception 'No existe la categoría Devolución de Depósito'; end if;
  v_remaining:=p_amount;
  for v_deposit in select * from public.financial_records where company_id=p_company_id and client_id=p_client_id and type='income' and category='Depósito en Garantía' and is_deleted=false order by date asc,created_at asc,id asc for update loop
    select coalesce(sum(coalesce(l.amount_applied,fr.amount)),0) into v_deposit_used from public.financial_record_links l join public.financial_records fr on fr.id=l.source_financial_record_id where l.target_financial_record_id=v_deposit.id and l.relationship_type in ('security_deposit_application','security_deposit_refund') and fr.is_deleted=false;
    v_available:=greatest(0,v_deposit.amount-v_deposit_used);
    if v_available>0 then v_remaining:=v_remaining-least(v_remaining,v_available); end if;
    exit when v_remaining<=0;
  end loop;
  if v_remaining>0 then raise exception 'El depósito disponible para devolución es insuficiente. Disponible: %',p_amount-v_remaining; end if;
  insert into public.financial_records(company_id,type,category_id,category,amount,date,payment_method,description,reference_code,client_id,created_by,is_deleted)
  values(p_company_id,'expense',v_category_id,v_category_name,p_amount,coalesce(p_payment_date,current_date),p_payment_method,'Devolución de Depósito en Garantía',p_reference,p_client_id,p_created_by,false) returning * into v_refund;
  v_remaining:=p_amount;
  for v_deposit in select * from public.financial_records where company_id=p_company_id and client_id=p_client_id and type='income' and category='Depósito en Garantía' and is_deleted=false order by date asc,created_at asc,id asc for update loop
    select coalesce(sum(coalesce(l.amount_applied,fr.amount)),0) into v_deposit_used from public.financial_record_links l join public.financial_records fr on fr.id=l.source_financial_record_id where l.target_financial_record_id=v_deposit.id and l.relationship_type in ('security_deposit_application','security_deposit_refund') and fr.is_deleted=false;
    v_available:=greatest(0,v_deposit.amount-v_deposit_used);
    if v_available>0 and v_remaining>0 then
      v_chunk:=least(v_remaining,v_available);
      insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by) values(p_company_id,v_refund.id,v_deposit.id,'security_deposit_refund',v_chunk,p_created_by);
      v_remaining:=v_remaining-v_chunk;
    end if;
    exit when v_remaining<=0;
  end loop;
  return v_refund;
end; $$;

revoke execute on function public.apply_security_deposit_payment(uuid,uuid,uuid,numeric,date,text,text,uuid) from public;
revoke execute on function public.refund_security_deposit(uuid,uuid,numeric,date,text,text,uuid) from public;
grant execute on function public.apply_security_deposit_payment(uuid,uuid,uuid,numeric,date,text,text,uuid) to authenticated;
grant execute on function public.refund_security_deposit(uuid,uuid,numeric,date,text,text,uuid) to authenticated;
notify pgrst,'reload schema';