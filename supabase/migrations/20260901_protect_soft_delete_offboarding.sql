create or replace function public.handle_client_soft_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if old.is_deleted is distinct from true and new.is_deleted = true then
    perform public.offboard_client_with_writeoff(
      new.id,
      'Baja de cliente solicitada desde el flujo de eliminación. Motivo no especificado en la interfaz actual.'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.handle_client_soft_delete() from public;

create or replace function public.handle_credit_soft_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if old.is_deleted is distinct from true and new.is_deleted = true then
    update public.credits
       set status='cancelled'::public.credit_status,
           updated_at=now()
     where id=new.id
       and status is distinct from 'cancelled'::public.credit_status;
  end if;
  return new;
end;
$$;

revoke all on function public.handle_credit_soft_delete() from public;

drop trigger if exists trg_handle_client_soft_delete on public.clients;
create trigger trg_handle_client_soft_delete
after update of is_deleted on public.clients
for each row
when (old.is_deleted is distinct from true and new.is_deleted = true)
execute function public.handle_client_soft_delete();

drop trigger if exists trg_handle_credit_soft_delete on public.credits;
create trigger trg_handle_credit_soft_delete
after update of is_deleted on public.credits
for each row
when (old.is_deleted is distinct from true and new.is_deleted = true)
execute function public.handle_credit_soft_delete();
