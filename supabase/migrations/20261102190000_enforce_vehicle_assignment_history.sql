-- Keep assignment history authoritative and reject new overlapping intervals.
-- Existing historical overlaps are intentionally preserved; this trigger only
-- validates new assignments and updates that extend or reopen an interval.

create or replace function private.enforce_vehicle_assignment_temporal_integrity()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_vehicle_created_at timestamptz;
  v_vehicle_company_id uuid;
  v_vehicle_client_id uuid;
  v_vehicle_locked boolean;
  v_vehicle_status text;
  v_client_created_at timestamptz;
  v_client_company_id uuid;
  v_client_assigned_vehicle_id uuid;
  v_business_today date := timezone('America/Monterrey', now())::date;
  v_assigned_business_date date;
  v_validate_assignment boolean := false;
  v_check_overlap boolean := false;
begin
  if new.assigned_at is null then
    raise exception 'ASSIGNMENT_DATE_REQUIRED' using errcode = '23514';
  end if;

  if new.unassigned_at is not null and new.unassigned_at < new.assigned_at then
    raise exception 'ASSIGNMENT_END_MUST_FOLLOW_START' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    v_validate_assignment := true;
    v_check_overlap := true;
  else
    v_validate_assignment :=
      new.vehicle_id is distinct from old.vehicle_id
      or new.client_id is distinct from old.client_id
      or new.assigned_at is distinct from old.assigned_at;
    v_check_overlap := v_validate_assignment
      or (old.unassigned_at is not null and new.unassigned_at is null)
      or (old.unassigned_at is not null and new.unassigned_at > old.unassigned_at);
  end if;

  if v_validate_assignment then
    -- Lock both entities in a consistent order to serialize concurrent assignments.
    select v.created_at, v.company_id, v.client_id, v.locked_by_credit, v.status::text
      into v_vehicle_created_at, v_vehicle_company_id, v_vehicle_client_id, v_vehicle_locked, v_vehicle_status
      from public.vehicles v
     where v.id = new.vehicle_id and v.is_deleted = false
     for update;
    if not found then
      raise exception 'VEHICLE_NOT_FOUND_OR_INACTIVE' using errcode = '23503';
    end if;

    select c.created_at, c.company_id, c.assigned_vehicle_id
      into v_client_created_at, v_client_company_id, v_client_assigned_vehicle_id
      from public.clients c
     where c.id = new.client_id and c.is_deleted = false
     for update;
    if not found then
      raise exception 'CLIENT_NOT_FOUND_OR_INACTIVE' using errcode = '23503';
    end if;

    if new.company_id is distinct from v_vehicle_company_id
       or new.company_id is distinct from v_client_company_id then
      raise exception 'ASSIGNMENT_COMPANY_MISMATCH' using errcode = '23514';
    end if;

    v_assigned_business_date := timezone('America/Monterrey', new.assigned_at)::date;
    if v_assigned_business_date > v_business_today then
      raise exception 'ASSIGNMENT_DATE_IN_FUTURE' using errcode = '22023';
    end if;
    if v_assigned_business_date < timezone('America/Monterrey', v_vehicle_created_at)::date then
      raise exception 'ASSIGNMENT_BEFORE_VEHICLE_CREATION' using errcode = '23514';
    end if;
    if v_assigned_business_date < timezone('America/Monterrey', v_client_created_at)::date then
      raise exception 'ASSIGNMENT_BEFORE_CLIENT_CREATION' using errcode = '23514';
    end if;

    if new.unassigned_at is null then
      if coalesce(v_vehicle_locked, false) then
        raise exception 'VEHICLE_LOCKED_BY_CREDIT' using errcode = '23514';
      end if;
      if v_vehicle_status = 'sold' then
        raise exception 'VEHICLE_NOT_AVAILABLE' using errcode = '23514';
      end if;
      if v_vehicle_client_id is not null and v_vehicle_client_id is distinct from new.client_id then
        raise exception 'VEHICLE_ALREADY_ASSIGNED_TO_ANOTHER_CLIENT' using errcode = '23514';
      end if;
      if v_client_assigned_vehicle_id is not null and v_client_assigned_vehicle_id is distinct from new.vehicle_id then
        raise exception 'CLIENT_ALREADY_HAS_ANOTHER_VEHICLE' using errcode = '23514';
      end if;
    end if;
  end if;

  if v_check_overlap then
    if not v_validate_assignment then
      perform 1 from public.vehicles where id = new.vehicle_id for update;
      perform 1 from public.clients where id = new.client_id for update;
    end if;

    if exists (
      select 1
        from public.vehicle_assignment_logs l
       where l.vehicle_id = new.vehicle_id
         and l.id is distinct from new.id
         and l.assigned_at < coalesce(new.unassigned_at, 'infinity'::timestamptz)
         and new.assigned_at < coalesce(l.unassigned_at, 'infinity'::timestamptz)
    ) then
      raise exception 'VEHICLE_ASSIGNMENT_PERIOD_OVERLAP' using errcode = '23P01';
    end if;

    if exists (
      select 1
        from public.vehicle_assignment_logs l
       where l.client_id = new.client_id
         and l.vehicle_id is distinct from new.vehicle_id
         and l.id is distinct from new.id
         and l.assigned_at < coalesce(new.unassigned_at, 'infinity'::timestamptz)
         and new.assigned_at < coalesce(l.unassigned_at, 'infinity'::timestamptz)
    ) then
      raise exception 'CLIENT_ASSIGNMENT_PERIOD_OVERLAP' using errcode = '23P01';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_vehicle_assignment_temporal_integrity() from public, anon, authenticated;

