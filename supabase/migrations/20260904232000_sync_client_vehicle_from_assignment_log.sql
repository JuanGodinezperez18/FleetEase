-- The assignment log is the source of truth for the current client/vehicle relationship.
-- Backfill clients and vehicles so existing assignments are reflected immediately,
-- then keep the relationship synchronized for future writes.

create or replace function private.fleetease_sync_current_assignment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_previous_vehicle uuid;
  v_previous_client uuid;
  v_current_client uuid;
  v_current_vehicle uuid;
  v_current_assigned_at timestamptz;
begin
  if tg_op = 'UPDATE' then
    v_previous_vehicle := old.vehicle_id;
    v_previous_client := old.client_id;
  end if;

  -- Clear the old relationship only when this log represented its current assignment.
  if tg_op = 'UPDATE' and (new.vehicle_id is distinct from old.vehicle_id or new.client_id is distinct from old.client_id or old.unassigned_at is null) then
    update public.vehicles
       set client_id = null,
           updated_at = now()
     where id = old.vehicle_id
       and client_id = old.client_id
       and not exists (
         select 1
         from public.vehicle_assignment_logs x
         where x.vehicle_id = old.vehicle_id
           and x.client_id = old.client_id
           and x.unassigned_at is null
           and x.id <> old.id
       );

    update public.clients
       set assigned_vehicle_id = null,
           vehicle_assigned_at = null,
           updated_at = now()
     where id = old.client_id
       and assigned_vehicle_id = old.vehicle_id
       and not exists (
         select 1
         from public.vehicle_assignment_logs x
         where x.vehicle_id = old.vehicle_id
           and x.client_id = old.client_id
           and x.unassigned_at is null
           and x.id <> old.id
       );
  end if;

  -- If the log is active, it becomes the current relationship.
  if new.unassigned_at is null then
    update public.vehicles
       set client_id = new.client_id,
           updated_at = now()
     where id = new.vehicle_id;

    update public.clients
       set assigned_vehicle_id = new.vehicle_id,
           vehicle_assigned_at = new.assigned_at,
           updated_at = now()
     where id = new.client_id;
  else
    -- When an assignment is closed, derive the current relationship from any
    -- remaining active log rather than blindly clearing a newer assignment.
    select x.client_id, x.vehicle_id, x.assigned_at
      into v_current_client, v_current_vehicle, v_current_assigned_at
      from public.vehicle_assignment_logs x
     where x.client_id = new.client_id
       and x.unassigned_at is null
     order by x.assigned_at desc
     limit 1;

    if v_current_vehicle is null then
      update public.clients
         set assigned_vehicle_id = null,
             vehicle_assigned_at = null,
             updated_at = now()
       where id = new.client_id;
    else
      update public.clients
         set assigned_vehicle_id = v_current_vehicle,
             vehicle_assigned_at = v_current_assigned_at,
             updated_at = now()
       where id = new.client_id;
    end if;
  end if;

  return new;
end;
$$;

-- Keep the existing validation trigger and replace only the synchronization trigger.
drop trigger if exists trg_fleetease_assignment_sync_client_vehicle on public.vehicle_assignment_logs;
create trigger trg_fleetease_assignment_sync_client_vehicle
after insert or update of unassigned_at, assigned_at, vehicle_id, client_id
on public.vehicle_assignment_logs
for each row
execute function private.fleetease_sync_current_assignment();

-- Backfill vehicles from the newest active assignment per vehicle.
with ranked as (
  select
    id,
    vehicle_id,
    client_id,
    row_number() over (partition by vehicle_id order by assigned_at desc, id desc) as rn
  from public.vehicle_assignment_logs
  where unassigned_at is null
)
update public.vehicles v
   set client_id = r.client_id,
       updated_at = now()
  from ranked r
 where r.rn = 1
   and r.vehicle_id = v.id;

-- Backfill clients from the newest active assignment per client.
with ranked as (
  select
    id,
    client_id,
    vehicle_id,
    assigned_at,
    row_number() over (partition by client_id order by assigned_at desc, id desc) as rn
  from public.vehicle_assignment_logs
  where unassigned_at is null
)
update public.clients c
   set assigned_vehicle_id = r.vehicle_id,
       vehicle_assigned_at = r.assigned_at,
       updated_at = now()
  from ranked r
 where r.rn = 1
   and r.client_id = c.id;

-- Clear stale client links that have no active assignment log.
update public.clients c
   set assigned_vehicle_id = null,
       vehicle_assigned_at = null,
       updated_at = now()
 where c.assigned_vehicle_id is not null
   and not exists (
     select 1
     from public.vehicle_assignment_logs l
     where l.client_id = c.id
       and l.unassigned_at is null
   );

-- Clear stale vehicle links that have no active assignment log.
update public.vehicles v
   set client_id = null,
       updated_at = now()
 where v.client_id is not null
   and not exists (
     select 1
     from public.vehicle_assignment_logs l
     where l.vehicle_id = v.id
       and l.unassigned_at is null
   );
