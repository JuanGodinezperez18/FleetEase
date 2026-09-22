-- Multas: charge client balance, exclude from company operating income, and allow partial payments.
insert into public.financial_categories (name,type,affects,description,is_default,company_id)
select 'Multa','income','client_balance','Cargo de multa aplicado al saldo del cliente; no representa ingreso operativo cobrado.',true,null
where not exists (select 1 from public.financial_categories where lower(trim(name))='multa' and type='income' and affects='client_balance' and company_id is null);

insert into public.financial_categories (name,type,affects,description,is_default,company_id)
select 'Pago de Multa','payment','client_balance','Pago parcial o total aplicado a una multa pendiente del cliente.',true,null
where not exists (select 1 from public.financial_categories where lower(trim(name))='pago de multa' and type='payment' and affects='client_balance' and company_id is null);

create or replace function public.create_multa_atomic(p_record jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid := nullif(p_record->>'company_id','')::uuid;
  v_multa_id uuid; v_financial_id uuid; v_category_id uuid;
  v_total numeric := coalesce((p_record->>'total')::numeric,0);
  v_client_id uuid := nullif(p_record->>'client_id','')::uuid;
  v_vehicle_id uuid := nullif(p_record->>'vehicle_id','')::uuid;
  v_created_by uuid := coalesce(nullif(p_record->>'created_by','')::uuid,v_user_id);
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if v_company_id is null then raise exception 'INVALID_COMPANY' using errcode='42501'; end if;
  if v_total <= 0 then raise exception 'INVALID_AMOUNT' using errcode='22003'; end if;
  if not exists (select 1 from public.companies where id=v_company_id) then raise exception 'INVALID_COMPANY' using errcode='42501'; end if;
  if v_client_id is not null and not exists (select 1 from public.clients where id=v_client_id and company_id=v_company_id and is_deleted=false) then raise exception 'INVALID_CLIENT' using errcode='23503'; end if;
  if v_vehicle_id is not null and not exists (select 1 from public.vehicles where id=v_vehicle_id and company_id=v_company_id and is_deleted=false) then raise exception 'INVALID_VEHICLE' using errcode='23503'; end if;

  select id into v_category_id from public.financial_categories
  where lower(trim(name))='multa' and type='income' and affects='client_balance'
    and (company_id=v_company_id or company_id is null)
  order by company_id nulls last limit 1;
  if v_category_id is null then raise exception 'MISSING_MULTA_CATEGORY'; end if;

  insert into public.multas(vehicle_id,client_id,folio,fecha_infraccion,direccion,descripcion,importe,recargos,total,status,fecha_pago,evidencia_urls,notas,asignado_automaticamente,assignment_date,company_id,created_by,is_deleted,created_at,updated_at)
  values(v_vehicle_id,v_client_id,nullif(p_record->>'folio',''),nullif(p_record->>'fecha_infraccion','')::date,nullif(p_record->>'direccion',''),nullif(p_record->>'descripcion',''),coalesce((p_record->>'importe')::numeric,0),coalesce((p_record->>'recargos')::numeric,0),v_total,coalesce(nullif(p_record->>'status',''),'pendiente')::multa_status,nullif(p_record->>'fecha_pago','')::date,case when jsonb_typeof(p_record->'evidencia_urls')='array' then array(select jsonb_array_elements_text(p_record->'evidencia_urls')) else null end,nullif(p_record->>'notas',''),coalesce((p_record->>'asignado_automaticamente')::boolean,false),nullif(p_record->>'assignment_date','')::timestamptz,v_company_id,v_created_by,false,now(),now())
  returning id into v_multa_id;

  if v_client_id is not null then
    insert into public.financial_records(company_id,client_id,vehicle_id,category_id,category,type,amount,date,description,is_pending,is_deleted,created_by,source_record_id,source_record_type,created_at,updated_at)
    values(v_company_id,v_client_id,v_vehicle_id,v_category_id,'Multa','income',v_total,coalesce(nullif(p_record->>'fecha_infraccion','')::date,current_date),'Multa: '||coalesce(nullif(p_record->>'descripcion',''),'Infracción')||case when nullif(p_record->>'folio','') is not null then ' (Folio: '||p_record->>'folio'||')' else '' end,true,false,v_created_by,v_multa_id,'multa',now(),now())
    returning id into v_financial_id;
  end if;
  return jsonb_build_object('multa_id',v_multa_id,'financial_record_id',v_financial_id,'status','pendiente');
end;
$$;
grant execute on function public.create_multa_atomic(jsonb) to authenticated;

-- Extend the existing payment RPC with multa_payment. This keeps partial-payment
-- reconciliation in financial_record_links and uses the dedicated Pago de Multa category.
create or replace function public.create_financial_payment(
  p_company_id uuid,p_payment_kind text,p_amount numeric,p_payment_date date,p_payment_method text default null,p_reference text default null,
  p_client_id uuid default null,p_partner_id uuid default null,p_supplier_id uuid default null,p_target_financial_record_id uuid default null,
  p_credit_id uuid default null,p_credit_payment_schedule_id uuid default null,p_created_by uuid default null)
returns public.financial_records language plpgsql set search_path=public as $$
declare
 v_payment public.financial_records; v_target public.financial_records; v_applied numeric(14,2); v_outstanding numeric(14,2);
 v_category_id uuid; v_category_name text; v_expected_target_type public.financial_record_type;
begin
 if p_amount is null or p_amount<=0 then raise exception 'El monto del pago debe ser mayor que cero'; end if;
 if p_payment_kind not in ('client_payment','multa_payment','partner_payment','supplier_payment','credit_payment') then raise exception 'Tipo de pago no válido: %',p_payment_kind; end if;
 if p_payment_kind in ('client_payment','multa_payment') and p_client_id is null then raise exception 'Un pago de cliente/multa requiere seleccionar un cliente'; end if;
 if p_payment_kind in ('client_payment','multa_payment') and p_target_financial_record_id is null then raise exception 'Debe seleccionar el cargo pendiente'; end if;
 if p_payment_kind='partner_payment' and p_partner_id is null then raise exception 'Un Pago a Socio requiere seleccionar un socio'; end if;
 if p_payment_kind='supplier_payment' and p_supplier_id is null then raise exception 'Un Pago a Proveedor requiere seleccionar un proveedor'; end if;
 if p_payment_kind='partner_payment' and p_target_financial_record_id is not null then raise exception 'Los pagos a socios se aplican al balance del socio'; end if;

 if p_target_financial_record_id is not null then
   v_expected_target_type := case when p_payment_kind in ('partner_payment','supplier_payment') then 'expense'::public.financial_record_type else 'income'::public.financial_record_type end;
   select * into v_target from public.financial_records where id=p_target_financial_record_id and company_id=p_company_id and is_deleted=false for update;
   if not found then raise exception 'El cargo financiero indicado no existe o no pertenece a la empresa'; end if;
   if v_target.type<>v_expected_target_type then raise exception 'El registro seleccionado no corresponde al tipo de obligación del pago'; end if;
   if p_payment_kind in ('client_payment','multa_payment') and v_target.client_id is distinct from p_client_id then raise exception 'El cargo seleccionado no pertenece al cliente indicado'; end if;
   if p_payment_kind='multa_payment' and (v_target.source_record_type is distinct from 'multa' or v_target.source_record_id is null) then raise exception 'El registro seleccionado no corresponde a una multa'; end if;
   select coalesce(sum(coalesce(l.amount_applied,fr.amount)),0) into v_applied
   from public.financial_record_links l join public.financial_records fr on fr.id=l.source_financial_record_id
   where l.target_financial_record_id=v_target.id and l.relationship_type=p_payment_kind||'_to_financial_record' and fr.is_deleted=false;
   v_outstanding:=greatest(0,v_target.amount-v_applied);
   if v_outstanding<=0 then raise exception 'El folio seleccionado ya está liquidado'; end if;
   if p_amount>v_outstanding then raise exception 'El pago excede el saldo pendiente de %',v_outstanding; end if;
 end if;

 select fc.id,fc.name into v_category_id,v_category_name from public.financial_categories fc
 where fc.type::text='payment' and (
   (p_payment_kind='client_payment' and fc.affects::text='client_balance' and lower(trim(fc.name))<>'pago de multa') or
   (p_payment_kind='multa_payment' and lower(trim(fc.name))='pago de multa' and fc.affects::text='client_balance') or
   (p_payment_kind='partner_payment' and fc.affects::text='partner_balance') or
   (p_payment_kind='credit_payment' and fc.affects::text='credit_payment') or
   (p_payment_kind='supplier_payment' and lower(trim(fc.name)) in ('pago a proveedor','pago de proveedor','abono a proveedor')))
 order by case when fc.company_id=p_company_id then 0 else 1 end,fc.is_default desc nulls last,fc.name asc limit 1;
 if v_category_id is null then raise exception 'No existe una categoría configurada para %',p_payment_kind; end if;

 insert into public.financial_records(company_id,type,category_id,category,amount,date,payment_method,description,reference_code,client_id,partner_id,credit_id,credit_payment,credit_payment_schedule_id,created_by,is_deleted)
 values(p_company_id,'payment',v_category_id,v_category_name,p_amount,coalesce(p_payment_date,current_date),p_payment_method,
 case when p_payment_kind='multa_payment' then 'Pago de Multa' when p_payment_kind='client_payment' then 'Pago de Cliente' else v_category_name end,
 p_reference,p_client_id,p_partner_id,p_credit_id,p_payment_kind='credit_payment',p_credit_payment_schedule_id,p_created_by,false)
 returning * into v_payment;

 if p_target_financial_record_id is not null then
   insert into public.financial_record_links(company_id,source_financial_record_id,target_financial_record_id,relationship_type,amount_applied,created_by)
   values(p_company_id,v_payment.id,p_target_financial_record_id,p_payment_kind||'_to_financial_record',p_amount,p_created_by);
 end if;

 if p_payment_kind='multa_payment' and v_target.source_record_id is not null and v_outstanding-p_amount<=0.009 then
   update public.multas set status='pagada',fecha_pago=coalesce(p_payment_date,current_date),updated_at=now()
   where id=v_target.source_record_id and company_id=p_company_id and is_deleted=false;
 end if;
 return v_payment;
end;
$$;
grant execute on function public.create_financial_payment(uuid,text,numeric,date,text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.process_multa_payment_atomic(
 p_multa_id uuid,p_client_id uuid,p_vehicle_id uuid,p_company_id uuid,p_amount numeric,p_date date,p_payment_method text,p_description text,p_created_by uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_target public.financial_records; v_payment public.financial_records; v_outstanding numeric;
begin
 select * into v_target from public.financial_records where company_id=p_company_id and client_id=coalesce(p_client_id,client_id) and source_record_id=p_multa_id and source_record_type='multa' and type='income' and is_deleted=false for update;
 if not found then raise exception 'Cargo financiero de la multa no encontrado'; end if;
 select greatest(0,v_target.amount-coalesce(sum(case when fr.is_deleted then 0 else l.amount_applied end),0)) into v_outstanding
 from public.financial_record_links l left join public.financial_records fr on fr.id=l.source_financial_record_id
 where l.target_financial_record_id=v_target.id and l.relationship_type='multa_payment_to_financial_record';
 if p_amount is null or p_amount<=0 or p_amount>v_outstanding+0.009 then raise exception 'El pago excede el saldo pendiente de la multa: %',v_outstanding; end if;
 select public.create_financial_payment(p_company_id,'multa_payment',p_amount,p_date,p_payment_method,nullif(p_description,''),coalesce(p_client_id,v_target.client_id),null,null,v_target.id,null,null,p_created_by) into v_payment;
 return jsonb_build_object('multa_id',p_multa_id,'financial_record_id',v_payment.id,'amount',p_amount,'outstanding_before',v_outstanding,'outstanding_after',greatest(0,v_outstanding-p_amount),'status',case when v_outstanding-p_amount<=0.009 then 'pagada' else 'pendiente' end);
end;
$$;
grant execute on function public.process_multa_payment_atomic(uuid,uuid,uuid,uuid,numeric,date,text,text,uuid) to authenticated;


create or replace function public.sync_multa_status_from_payment()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_target_id uuid; v_multa_id uuid; v_total numeric; v_paid numeric;
begin
 if new.type='payment' and lower(coalesce(new.category,''))='pago de multa' then
   select target_financial_record_id into v_target_id from public.financial_record_links
   where source_financial_record_id=new.id and relationship_type='multa_payment_to_financial_record'
   order by created_at desc limit 1;
   if v_target_id is not null then
     select source_record_id,amount into v_multa_id,v_total from public.financial_records where id=v_target_id and source_record_type='multa';
     if v_multa_id is not null then
       select coalesce(sum(l.amount_applied),0) into v_paid
       from public.financial_record_links l join public.financial_records p on p.id=l.source_financial_record_id
       where l.target_financial_record_id=v_target_id and l.relationship_type='multa_payment_to_financial_record' and p.is_deleted=false;
       update public.multas
       set status=case when v_paid>=v_total-0.009 then 'pagada'::multa_status else 'pendiente'::multa_status end,
           fecha_pago=case when v_paid>=v_total-0.009 then coalesce(fecha_pago,current_date) else null end,
           updated_at=now()
       where id=v_multa_id and is_deleted=false;
     end if;
   end if;
 end if;
 return new;
end;
$$;

drop trigger if exists trg_sync_multa_status_from_payment on public.financial_records;
create trigger trg_sync_multa_status_from_payment
after update of amount,is_deleted on public.financial_records
for each row execute function public.sync_multa_status_from_payment();
