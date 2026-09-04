create schema if not exists private;

create or replace function private.fleetease_assignment_before_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_current integer;
  v_logged integer;
  v_baseline integer;
  v_vehicle_company uuid;
  v_client_company uuid;
begin
  select current_mileage, company_id into v_current, v_vehicle_company
  from public.vehicles where id = new.vehicle_id;

  if not found then
    raise exception 'Vehículo no encontrado.' using errcode = '23503';
  end if;

  select company_id into v_client_company from public.clients where id = new.client_id and is_deleted = false;
  if not found then
    raise exception 'Cliente no encontrado o inactivo.' using errcode = '23503';
  end if;

  if new.company_id is distinct from v_vehicle_company or new.company_id is distinct from v_client_company then
    raise exception 'La empresa de la asignación no coincide con el vehículo y el cliente.' using errcode = '23514';
  end if;

  select coalesce(max(mileage), 0) into v_logged
  from public.mileage_logs
  where vehicle_id = new.vehicle_id and coalesce(is_deleted, false) = false;

  v_baseline := greatest(coalesce(v_current, 0), coalesce(v_logged, 0));

  if new.odometer_reading is null then
    new.odometer_reading := v_baseline;
  elsif new.odometer_reading < v_baseline then
    raise exception 'El kilometraje de asignación no puede ser menor al último kilometraje registrado (% km).', v_baseline using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.fleetease_assignment_after_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.unassigned_at is null then
    update public.vehicles
       set client_id = new.client_id,
           current_mileage = greatest(coalesce(current_mileage, 0), coalesce(new.odometer_reading, 0)),
           updated_at = now()
     where id = new.vehicle_id;

    update public.clients
       set assigned_vehicle_id = new.vehicle_id,
           vehicle_assigned_at = new.assigned_at,
           updated_at = now()
     where id = new.client_id;

    if new.odometer_reading is not null and not exists (
      select 1 from public.mileage_logs ml
      where ml.vehicle_id = new.vehicle_id
        and ml.mileage = new.odometer_reading
        and ml.date = (new.assigned_at at time zone 'UTC')::date
        and coalesce(ml.is_deleted, false) = false
    ) then
      insert into public.mileage_logs (
        vehicle_id, mileage, date, notes, source, kind, company_id, created_by, uid
      ) values (
        new.vehicle_id,
        new.odometer_reading::integer,
        (new.assigned_at at time zone 'UTC')::date,
        'Kilometraje capturado en asignación de vehículo',
        'manual',
        'odometer',
        new.company_id,
        new.assigned_by,
        new.assigned_by
      );
    end if;
  else
    update public.vehicles
       set client_id = null,
           updated_at = now()
     where id = new.vehicle_id and client_id = new.client_id;

    update public.clients
       set assigned_vehicle_id = null,
           vehicle_assigned_at = null,
           updated_at = now()
     where id = new.client_id and assigned_vehicle_id = new.vehicle_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fleetease_assignment_before_write on public.vehicle_assignment_logs;
create trigger trg_fleetease_assignment_before_write
before insert or update of vehicle_id, client_id, company_id, odometer_reading
on public.vehicle_assignment_logs
for each row execute function private.fleetease_assignment_before_write();

drop trigger if exists trg_fleetease_assignment_after_write on public.vehicle_assignment_logs;
create trigger trg_fleetease_assignment_after_write
after insert or update of unassigned_at, assigned_at, odometer_reading, vehicle_id, client_id
on public.vehicle_assignment_logs
for each row execute function private.fleetease_assignment_after_write();

create or replace function private.fleetease_vehicle_mileage_baseline()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_date date := coalesce(new.acquisition_date, current_date);
begin
  if tg_op = 'INSERT' then
    if coalesce(new.last_maintenance_mileage, 0) > 0 then
      insert into public.mileage_logs (vehicle_id, mileage, date, notes, source, kind, company_id)
      values (new.id, new.last_maintenance_mileage, v_date, 'Último mantenimiento capturado al registrar vehículo', 'manual', 'maintenance', new.company_id);
    end if;
    if coalesce(new.current_mileage, 0) > 0 then
      insert into public.mileage_logs (vehicle_id, mileage, date, notes, source, kind, company_id)
      values (new.id, new.current_mileage, current_date, 'Kilometraje inicial del vehículo', 'manual', 'odometer', new.company_id);
    end if;
  else
    if new.current_mileage is distinct from old.current_mileage and coalesce(new.current_mileage, 0) > 0 then
      insert into public.mileage_logs (vehicle_id, mileage, date, notes, source, kind, company_id)
      select new.id, new.current_mileage, current_date, 'Kilometraje actualizado desde formulario de vehículo', 'manual', 'odometer', new.company_id
      where not exists (
        select 1 from public.mileage_logs ml
        where ml.vehicle_id = new.id and ml.mileage = new.current_mileage and ml.date = current_date and ml.kind = 'odometer' and coalesce(ml.is_deleted, false) = false
      );
    end if;
    if new.last_maintenance_mileage is distinct from old.last_maintenance_mileage and coalesce(new.last_maintenance_mileage, 0) > 0 then
      insert into public.mileage_logs (vehicle_id, mileage, date, notes, source, kind, company_id)
      select new.id, new.last_maintenance_mileage, current_date, 'Último mantenimiento actualizado desde formulario de vehículo', 'manual', 'maintenance', new.company_id
      where not exists (
        select 1 from public.mileage_logs ml
        where ml.vehicle_id = new.id and ml.mileage = new.last_maintenance_mileage and ml.date = current_date and ml.kind = 'maintenance' and coalesce(ml.is_deleted, false) = false
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fleetease_vehicle_mileage_baseline on public.vehicles;
create trigger trg_fleetease_vehicle_mileage_baseline
after insert or update of current_mileage, last_maintenance_mileage
on public.vehicles
for each row execute function private.fleetease_vehicle_mileage_baseline();

insert into public.mileage_logs (vehicle_id, mileage, date, notes, source, kind, company_id)
select v.id, v.last_maintenance_mileage, coalesce(v.acquisition_date, current_date), 'Último mantenimiento histórico sincronizado', 'manual', 'maintenance', v.company_id
from public.vehicles v
where coalesce(v.last_maintenance_mileage, 0) > 0
  and not exists (select 1 from public.mileage_logs ml where ml.vehicle_id = v.id and ml.mileage = v.last_maintenance_mileage and ml.kind = 'maintenance' and coalesce(ml.is_deleted, false) = false);

insert into public.mileage_logs (vehicle_id, mileage, date, notes, source, kind, company_id)
select v.id, v.current_mileage, current_date, 'Kilometraje actual histórico sincronizado', 'manual', 'odometer', v.company_id
from public.vehicles v
where coalesce(v.current_mileage, 0) > 0
  and not exists (select 1 from public.mileage_logs ml where ml.vehicle_id = v.id and ml.mileage = v.current_mileage and ml.kind = 'odometer' and coalesce(ml.is_deleted, false) = false);

revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
