create or replace function private.fleetease_sync_vehicle_current_mileage()
returns trigger
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  target_vehicle_id uuid;
  max_mileage integer;
begin
  target_vehicle_id := coalesce(new.vehicle_id, old.vehicle_id);

  if target_vehicle_id is null then
    return coalesce(new, old);
  end if;

  select max(ml.mileage)
    into max_mileage
  from public.mileage_logs ml
  where ml.vehicle_id = target_vehicle_id
    and coalesce(ml.is_deleted, false) = false;

  update public.vehicles
     set current_mileage = coalesce(max_mileage, 0)
   where id = target_vehicle_id
     and current_mileage is distinct from coalesce(max_mileage, 0);

  if tg_op = 'UPDATE' and old.vehicle_id is distinct from new.vehicle_id then
    select max(ml.mileage)
      into max_mileage
    from public.mileage_logs ml
    where ml.vehicle_id = old.vehicle_id
      and coalesce(ml.is_deleted, false) = false;

    update public.vehicles
       set current_mileage = coalesce(max_mileage, 0)
     where id = old.vehicle_id
       and current_mileage is distinct from coalesce(max_mileage, 0);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_fleetease_sync_vehicle_current_mileage on public.mileage_logs;
create trigger trg_fleetease_sync_vehicle_current_mileage
after insert or update of vehicle_id, mileage, is_deleted or delete
on public.mileage_logs
for each row
execute function private.fleetease_sync_vehicle_current_mileage();

update public.vehicles v
set current_mileage = coalesce((
  select max(ml.mileage)
  from public.mileage_logs ml
  where ml.vehicle_id = v.id
    and coalesce(ml.is_deleted, false) = false
), 0)
where exists (
  select 1
  from public.mileage_logs ml
  where ml.vehicle_id = v.id
);