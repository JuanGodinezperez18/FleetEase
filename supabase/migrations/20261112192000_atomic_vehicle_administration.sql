-- One active administration expense per rental or fully paid installment.
create unique index vehicle_administration_active_source_idx
  on public.financial_records (company_id, source_record_type, source_record_id)
  where not is_deleted and source_record_type in ('vehicle_admin_rent', 'vehicle_admin_installment');

create function fleetease_private.sync_vehicle_administration(
  p_company_id uuid, p_source_type text, p_source_id uuid,
  p_vehicle_id uuid, p_client_id uuid, p_date date, p_active boolean, p_allow_create boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_expense public.financial_records;
  v_vehicle public.vehicles;
  v_expense_category public.financial_categories;
  v_income_category public.financial_categories;
  v_expense_id uuid;
begin
  select * into v_expense from public.financial_records
    where company_id = p_company_id and source_record_type = p_source_type
      and source_record_id = p_source_id and not is_deleted
    for update;

  if v_expense.id is not null then
    if not p_active or v_expense.vehicle_id is distinct from p_vehicle_id then
      update public.financial_records
        set is_deleted = true
        where company_id = p_company_id and not is_deleted
          and (id = v_expense.id or
            (source_record_type = 'vehicle_admin_fee' and source_record_id = v_expense.id));
    else
      update public.financial_records
        set date = p_date
        where company_id = p_company_id and not is_deleted and date is distinct from p_date
          and (id = v_expense.id or
            (source_record_type = 'vehicle_admin_fee' and source_record_id = v_expense.id));
      return;
    end if;
  end if;

  if not p_active or not p_allow_create then return; end if;

  select * into v_vehicle from public.vehicles
    where company_id = p_company_id and id = p_vehicle_id and not is_deleted;
  if not found or v_vehicle.partner_id is null
     or coalesce(v_vehicle.admin_commission, 0) <= 0 then
    return;
  end if;

  select * into v_expense_category from public.financial_categories
    where (company_id = p_company_id or company_id is null) and type = 'expense'
      and lower(trim(name)) = 'administración de vehículo'
      and affects = 'partner_balance'
    order by (company_id is not null) desc, is_default desc nulls last, id
    limit 1;
  select * into v_income_category from public.financial_categories
    where (company_id = p_company_id or company_id is null) and type = 'income'
      and lower(trim(name)) = 'ingreso por administración de vehículo'
      and affects = 'none'
    order by (company_id is not null) desc, is_default desc nulls last, id
    limit 1;
  if v_expense_category.id is null or v_income_category.id is null then
    raise exception 'VEHICLE_ADMINISTRATION_CATEGORIES_REQUIRED';
  end if;

  insert into public.financial_records
    (company_id, vehicle_id, client_id, partner_id, type, category_id, category, amount,
     date, description, source_record_type, source_record_id, created_by, is_deleted)
  values
    (p_company_id, p_vehicle_id, p_client_id, v_vehicle.partner_id, 'expense',
     v_expense_category.id, v_expense_category.name, v_vehicle.admin_commission,
     p_date, v_expense_category.name, p_source_type, p_source_id, auth.uid(), false)
  returning id into v_expense_id;

  insert into public.financial_records
    (company_id, vehicle_id, partner_id, type, category_id, category, amount,
     date, description, source_record_type, source_record_id, created_by, is_deleted)
  values
    (p_company_id, p_vehicle_id, v_vehicle.partner_id, 'income',
     v_income_category.id, v_income_category.name, v_vehicle.admin_commission,
     p_date, v_income_category.name, 'vehicle_admin_fee', v_expense_id, auth.uid(), false);
end;
$$;

-- The existing mirror remains responsible for manually recorded administration expenses.
drop trigger trg_vehicle_admin_income on public.financial_records;
create trigger trg_vehicle_admin_income
after insert or update of amount, date, vehicle_id, partner_id, category, is_deleted
on public.financial_records for each row
when (new.source_record_type is distinct from 'vehicle_admin_rent'
  and new.source_record_type is distinct from 'vehicle_admin_installment')
execute function public.create_vehicle_admin_income();

create function fleetease_private.sync_rent_administration()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform fleetease_private.sync_vehicle_administration(
    new.company_id, 'vehicle_admin_rent', new.id, new.vehicle_id, new.client_id, new.date,
    new.type = 'income' and not new.is_deleted and not coalesce(new.credit_granted, false)
      and exists (
        select 1 from public.financial_categories c where c.id = new.category_id
          and (c.company_id = new.company_id or c.company_id is null)
          and c.type = 'income' and lower(trim(c.name)) = 'renta semanal'
      ),
    tg_op = 'INSERT' or old.is_deleted or new.vehicle_id is distinct from old.vehicle_id
      or new.category_id is distinct from old.category_id
  );
  return new;
end;
$$;

create trigger sync_rent_administration
after insert or update of category_id, vehicle_id, date, is_deleted
on public.financial_records for each row
when (new.source_record_type = 'weekly_rent_with_admin')
execute function fleetease_private.sync_rent_administration();

create function fleetease_private.sync_installment_administration()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  v_credit public.credits;
  v_active boolean := new.status = 'paid' and not new.is_deleted;
begin
  -- Only the privileged payment and recalculation paths may create a charge.
  if current_user <> pg_catalog.pg_get_userbyid((
    select p.proowner from pg_catalog.pg_proc p
      where p.oid = 'public.process_credit_payment_atomic(uuid,uuid,uuid,numeric,date,text,text,uuid)'::regprocedure
  )) then
    raise exception 'CREDIT_INSTALLMENT_MANAGED_BY_PAYMENT' using errcode = '42501';
  end if;

  select * into v_credit from public.credits
    where id = new.credit_id and company_id = new.company_id and not is_deleted;
  if not found then return new; end if;

  perform fleetease_private.sync_vehicle_administration(
    new.company_id, 'vehicle_admin_installment', new.id, v_credit.vehicle_id,
    v_credit.client_id, new.paid_date, v_active, old.status is distinct from 'paid' or old.is_deleted
  );
  return new;
end;
$$;

create trigger sync_installment_administration
after update of status, paid_date, is_deleted on public.credit_payment_schedules
for each row when (
  (old.status = 'paid' or new.status = 'paid')
  and (old.status is distinct from new.status or old.paid_date is distinct from new.paid_date
    or old.is_deleted is distinct from new.is_deleted)
)
execute function fleetease_private.sync_installment_administration();

create function fleetease_private.guard_vehicle_administration_records()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() > 1 then return new; end if;
  if new.source_record_type in ('vehicle_admin_rent', 'vehicle_admin_installment')
    or (tg_op = 'UPDATE' and old.source_record_type in ('vehicle_admin_rent', 'vehicle_admin_installment'))
    or exists (
      select 1 from public.financial_records f
      where f.company_id = new.company_id
        and f.source_record_type in ('vehicle_admin_rent', 'vehicle_admin_installment')
        and ((new.source_record_type = 'vehicle_admin_fee' and f.id = new.source_record_id)
          or (tg_op = 'UPDATE' and old.source_record_type = 'vehicle_admin_fee' and f.id = old.source_record_id))
    )
    or (tg_op = 'UPDATE' and old.source_record_type = 'weekly_rent_with_admin'
        and new.source_record_type is distinct from old.source_record_type)
  then
    raise exception 'VEHICLE_ADMINISTRATION_MANAGED_BY_SOURCE' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_vehicle_administration_records
before insert or update on public.financial_records
for each row execute function fleetease_private.guard_vehicle_administration_records();

revoke all on function fleetease_private.sync_vehicle_administration(uuid,text,uuid,uuid,uuid,date,boolean,boolean) from public, anon, authenticated;
revoke all on function fleetease_private.sync_rent_administration() from public, anon, authenticated;
revoke all on function fleetease_private.sync_installment_administration() from public, anon, authenticated;
revoke all on function fleetease_private.guard_vehicle_administration_records() from public, anon, authenticated;
