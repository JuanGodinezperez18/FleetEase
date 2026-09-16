-- FleetEase: vinculación exacta entre compras de proveedores y líneas de gastos de vehículo.
-- No modifica la estructura existente de gastos: las líneas siguen viviendo en financial_records.items.
-- Los IDs de línea se agregan automáticamente para conservar compatibilidad con gastos existentes.

create or replace function public.ensure_expense_item_ids()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_items jsonb;
begin
  if new.items is null or jsonb_typeof(new.items) <> 'array' then
    return new;
  end if;

  select coalesce(jsonb_agg(
    case
      when jsonb_typeof(item) = 'object'
       and nullif(trim(item->>'id'), '') is null
      then jsonb_set(item, '{id}', to_jsonb(gen_random_uuid()::text), true)
      else item
    end
    order by ordinality
  ), '[]'::jsonb)
  into v_items
  from jsonb_array_elements(new.items) with ordinality as x(item, ordinality);

  new.items := v_items;
  return new;
end;
$$;

drop trigger if exists trg_financial_records_ensure_expense_item_ids on public.financial_records;
create trigger trg_financial_records_ensure_expense_item_ids
before insert or update of items on public.financial_records
for each row
when (new.type = 'expense')
execute function public.ensure_expense_item_ids();

-- Backfill legacy expense lines immediately. The trigger handles future writes.
update public.financial_records fr
set items = (
  select coalesce(jsonb_agg(
    case
      when jsonb_typeof(item) = 'object'
       and nullif(trim(item->>'id'), '') is null
      then jsonb_set(item, '{id}', to_jsonb(gen_random_uuid()::text), true)
      else item
    end
    order by ordinality
  ), '[]'::jsonb)
  from jsonb_array_elements(fr.items) with ordinality as x(item, ordinality)
)
where fr.type = 'expense'
  and fr.items is not null
  and jsonb_typeof(fr.items) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(fr.items) item
    where jsonb_typeof(item) = 'object'
      and nullif(trim(item->>'id'), '') is null
  );

alter table public.supplier_purchase_allocations
  add column if not exists supplier_purchase_item_id uuid references public.supplier_purchase_items(id) on delete cascade,
  add column if not exists expense_item_id text;

alter table public.supplier_purchase_allocations
  drop constraint if exists supplier_purchase_allocations_unique;

create unique index if not exists uq_supplier_purchase_allocations_exact_line
on public.supplier_purchase_allocations(purchase_id, supplier_purchase_item_id, financial_record_id, expense_item_id)
where supplier_purchase_item_id is not null and expense_item_id is not null;

create index if not exists idx_supplier_purchase_allocations_purchase_item
on public.supplier_purchase_allocations(supplier_purchase_item_id)
where supplier_purchase_item_id is not null;

create index if not exists idx_supplier_purchase_allocations_expense_item
on public.supplier_purchase_allocations(financial_record_id, expense_item_id)
where expense_item_id is not null;

