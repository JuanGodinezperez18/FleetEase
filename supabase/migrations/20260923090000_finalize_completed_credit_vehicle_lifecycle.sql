-- Finalize the ownership lifecycle when a vehicle credit is fully paid.

create or replace function public.finalize_completed_credit_vehicle()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status = 'completed'::public.credit_status
     and (old.status is distinct from new.status or old.remaining_balance is distinct from new.remaining_balance) then

    update public.clients
       set has_active_credit = false,
           active_credit_id = null,
           assigned_vehicle_id = null,
           vehicle_assigned_at = null,
           updated_at = now()
     where id = new.client_id
       and company_id = new.company_id;

    if new.vehicle_id is not null then
      update public.vehicle_assignment_logs
         set unassigned_at = coalesce(unassigned_at, now()),
             end_date = coalesce(end_date, now()),
             reason = coalesce(reason, 'Crédito liquidado: vehículo entregado al cliente')
       where vehicle_id = new.vehicle_id
         and client_id = new.client_id
         and company_id = new.company_id
         and unassigned_at is null;

      update public.vehicles
         set client_id = null,
             partner_id = null,
             status = 'sold'::public.vehicle_status,
             locked_by_credit = false,
             associated_credit_id = null,
             updated_at = now()
       where id = new.vehicle_id
         and company_id = new.company_id;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_finalize_completed_credit_vehicle on public.credits;

create trigger trg_finalize_completed_credit_vehicle
after update of status, remaining_balance on public.credits
for each row
execute function public.finalize_completed_credit_vehicle();

do $$
declare
  r record;
begin
  for r in
    select c.id, c.client_id, c.vehicle_id, c.company_id
      from public.credits c
     where c.status = 'completed'::public.credit_status
       and coalesce(c.is_deleted, false) = false
       and c.vehicle_id is not null
  loop
    update public.vehicle_assignment_logs
       set unassigned_at = coalesce(unassigned_at, now()),
           end_date = coalesce(end_date, now()),
           reason = coalesce(reason, 'Crédito liquidado: vehículo entregado al cliente')
     where vehicle_id = r.vehicle_id
       and client_id = r.client_id
       and company_id = r.company_id
       and unassigned_at is null;

    update public.clients
       set has_active_credit = false,
           active_credit_id = null,
           assigned_vehicle_id = null,
           vehicle_assigned_at = null,
           updated_at = now()
     where id = r.client_id
       and company_id = r.company_id;

    update public.vehicles
       set client_id = null,
           partner_id = null,
           status = 'sold'::public.vehicle_status,
           locked_by_credit = false,
           associated_credit_id = null,
           updated_at = now()
     where id = r.vehicle_id
       and company_id = r.company_id
       and not exists (
         select 1
           from public.credits c2
          where c2.vehicle_id = r.vehicle_id
            and c2.company_id = r.company_id
            and c2.status = 'active'::public.credit_status
            and coalesce(c2.is_deleted, false) = false
       );
  end loop;
end;
$$;

revoke all on function public.finalize_completed_credit_vehicle() from public, anon, authenticated;
