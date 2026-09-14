create or replace function public.create_supplier_purchase(
  p_company_id uuid,
  p_supplier_id uuid,
  p_purchase_date date,
  p_total numeric,
  p_payment_method text,
  p_due_date date default null,
  p_reference text default null,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb,
  p_created_by uuid default null
) returns public.supplier_purchases
language plpgsql security invoker set search_path=public as $$
declare
  v_purchase public.supplier_purchases;
  v_record public.financial_records;
  v_category_id uuid;
  v_category_name text := 'Compra a Proveedor';
  v_status text;
  v_item jsonb;
  v_sum numeric(14,2);
begin
  if p_total is null or p_total <= 0 then raise exception 'El total de la compra debe ser mayor que cero'; end if;
  if p_payment_method not in ('cash','credit') then raise exception 'Forma de pago no válida'; end if;
  if p_payment_method = 'credit' and p_due_date is null then raise exception 'Una compra a crédito requiere fecha de vencimiento'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'La compra debe tener al menos una partida'; end if;

  select id into v_category_id from public.financial_categories where company_id=p_company_id and type='expense' and lower(trim(name))=lower(v_category_name) limit 1;
  if v_category_id is null then
    insert into public.financial_categories(company_id,name,type,affects)
    values(p_company_id,v_category_name,'expense','none') returning id into v_category_id;
  end if;

  v_sum := 0;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if nullif(trim(v_item->>'description'),'') is null then raise exception 'Cada partida requiere descripción'; end if;
    if coalesce((v_item->>'quantity')::numeric,0) <= 0 then raise exception 'La cantidad de cada partida debe ser mayor que cero'; end if;
    if coalesce((v_item->>'unit_price')::numeric,0) < 0 then raise exception 'El precio unitario no puede ser negativo'; end if;
    v_sum := v_sum + round((v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric,2);
  end loop;
  if abs(v_sum - p_total) > 0.01 then raise exception 'El total de las partidas (%) no coincide con el total de la compra (%)',v_sum,p_total; end if;

  v_status := case when p_payment_method='credit' then 'pending' else 'paid' end;

  insert into public.financial_records(company_id,type,category_id,category,amount,payment_method,description,date,reference_code,notes,supplier_id,items,record_origin,created_by,is_deleted,is_pending)
  values(p_company_id,'expense',v_category_id,v_category_name,p_total,p_payment_method,'Compra a proveedor',coalesce(p_purchase_date,current_date),nullif(p_reference,''),p_notes,p_supplier_id,p_items,'supplier_purchase',p_created_by,false,p_payment_method='credit')
  returning * into v_record;

  insert into public.supplier_purchases(company_id,supplier_id,financial_record_id,purchase_date,reference,payment_method,status,due_date,total,notes,created_by)
  values(p_company_id,p_supplier_id,v_record.id,coalesce(p_purchase_date,current_date),nullif(p_reference,''),p_payment_method,v_status,p_due_date,p_total,p_notes,p_created_by)
  returning * into v_purchase;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.supplier_purchase_items(purchase_id,catalog_item_id,description,quantity,unit_price)
    values(v_purchase.id,nullif(v_item->>'catalog_item_id','')::uuid,trim(v_item->>'description'),(v_item->>'quantity')::numeric,(v_item->>'unit_price')::numeric);
  end loop;

  if p_payment_method='credit' then
    insert into public.accounts_payable(company_id,party_type,party_id,source_financial_record_id,supplier_purchase_id,original_amount,due_date,status,notes,created_by)
    values(p_company_id,'supplier',p_supplier_id,v_record.id,v_purchase.id,p_total,p_due_date,'pending',p_notes,p_created_by);
  end if;

  return v_purchase;
end; $$;
