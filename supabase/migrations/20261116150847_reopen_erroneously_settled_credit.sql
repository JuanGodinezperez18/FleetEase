create table if not exists fleetease_private.credit_settlement_reversal_context (
  credit_id uuid primary key,
  company_id uuid not null,
  payment_id uuid not null,
  assignment_id uuid not null,
  partner_id uuid,
  settled_at timestamptz not null
);
alter table fleetease_private.credit_settlement_reversal_context enable row level security;
revoke all on fleetease_private.credit_settlement_reversal_context from public, anon, authenticated;

create or replace function fleetease_private.capture_credit_settlement_reversal_context()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_assignment uuid;
  v_partner uuid;
  v_payment uuid;
begin
  if old.status <> 'active' or new.status <> 'completed' or new.vehicle_id is null then
    return new;
  end if;

  delete from fleetease_private.credit_settlement_reversal_context where credit_id=new.id;

  select v.partner_id, l.id into v_partner, v_assignment
  from public.vehicles v
  join public.vehicle_assignment_logs l on l.vehicle_id=v.id and l.company_id=v.company_id
  where v.id=new.vehicle_id and v.company_id=new.company_id and not v.is_deleted
    and v.client_id=new.client_id and v.associated_credit_id=new.id and v.locked_by_credit
    and l.client_id=new.client_id and l.unassigned_at is null
  for update of v, l;
  if not found then return new; end if;

  select (array_agg(f.id))[1] into v_payment
  from public.financial_records f
  where f.company_id=new.company_id and f.credit_id=new.id and f.type='payment'
    and f.credit_payment and not f.is_deleted
    and (f.created_at=now() or f.updated_at=now())
  having count(*)=1;
  if v_payment is null then return new; end if;

  insert into fleetease_private.credit_settlement_reversal_context
    (credit_id,company_id,payment_id,assignment_id,partner_id,settled_at)
  values (new.id,new.company_id,v_payment,v_assignment,v_partner,now());
  return new;
end;
$$;
revoke all on function fleetease_private.capture_credit_settlement_reversal_context() from public, anon, authenticated;

drop trigger if exists trg_capture_credit_settlement_reversal_context on public.credits;
create trigger trg_capture_credit_settlement_reversal_context
before update of status on public.credits
for each row execute function fleetease_private.capture_credit_settlement_reversal_context();

