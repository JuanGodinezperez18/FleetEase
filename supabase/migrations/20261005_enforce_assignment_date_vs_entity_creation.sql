-- FleetEase: la fecha de asignación no puede ser anterior al registro
-- del vehículo ni del cliente. Evita historiales inconsistentes.

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
  v_vehicle_created_at timestamptz;
  v_client_created_at timestamptz;
begin
  select client_id, locked_by_credit, status, created_at
    into v_client_id, v_locked, v_status, v_vehicle_created_at
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

  -- Fecha de asignación >= fecha de registro del vehículo (solo día calendario).
  if v_vehicle_created_at is not null
     and (new.assigned_at::date < v_vehicle_created_at::date) then
    raise exception 'La fecha de asignación no puede ser anterior a la fecha de registro del vehículo (%)',
      v_vehicle_created_at::date;
  end if;

  select created_at
    into v_client_created_at
  from public.clients
  where id = new.client_id
    and coalesce(is_deleted, false) = false;

  if not found then
    raise exception 'El cliente no existe o está eliminado';
  end if;

  if v_client_created_at is not null
     and (new.assigned_at::date < v_client_created_at::date) then
    raise exception 'La fecha de asignación no puede ser anterior a la fecha de registro del cliente (%)',
      v_client_created_at::date;
  end if;

  return new;
end;
$$;

-- El trigger ya existe; al reemplazar la función queda activo con la nueva lógica.
drop trigger if exists trg_enforce_vehicle_assignment_insert on public.vehicle_assignment_logs;
create trigger trg_enforce_vehicle_assignment_insert
before insert on public.vehicle_assignment_logs
for each row execute function public.enforce_vehicle_assignment_insert();
