-- FleetEase: partner credit balance + vehicle administration fee
-- 2026-09-18
--
-- 1) Adds the canonical administration categories.
-- 2) When an Administration expense is recorded for a partner-owned vehicle,
--    automatically creates the matching company income.
-- 3) Links both records so the operation is traceable and cannot be duplicated.
-- 4) Keeps the credit-payment flow unchanged; partner balance is fixed in the
--    application layer to use vehicle_id + credit_id as the canonical relation.

insert into public.financial_categories
  (company_id, name, type, affects, description, is_default, category)
select null,
       'Administración de Vehículo',
       'expense'::public.financial_record_type,
       'partner_balance'::public.balance_affects,
       'Costo de administración cobrado al socio propietario del vehículo.',
       true,
       'Administración de Vehículo'
where not exists (
  select 1 from public.financial_categories
  where company_id is null
    and lower(trim(name)) = lower('Administración de Vehículo')
);

insert into public.financial_categories
  (company_id, name, type, affects, description, is_default, category)
select null,
       'Ingreso por Administración de Vehículo',
       'income'::public.financial_record_type,
       'none'::public.balance_affects,
       'Ingreso de la empresa por administración de un vehículo de socio.',
       true,
       'Ingreso por Administración de Vehículo'
where not exists (
  select 1 from public.financial_categories
  where company_id is null
    and lower(trim(name)) = lower('Ingreso por Administración de Vehículo')
);

create or replace function public.create_vehicle_admin_income()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicles;
  v_category_id uuid;
  v_category_name text;
  v_income_id uuid;
begin
  if new.is_deleted
     or new.type <> 'expense'
     or new.vehicle_id is null
     or coalesce(new.amount, 0) <= 0 then
    return new;
  end if;

  -- Only the dedicated administration category triggers the paired income.
  if lower(trim(coalesce(new.category, ''))) <> lower('Administración de Vehículo') then
    return new;
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = new.vehicle_id
    and company_id = new.company_id
    and is_deleted = false;

  -- Administration income only applies to vehicles actually owned by a partner.
  if not found or v_vehicle.partner_id is null then
    return new;
  end if;

  select id, name
    into v_category_id, v_category_name
  from public.financial_categories
  where (company_id = new.company_id or company_id is null)
    and type = 'income'
    and lower(trim(name)) = lower('Ingreso por Administración de Vehículo')
  order by case when company_id = new.company_id then 0 else 1 end,
           is_default desc nulls last
  limit 1;

  if v_category_id is null then
    raise exception 'No existe la categoría Ingreso por Administración de Vehículo';
  end if;

  -- Idempotency: a source expense can have only one paired admin income.
  select id into v_income_id
  from public.financial_records
  where source_record_id = new.id
    and source_record_type = 'vehicle_admin_fee'
    and is_deleted = false
  limit 1;

  if v_income_id is not null then
    update public.financial_records
    set amount = new.amount,
        date = new.date,
        vehicle_id = new.vehicle_id,
        partner_id = v_vehicle.partner_id,
        category_id = v_category_id,
        category = v_category_name,
        description = 'Ingreso por administración del vehículo ' || coalesce(v_vehicle.alias, ''),
        is_deleted = new.is_deleted,
        updated_at = now()
    where id = v_income_id;
    return new;
  end if;

  insert into public.financial_records (
    company_id,
    type,
    category_id,
    category,
    amount,
    date,
    description,
    vehicle_id,
    partner_id,
    source_record_id,
    source_record_type,
    is_deleted,
    created_by
  )
  values (
    new.company_id,
    'income',
    v_category_id,
    v_category_name,
    new.amount,
    new.date,
    'Ingreso por administración del vehículo ' || coalesce(v_vehicle.alias, ''),
    new.vehicle_id,
    v_vehicle.partner_id,
    new.id,
    'vehicle_admin_fee',
    false,
    new.created_by
  );

  return new;
end;
$$;

drop trigger if exists trg_vehicle_admin_income on public.financial_records;

create trigger trg_vehicle_admin_income
after insert or update of amount, date, vehicle_id, partner_id, category, is_deleted on public.financial_records
for each row
execute function public.create_vehicle_admin_income();

comment on function public.create_vehicle_admin_income() is
'Creates the company income paired with a partner vehicle administration expense. Idempotent by source_record_id.';
