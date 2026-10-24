-- FleetEase Free plan: one vehicle, one user.
-- Existing vehicle records are preserved; this only changes the cap for future additions.
create or replace function private.enforce_vehicle_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  if new.company_id is null or coalesce(new.is_deleted, false) then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and coalesce(old.is_deleted, false) = false
     and old.company_id = new.company_id then
    return new;
  end if;

  select c.plan, c.max_vehicles
    into v_plan, v_limit
  from public.companies c
  where c.id = new.company_id
  for update;

  if not found then
    raise exception 'No se encontró la compañía para el vehículo.' using errcode = '23514';
  end if;

  if v_limit is null then
    v_limit := case coalesce(v_plan, 'free')
      when 'free' then 1
      when 'starter' then 5
      when 'pro' then 15
      when 'enterprise' then -1
      else 1
    end;
  end if;

  if v_limit = -1 then
    return new;
  end if;

  select count(*)::integer
    into v_count
  from public.vehicles v
  where v.company_id = new.company_id
    and coalesce(v.is_deleted, false) = false
    and (tg_op = 'INSERT' or v.id <> new.id);

  if v_count >= v_limit then
    raise exception 'Has alcanzado el límite de % vehículos de tu plan %. Actualiza tu plan para agregar más vehículos.', v_limit, coalesce(v_plan, 'free') using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Apply the new cap to active Free companies without deleting or modifying their existing vehicles.
update public.companies
set max_vehicles = 1,
    max_users = 1,
    updated_at = now()
where plan = 'free'
  and coalesce(is_deleted, false) = false;
