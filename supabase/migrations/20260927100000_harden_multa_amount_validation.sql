-- FleetEase: harden multa validation at database boundary.
-- Prevents malformed writes that bypass the React form.

create or replace function public.validate_multa_amounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.importe is null or new.importe <= 0 then
    raise exception 'El importe de la multa debe ser mayor a 0.' using errcode = '22003';
  end if;

  if new.recargos is null or new.recargos < 0 then
    raise exception 'Los recargos de la multa no pueden ser negativos.' using errcode = '22003';
  end if;

  if new.recargos > new.importe * 10 then
    raise exception 'Los recargos de la multa no pueden superar 10 veces el importe.' using errcode = '22003';
  end if;

  if new.total is null or new.total <= 0 or new.total <> new.importe + new.recargos then
    raise exception 'El total de la multa no coincide con importe más recargos.' using errcode = '22003';
  end if;

  if new.fecha_infraccion is null or new.fecha_infraccion > current_date then
    raise exception 'La fecha de infracción no puede ser futura.' using errcode = '22007';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_multa_amounts on public.multas;

create trigger trg_validate_multa_amounts
before insert or update of importe, recargos, total, fecha_infraccion
on public.multas
for each row
execute function public.validate_multa_amounts();

revoke all on function public.validate_multa_amounts() from public, anon, authenticated;
