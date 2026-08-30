-- FleetEase: reglas de integridad para asignaciones de vehículos.
-- No modifica el módulo de Créditos; únicamente impide que Asignaciones
-- contradiga el estado que el módulo de Créditos ya mantiene.

create or replace function public.enforce_vehicle_assignment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_locked boolean;
  v_status text;
begin
  select client_id, locked_by_credit, status
    into v_client_id, v_locked, v_status
  from public.vehicles
  where id = new.vehicle_id
    and coalesce(is_deleted, false) = false
  for update;

  if not found then
    raise exception 'El vehículo no existe o está eliminado';
  end if;

  if coalesce(v_locked, false) then
    raise exception 'Este vehículo está protegido por un crédito activo y no puede asignarse desde Asignaciones';
  end if;

  if v_client_id is not null then
    raise exception 'Este vehículo ya está asignado a otro cliente. Debe desasignarse primero';
  end if;

  if v_status is distinct from 'active' then
    raise exception 'El vehículo no está disponible para asignación';
  end if;

  if exists (
    select 1
    from public.vehicle_assignment_logs l
    where l.vehicle_id = new.vehicle_id
      and l.unassigned_at is null
  ) then
    raise exception 'El vehículo ya tiene una asignación activa';
  end if;

  if exists (
    select 1
    from public.vehicles v
    where v.client_id = new.client_id
      and coalesce(v.is_deleted, false) = false
      and v.id <> new.vehicle_id
  ) then
    raise exception 'El cliente ya tiene un vehículo asignado. Debe desasignarlo primero';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_vehicle_assignment_insert on public.vehicle_assignment_logs;
create trigger trg_enforce_vehicle_assignment_insert
before insert on public.vehicle_assignment_logs
for each row execute function public.enforce_vehicle_assignment_insert();

create or replace function public.enforce_vehicle_assignment_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.unassigned_at is null and new.unassigned_at is not null then
    if exists (
      select 1
      from public.vehicles v
      where v.id = new.vehicle_id
        and coalesce(v.locked_by_credit, false) = true
    ) then
      raise exception 'No se puede desasignar este vehículo mientras tenga un crédito activo. Liquida o cancela el crédito primero';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_vehicle_assignment_end on public.vehicle_assignment_logs;
create trigger trg_enforce_vehicle_assignment_end
before update of unassigned_at on public.vehicle_assignment_logs
for each row execute function public.enforce_vehicle_assignment_end();

-- Evita dos asignaciones abiertas para la misma unidad incluso bajo concurrencia.
create unique index if not exists uq_vehicle_assignment_open
  on public.vehicle_assignment_logs (vehicle_id)
  where unassigned_at is null;
