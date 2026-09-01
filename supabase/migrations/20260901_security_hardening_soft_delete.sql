-- Security hardening: prevent destructive hard-deletes of financial/credit history
-- and make credit deactivation/cancellation release related resources from
-- the authoritative credit.vehicle_id / credit.client_id values.

create or replace function public.prevent_financial_record_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.financial_records
     set is_deleted = true,
         deleted_at = coalesce(deleted_at, now())
   where id = old.id;
  return null;
end;
$$;

create or replace function public.prevent_credit_schedule_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.credit_payment_schedules
     set is_deleted = true,
         deleted_at = coalesce(deleted_at, now())
   where id = old.id;
  return null;
end;
$$;

create or replace function public.prevent_credit_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.credits
     set is_deleted = true,
         status = 'cancelled'::public.credit_status,
         updated_at = now()
   where id = old.id;

  if old.client_id is not null then
    update public.clients
       set has_active_credit = false,
           active_credit_id = null,
           updated_at = now()
     where id = old.client_id
       and active_credit_id = old.id;
  end if;

  if old.vehicle_id is not null then
    update public.vehicles
       set status = 'active'::public.vehicle_status,
           client_id = null,
           locked_by_credit = false,
           associated_credit_id = null,
           updated_at = now()
     where id = old.vehicle_id;
  end if;

  return null;
end;
$$;

create or replace function public.release_resources_on_credit_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('inactive'::public.credit_status, 'cancelled'::public.credit_status)
     and old.status is distinct from new.status then

    if new.client_id is not null then
      update public.clients
         set has_active_credit = false,
             active_credit_id = null,
             updated_at = now()
       where id = new.client_id
         and (active_credit_id = new.id or has_active_credit = true);
    end if;

    if new.vehicle_id is not null then
      update public.vehicles
         set status = 'active'::public.vehicle_status,
             client_id = null,
             locked_by_credit = false,
             associated_credit_id = null,
             updated_at = now()
       where id = new.vehicle_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_financial_record_hard_delete on public.financial_records;
create trigger trg_prevent_financial_record_hard_delete
before delete on public.financial_records
for each row execute function public.prevent_financial_record_hard_delete();

drop trigger if exists trg_prevent_credit_schedule_hard_delete on public.credit_payment_schedules;
create trigger trg_prevent_credit_schedule_hard_delete
before delete on public.credit_payment_schedules
for each row execute function public.prevent_credit_schedule_hard_delete();

drop trigger if exists trg_prevent_credit_hard_delete on public.credits;
create trigger trg_prevent_credit_hard_delete
before delete on public.credits
for each row execute function public.prevent_credit_hard_delete();

drop trigger if exists trg_release_resources_on_credit_status_change on public.credits;
create trigger trg_release_resources_on_credit_status_change
after update of status on public.credits
for each row execute function public.release_resources_on_credit_status_change();

revoke execute on function public.prevent_financial_record_hard_delete() from public, anon, authenticated;
revoke execute on function public.prevent_credit_schedule_hard_delete() from public, anon, authenticated;
revoke execute on function public.prevent_credit_hard_delete() from public, anon, authenticated;
revoke execute on function public.release_resources_on_credit_status_change() from public, anon, authenticated;

-- Trigger-only auth lifecycle functions should not be exposed as RPC endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_delete() from public, anon, authenticated;
