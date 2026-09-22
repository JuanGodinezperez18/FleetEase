-- FleetEase: edit/delete supplier purchases atomically.
-- Delete removes the payable and unlinks all supplier-purchase allocations.
-- Purchases with active supplier payments cannot be deleted until those payments are cancelled/deleted.

create or replace function public.update_supplier_purchase(
  p_company_id uuid, p_purchase_id uuid, p_supplier_id uuid, p_purchase_date date, p_total numeric,
  p_payment_method text, p_due_date date default null, p_reference text default null,
  p_notes text default null, p_items jsonb default '[]'::jsonb, p_created_by uuid default null
) returns public.supplier_purchases
language plpgsql security invoker set search_path=public as $$
declare
  v_purchase public.supplier_purchases; v_record public.financial_records;
  v_applied numeric(14,2); v_item jsonb; v_item_id uuid; v_sum numeric(14,2):=0;
  v_existing_ids uuid[]; v_incoming_ids uuid[]; v_allocated numeric(14,2); v_status text;
begin
  if p_total is null or p_total<=0 then raise exception 'El total de la compra debe ser mayor que cero'; end if;
  if p_payment_method not in ('cash','transfer','card','credit') then raise exception 'Forma de pago no válida'; end if;
  if p_payment_method='credit' and p_due_date is null then raise exception 'Una compra a crédito requiere fecha de vencimiento'; end if;
  if p_payment_method<>'credit' and p_due_date is not null then raise exception 'La fecha de vencimiento solo aplica a compras a crédito'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'La compra debe tener al menos una partida'; end if;

  select * into v_purchase from public.supplier_purchases where id=p_purchase_id and company_id=p_company_id and is_deleted=false for update;
  if not found then raise exception 'La compra indicada no existe o no pertenece a la empresa'; end if;
  if v_purchase.financial_record_id is null then raise exception 'La compra no tiene registro financiero asociado'; end if;

  select * into v_record from public.financial_records where id=v_purchase.financial_record_id and company_id=p_company_id and is_deleted=false for update;
  if not found then raise exception 'El registro financiero de la compra no existe'; end if;

  select coalesce(sum(l.amount_applied),0) into v_applied
  from public.financial_record_links l
  join public.financial_records payment on payment.id=l.source_financial_record_id
  where l.target_financial_record_id=v_record.id and l.relationship_type='supplier_payment_to_financial_record'
    and payment.type='payment' and payment.is_deleted=false;

  if p_total+0.01<v_applied then raise exception 'El total no puede ser menor al monto ya pagado de %',v_applied; end if;
  if v_applied>0 and p_payment_method<>v_purchase.payment_method then raise exception 'No puedes cambiar la forma de pago de una compra que ya tiene pagos registrados'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if nullif(trim(v_item->>'description'),'') is null then raise exception 'Cada partida requiere descripción'; end if;
    if coalesce((v_item->>'quantity')::numeric,0)<=0 then raise exception 'La cantidad de cada partida debe ser mayor que cero'; end if;
    if coalesce((v_item->>'unit_price')::numeric,0)<0 then raise exception 'El precio unitario no puede ser negativo'; end if;
    v_sum:=v_sum+round((v_item->>'quantity')::numeric*(v_item->>'unit_price')::numeric,2);
  end loop;
  if abs(v_sum-p_total)>0.01 then raise exception 'El total de las partidas (%) no coincide con el total de la compra (%)',v_sum,p_total; end if;

  select coalesce(array_agg(id),'{}'::uuid[]) into v_existing_ids from public.supplier_purchase_items where purchase_id=p_purchase_id;
  select coalesce(array_agg(nullif(value->>'id','')::uuid) filter (where nullif(value->>'id','') is not null),'{}'::uuid[])
    into v_incoming_ids from jsonb_array_elements(p_items) as value;

  foreach v_item_id in array v_existing_ids loop
    if not (v_item_id=any(v_incoming_ids)) then
      select coalesce(sum(amount),0) into v_allocated from public.supplier_purchase_allocations where supplier_purchase_item_id=v_item_id;
      if v_allocated>0.01 then raise exception 'No puedes eliminar una partida que ya está vinculada a un gasto operativo'; end if;
      delete from public.supplier_purchase_items where id=v_item_id;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_item_id:=nullif(v_item->>'id','')::uuid;
    if v_item_id is not null then
      if not exists(select 1 from public.supplier_purchase_items where id=v_item_id and purchase_id=p_purchase_id) then raise exception 'Una partida indicada no pertenece a esta compra'; end if;
      select coalesce(sum(amount),0) into v_allocated from public.supplier_purchase_allocations where supplier_purchase_item_id=v_item_id;
      if round((v_item->>'quantity')::numeric*(v_item->>'unit_price')::numeric,2)+0.01<v_allocated then raise exception 'La partida % no puede quedar por debajo de lo ya vinculado al gasto operativo',v_item->>'description'; end if;
      update public.supplier_purchase_items set catalog_item_id=nullif(v_item->>'catalog_item_id','')::uuid,description=trim(v_item->>'description'),quantity=(v_item->>'quantity')::numeric,unit_price=(v_item->>'unit_price')::numeric where id=v_item_id;
    else
      insert into public.supplier_purchase_items(purchase_id,catalog_item_id,description,quantity,unit_price)
      values(p_purchase_id,nullif(v_item->>'catalog_item_id','')::uuid,trim(v_item->>'description'),(v_item->>'quantity')::numeric,(v_item->>'unit_price')::numeric);
    end if;
  end loop;

  v_status:=case when p_payment_method<>'credit' then 'paid' when v_applied>=p_total-0.01 then 'paid' when v_applied>0 then 'partially_paid' else 'pending' end;

  update public.supplier_purchases set supplier_id=p_supplier_id,purchase_date=coalesce(p_purchase_date,current_date),
    reference=nullif(p_reference,''),payment_method=p_payment_method,status=v_status,due_date=p_due_date,total=p_total,notes=p_notes,updated_at=now()
    where id=p_purchase_id;
  update public.financial_records set amount=p_total,payment_method=p_payment_method,
    date=coalesce(p_purchase_date,current_date),reference_code=nullif(p_reference,''),notes=p_notes,is_pending=(p_payment_method='credit'),updated_at=now()
    where id=v_record.id;

  if p_payment_method='credit' then
    update public.accounts_payable set party_id=p_supplier_id,original_amount=p_total,due_date=p_due_date,status=v_status,notes=p_notes,updated_at=now(),is_deleted=false
      where supplier_purchase_id=p_purchase_id and company_id=p_company_id;
    if not found then
      insert into public.accounts_payable(company_id,party_type,party_id,source_financial_record_id,supplier_purchase_id,original_amount,due_date,status,notes,created_by)
      values(p_company_id,'supplier',p_supplier_id,v_record.id,p_purchase_id,p_total,p_due_date,v_status,p_notes,p_created_by);
    end if;
  else
    update public.accounts_payable set is_deleted=true,updated_at=now() where supplier_purchase_id=p_purchase_id and company_id=p_company_id and is_deleted=false;
  end if;

  select * into v_purchase from public.supplier_purchases where id=p_purchase_id;
  return v_purchase;