-- New RPC: each purchase line is connected to an exact vehicle-expense line.
-- Legacy whole-record allocations remain readable and are considered occupied balance.
create or replace function public.allocate_supplier_purchase(
  p_company_id uuid,
  p_purchase_id uuid,
  p_allocations jsonb,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_purchase public.supplier_purchases;
  v_allocation jsonb;
  v_purchase_item public.supplier_purchase_items;
  v_record public.financial_records;
  v_expense_item jsonb;
  v_purchase_item_id uuid;
  v_financial_record_id uuid;
  v_expense_item_id text;
  v_requested numeric(14,2);
  v_purchase_item_total numeric(14,2);
  v_purchase_item_allocated numeric(14,2);
  v_purchase_remaining numeric(14,2);
  v_expense_item_total numeric(14,2);
  v_expense_item_allocated numeric(14,2);
  v_legacy_expense_allocated numeric(14,2);
  v_existing_purchase_allocated numeric(14,2);
  v_count integer := 0;
begin
  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' or jsonb_array_length(p_allocations) = 0 then
    raise exception 'Debes indicar al menos una asignación';
  end if;

  select * into v_purchase
  from public.supplier_purchases
  where id = p_purchase_id
    and company_id = p_company_id
    and is_deleted = false
  for update;

  if not found then
    raise exception 'La compra indicada no existe o no pertenece a la empresa';
  end if;

  select coalesce(sum(amount), 0) into v_existing_purchase_allocated
  from public.supplier_purchase_allocations
  where purchase_id = p_purchase_id;

  if v_existing_purchase_allocated > v_purchase.total + 0.01 then
    raise exception 'La compra ya tiene asignaciones que exceden su total';
  end if;

  for v_allocation in select * from jsonb_array_elements(p_allocations) loop
    v_purchase_item_id := nullif(v_allocation->>'supplier_purchase_item_id', '')::uuid;
    v_financial_record_id := nullif(v_allocation->>'financial_record_id', '')::uuid;
    v_expense_item_id := nullif(trim(v_allocation->>'expense_item_id'), '');
    v_requested := round(coalesce((v_allocation->>'amount')::numeric, 0), 2);

    if v_purchase_item_id is null or v_financial_record_id is null or v_expense_item_id is null then
      raise exception 'Cada asignación requiere partida de compra, gasto y línea exacta del gasto';
    end if;
    if v_requested <= 0 then
      raise exception 'El importe de cada asignación debe ser mayor que cero';
    end if;

    select * into v_purchase_item
    from public.supplier_purchase_items
    where id = v_purchase_item_id and purchase_id = p_purchase_id
    for update;

    if not found then
      raise exception 'La partida seleccionada no pertenece a esta compra';
    end if;

    v_purchase_item_total := round(v_purchase_item.total, 2);
    select coalesce(sum(amount), 0) into v_purchase_item_allocated
    from public.supplier_purchase_allocations
    where supplier_purchase_item_id = v_purchase_item_id;
    v_purchase_remaining := greatest(0, v_purchase_item_total - v_purchase_item_allocated);

    if v_requested > v_purchase_remaining + 0.01 then
      raise exception 'La asignación de % excede el saldo disponible de la partida de compra %', v_requested, v_purchase_item.description;
    end if;

    select * into v_record
    from public.financial_records
    where id = v_financial_record_id
      and company_id = p_company_id
      and type = 'expense'
      and is_deleted = false
      and vehicle_id is not null
    for update;

    if not found then
      raise exception 'El gasto seleccionado no existe, no pertenece a la empresa o no está asociado a un vehículo';
    end if;

    select item into v_expense_item
    from jsonb_array_elements(coalesce(v_record.items, '[]'::jsonb)) item
    where jsonb_typeof(item) = 'object'
      and item->>'id' = v_expense_item_id
    limit 1;

    if v_expense_item is null then
      raise exception 'La línea de gasto seleccionada ya no existe en el gasto de vehículo';
    end if;

    v_expense_item_total := round(coalesce((v_expense_item->>'amount')::numeric, 0), 2);
    if v_expense_item_total <= 0 then
      raise exception 'La línea de gasto seleccionada no tiene un importe válido';
    end if;

    -- Old allocations that target the whole financial record are treated as occupied.
    select coalesce(sum(amount), 0) into v_legacy_expense_allocated
    from public.supplier_purchase_allocations
    where financial_record_id = v_record.id
      and expense_item_id is null;

    if v_legacy_expense_allocated > 0 then
      raise exception 'El gasto seleccionado ya tiene una distribución anterior a nivel de gasto completo; no se puede mezclar con distribución por líneas';
    end if;

    select coalesce(sum(amount), 0) into v_expense_item_allocated
    from public.supplier_purchase_allocations
    where financial_record_id = v_record.id
      and expense_item_id = v_expense_item_id;

    if v_expense_item_allocated + v_requested > v_expense_item_total + 0.01 then
      raise exception 'La asignación de % excede el importe disponible de la línea %', v_requested, coalesce(v_expense_item->>'concept', v_expense_item->>'description', 'gasto');
    end if;

    insert into public.supplier_purchase_allocations(
      company_id, purchase_id, supplier_purchase_item_id, financial_record_id, expense_item_id, amount, notes, created_by
    ) values (
      p_company_id, p_purchase_id, v_purchase_item_id, v_record.id, v_expense_item_id, v_requested,
      nullif(trim(v_allocation->>'notes'), ''), p_created_by
    );

    v_existing_purchase_allocated := v_existing_purchase_allocated + v_requested;
    v_count := v_count + 1;
  end loop;

  if v_existing_purchase_allocated > v_purchase.total + 0.01 then
    raise exception 'La suma de asignaciones excede el total de la compra';
  end if;

  return jsonb_build_object(
    'purchase_id', p_purchase_id,
    'allocations_added', v_count,
    'allocated_total', round(v_existing_purchase_allocated, 2),
    'remaining', greatest(0, round(v_purchase.total - v_existing_purchase_allocated, 2))
  );
end;
$$;

revoke execute on function public.allocate_supplier_purchase(uuid,uuid,jsonb,uuid) from public, anon;
grant execute on function public.allocate_supplier_purchase(uuid,uuid,jsonb,uuid) to authenticated;
