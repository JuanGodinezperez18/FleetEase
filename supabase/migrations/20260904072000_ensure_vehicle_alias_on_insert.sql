create or replace function public.ensure_vehicle_alias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(new.alias), '') is null then
    new.alias := left(trim(concat_ws(' ', nullif(trim(new.make), ''), nullif(trim(new.model), ''), nullif(trim(new.plate), ''))), 120);
  end if;
  if nullif(trim(new.alias), '') is null then
    new.alias := 'Vehículo';
  end if;
  return new;
end;
$$;

revoke execute on function public.ensure_vehicle_alias() from public, anon, authenticated;
grant execute on function public.ensure_vehicle_alias() to service_role;

drop trigger if exists trg_ensure_vehicle_alias on public.vehicles;
create trigger trg_ensure_vehicle_alias
before insert or update on public.vehicles
for each row execute function public.ensure_vehicle_alias();