end; $$;

revoke execute on function public.update_supplier_purchase(uuid,uuid,uuid,date,numeric,text,date,text,text,jsonb,uuid) from public,anon;
grant execute on function public.update_supplier_purchase(uuid,uuid,uuid,date,numeric,text,date,text,text,jsonb,uuid) to authenticated;

create or replace function public.delete_supplier_purchase(p_company_id uuid,p_purchase_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_purchase public.supplier_purchases; v_record_id uuid; v_payment_count integer;
begin
  select * into v_purchase from public.supplier_purchases where id=p_purchase_id and company_id=p_company_id and is_deleted=false for update;
  if not found then raise exception 'La compra indicada no existe o ya fue eliminada'; end if;
  v_record_id:=v_purchase.financial_record_id;

  select count(*) into v_payment_count
  from public.financial_record_links l join public.financial_records payment on payment.id=l.source_financial_record_id
  where l.target_financial_record_id=v_record_id and l.relationship_type='supplier_payment_to_financial_record'
    and payment.type='payment' and payment.is_deleted=false;
  if v_payment_count>0 then raise exception 'No puedes eliminar una compra que tiene pagos registrados. Cancela o elimina primero sus pagos desde Pagos.'; end if;

  delete from public.supplier_purchase_allocations where purchase_id=p_purchase_id;
  update public.accounts_payable set is_deleted=true,status='cancelled',updated_at=now()
    where supplier_purchase_id=p_purchase_id and company_id=p_company_id and is_deleted=false;
  update public.supplier_purchases set is_deleted=true,status='cancelled',updated_at=now() where id=p_purchase_id and company_id=p_company_id;
  if v_record_id is not null then update public.financial_records set is_deleted=true,is_pending=false,updated_at=now() where id=v_record_id and company_id=p_company_id; end if;

  return jsonb_build_object('purchase_id',p_purchase_id,'deleted',true,'unlinked_allocations',true);
end; $$;

revoke execute on function public.delete_supplier_purchase(uuid,uuid) from public,anon;
grant execute on function public.delete_supplier_purchase(uuid,uuid) to authenticated;