create or replace function public.reopen_settled_credit(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_company uuid := public.auth_user_company_id();
  v_credit public.credits;
  v_vehicle public.vehicles;
  v_client public.clients;
  v_context fleetease_private.credit_settlement_reversal_context;
  v_result jsonb;
  v_start timestamptz := now();
begin
  if not exists (
    select 1 from public.users
    where id=v_actor and company_id=v_company and not is_deleted and role in ('admin','super_admin')
  ) then
    raise exception 'Solo un administrador puede reactivar un crédito liquidado.' using errcode='42501';
  end if;

  select c.* into v_credit
  from public.credits c
  join public.financial_records f on f.credit_id=c.id and f.company_id=c.company_id
  where f.id=p_payment_id and c.company_id=v_company and not c.is_deleted and c.status='completed'
    and f.type='payment' and f.credit_payment and not f.is_deleted
  for update of c;
  if not found then
    raise exception 'No se encontró un crédito liquidado para este pago.';
  end if;

  select * into v_context from fleetease_private.credit_settlement_reversal_context
  where credit_id=v_credit.id and company_id=v_company and payment_id=p_payment_id;
  if not found then
    raise exception 'No hay un registro verificable de liquidación para este pago. Revisa la entrega manualmente.';
  end if;

  perform 1 from public.financial_records
  where id=p_payment_id and company_id=v_company and credit_id=v_credit.id
    and type='payment' and credit_payment and not is_deleted for update;
  if not found then raise exception 'El pago de liquidación cambió. Actualiza el historial.'; end if;

  select * into v_vehicle from public.vehicles
  where id=v_credit.vehicle_id and company_id=v_company and not is_deleted for update;
  select * into v_client from public.clients
  where id=v_credit.client_id and company_id=v_company and not is_deleted for update;

  if v_vehicle.id is null or v_client.id is null
    or v_start<v_context.settled_at
    or v_vehicle.status is distinct from 'sold' or v_vehicle.updated_at is distinct from v_context.settled_at
    or v_vehicle.partner_id is not null or v_vehicle.client_id is not null
    or v_vehicle.locked_by_credit or v_vehicle.associated_credit_id is not null
    or coalesce(v_client.has_active_credit,false) or v_client.active_credit_id is not null
    or v_client.assigned_vehicle_id is not null
    or exists (
      select 1 from public.vehicle_assignment_logs l
      where l.company_id=v_company and (l.vehicle_id=v_vehicle.id or l.client_id=v_client.id)
        and l.id<>v_context.assignment_id
        and (l.assigned_at>=v_context.settled_at or l.unassigned_at is null or l.unassigned_at>v_context.settled_at)
    )
    or not exists (
      select 1 from public.vehicle_assignment_logs l
      where l.id=v_context.assignment_id and l.company_id=v_company and l.vehicle_id=v_vehicle.id
        and l.client_id=v_client.id and l.unassigned_at=v_context.settled_at
    )
    or exists (
      select 1 from public.financial_records f
      where f.company_id=v_company and (f.vehicle_id=v_vehicle.id or f.credit_id=v_credit.id)
        and greatest(f.created_at,f.updated_at)>v_context.settled_at
    )
    or exists (
      select 1 from public.mileage_logs m where m.company_id=v_company and m.vehicle_id=v_vehicle.id
        and greatest(m.created_at,m.updated_at)>v_context.settled_at
    )
    or exists (
      select 1 from public.multas m where m.company_id=v_company and m.vehicle_id=v_vehicle.id
        and greatest(m.created_at,m.updated_at)>v_context.settled_at
    )
    or exists (
      select 1 from public.vehicle_inspections i where i.company_id=v_company and i.vehicle_id=v_vehicle.id
        and greatest(i.created_at,i.updated_at)>v_context.settled_at
    )
    or exists (
      select 1 from public.seguimientos s where s.company_id=v_company and s.vehicle_id=v_vehicle.id
        and s.timestamp>v_context.settled_at
    )
    or exists (
      select 1 from public.credits c where c.company_id=v_company and c.id<>v_credit.id
        and (c.vehicle_id=v_vehicle.id or c.client_id=v_client.id)
        and ((not c.is_deleted and c.status='active') or c.updated_at>v_context.settled_at)
    )
  then
    raise exception 'El vehículo o el cliente tienen cambios posteriores a la liquidación. Revisa la entrega manualmente.';
  end if;

  update public.vehicles set status='active', partner_id=v_context.partner_id
  where id=v_vehicle.id and company_id=v_company;
  insert into public.vehicle_assignment_logs
    (company_id,vehicle_id,client_id,assigned_at,end_date,assigned_by,reason,odometer_reading)
  values (v_company,v_vehicle.id,v_client.id,v_start,null,v_actor,'Reactivación de crédito por corrección de pago',v_vehicle.current_mileage);

  v_result:=public.delete_financial_payment_atomic(p_payment_id);
  if not exists (
    select 1 from public.credits
    where id=v_credit.id and company_id=v_company and status='active' and remaining_balance>0
  ) then
    raise exception 'La reversión no produjo un saldo pendiente. No se reactivó el crédito.';
  end if;
  delete from fleetease_private.credit_settlement_reversal_context where credit_id=v_credit.id;
  return v_result;
end;
$$;
revoke all on function public.reopen_settled_credit(uuid) from public, anon;
grant execute on function public.reopen_settled_credit(uuid) to authenticated;