create unique index if not exists uq_vehicle_assignment_open_client
  on public.vehicle_assignment_logs (client_id)
  where unassigned_at is null;

drop trigger if exists trg_fleetease_assignment_temporal_integrity on public.vehicle_assignment_logs;
create trigger trg_fleetease_assignment_temporal_integrity
before insert or update of vehicle_id, client_id, assigned_at, unassigned_at
on public.vehicle_assignment_logs
for each row execute function private.enforce_vehicle_assignment_temporal_integrity();

comment on function private.enforce_vehicle_assignment_temporal_integrity() is
  'Validates assignment entity dates, tenant ownership, current availability, and non-overlapping vehicle/client assignment intervals in America/Monterrey business time.';

-- Client assignment columns may only reflect an active assignment log. This
-- prevents direct client INSERT/UPDATE paths from bypassing the official history.
create or replace function private.enforce_client_vehicle_assignment_history()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_log_assigned_at timestamptz;
begin
  if new.assigned_vehicle_id is null then
    if new.vehicle_assigned_at is not null then
      raise exception 'CLIENT_ASSIGNMENT_DATE_REQUIRES_VEHICLE' using errcode = '23514';
    end if;

    if tg_op = 'UPDATE'
       and old.assigned_vehicle_id is not null
       and old.assigned_vehicle_id is distinct from new.assigned_vehicle_id
       and exists (
         select 1 from public.vehicle_assignment_logs l
          where l.client_id = new.id
            and l.vehicle_id = old.assigned_vehicle_id
            and l.unassigned_at is null
       ) then
      raise exception 'CLIENT_ASSIGNMENT_MUST_BE_ENDED_IN_HISTORY' using errcode = '23514';
    end if;

    return new;
  end if;

  select l.assigned_at
    into v_log_assigned_at
    from public.vehicle_assignment_logs l
   where l.client_id = new.id
     and l.vehicle_id = new.assigned_vehicle_id
     and l.company_id = new.company_id
     and l.unassigned_at is null
   order by l.assigned_at desc
   limit 1;

  if not found then
    raise exception 'CLIENT_VEHICLE_ASSIGNMENT_REQUIRES_HISTORY' using errcode = '23514';
  end if;

  if new.vehicle_assigned_at is distinct from v_log_assigned_at then
    raise exception 'CLIENT_ASSIGNMENT_DATE_MUST_MATCH_HISTORY' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
     and old.assigned_vehicle_id is not null
     and old.assigned_vehicle_id is distinct from new.assigned_vehicle_id
     and exists (
       select 1 from public.vehicle_assignment_logs l
        where l.client_id = new.id
          and l.vehicle_id = old.assigned_vehicle_id
          and l.unassigned_at is null
     ) then
    raise exception 'CLIENT_ASSIGNMENT_MUST_BE_ENDED_IN_HISTORY' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_client_vehicle_assignment_history() from public, anon, authenticated;

drop trigger if exists trg_clients_assignment_requires_history on public.clients;
create trigger trg_clients_assignment_requires_history
before insert or update of assigned_vehicle_id, vehicle_assigned_at
on public.clients
for each row execute function private.enforce_client_vehicle_assignment_history();

comment on function private.enforce_client_vehicle_assignment_history() is
  'Requires clients.assigned_vehicle_id and vehicle_assigned_at to match an active vehicle_assignment_logs row; prevents direct assignment shortcuts.';

-- The vehicle-side pointer must also be backed by the same active history row.
create or replace function private.enforce_vehicle_client_assignment_history()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
begin
  if new.client_id is null then
    if tg_op = 'UPDATE'
       and old.client_id is not null
       and old.client_id is distinct from new.client_id
       and exists (
         select 1 from public.vehicle_assignment_logs l
          where l.vehicle_id = new.id
            and l.client_id = old.client_id
            and l.unassigned_at is null
       ) then
      raise exception 'VEHICLE_ASSIGNMENT_MUST_BE_ENDED_IN_HISTORY' using errcode = '23514';
    end if;

    return new;
  end if;

  if not exists (
    select 1 from public.vehicle_assignment_logs l
     where l.vehicle_id = new.id
       and l.client_id = new.client_id
       and l.company_id = new.company_id
       and l.unassigned_at is null
  ) then
    raise exception 'VEHICLE_CLIENT_ASSIGNMENT_REQUIRES_HISTORY' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_vehicle_client_assignment_history() from public, anon, authenticated;

drop trigger if exists trg_vehicles_assignment_requires_history on public.vehicles;
create trigger trg_vehicles_assignment_requires_history
before insert or update of client_id
on public.vehicles
for each row execute function private.enforce_vehicle_client_assignment_history();

comment on function private.enforce_vehicle_client_assignment_history() is
  'Requires vehicles.client_id to match an active vehicle_assignment_logs row; prevents direct assignment shortcuts.';
