-- FleetEase: plan Free permanente — 3 vehículos, 1 usuario.
-- Actualiza los límites por defecto del plan free en los triggers de enforcement.

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
      when 'free' then 3
      when 'starter' then 5
      when 'pro' then 15
      when 'enterprise' then -1
      else 3
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

create or replace function private.enforce_user_plan_limit()
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
  if new.company_id is null or coalesce(new.is_deleted, false) or new.role = 'super_admin' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and coalesce(old.is_deleted, false) = false
     and old.company_id = new.company_id
     and old.role <> 'super_admin' then
    return new;
  end if;

  select c.plan, c.max_users
    into v_plan, v_limit
  from public.companies c
  where c.id = new.company_id
  for update;

  if not found then
    raise exception 'No se encontró la compañía para el usuario.' using errcode = '23514';
  end if;

  if v_limit is null then
    v_limit := case coalesce(v_plan, 'free')
      when 'free' then 1
      when 'starter' then 1
      when 'pro' then 3
      when 'enterprise' then -1
      else 1
    end;
  end if;

  if v_limit = -1 then
    return new;
  end if;

  select count(*)::integer
    into v_count
  from public.users u
  where u.company_id = new.company_id
    and coalesce(u.is_deleted, false) = false
    and u.role <> 'super_admin'
    and (tg_op = 'INSERT' or u.id <> new.id);

  if v_count >= v_limit then
    raise exception 'Has alcanzado el límite de % usuarios de tu plan %. Actualiza tu plan para agregar más usuarios.', v_limit, coalesce(v_plan, 'free') using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Opcional: alinear empresas Free existentes al nuevo límite (3 vehículos) y estado activo permanente.
update public.companies
set
  max_vehicles = 3,
  max_users = 1,
  subscription_status = case
    when subscription_status in ('trialing', 'expired') then 'active'
    else subscription_status
  end,
  trial_ends_at = null,
  updated_at = now()
where plan = 'free'
  and coalesce(is_deleted, false) = false;
