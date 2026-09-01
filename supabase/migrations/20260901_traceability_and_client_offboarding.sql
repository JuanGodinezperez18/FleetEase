-- FleetEase: trazabilidad, referencias visibles y baja contable de clientes
-- No elimina historial. Los procesos de baja/desactivación son reversibles a nivel de datos
-- y dejan evidencia de quién, cuándo, por qué y qué registros financieros fueron afectados.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Referencias humanas visibles, sin sustituir los UUID internos.
-- -----------------------------------------------------------------------------
alter table public.clients
  add column if not exists reference_code text;

alter table public.credits
  add column if not exists reference_code text;

alter table public.financial_records
  add column if not exists reference_code text,
  add column if not exists source_record_id uuid,
  add column if not exists source_record_type text,
  add column if not exists related_record_id uuid,
  add column if not exists related_record_type text;

create unique index if not exists clients_reference_code_company_uidx
  on public.clients(company_id, reference_code)
  where reference_code is not null;

create unique index if not exists credits_reference_code_company_uidx
  on public.credits(company_id, reference_code)
  where reference_code is not null;

create unique index if not exists financial_records_reference_code_company_uidx
  on public.financial_records(company_id, reference_code)
  where reference_code is not null;

-- Secuencias por compañía. Los UUID siguen siendo la identidad técnica; estos
-- códigos son los que el usuario puede citar en comprobantes y soporte.
create or replace function public.next_fleetease_reference_code(
  p_company_id uuid,
  p_prefix text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  -- Advisory lock evita colisiones concurrentes dentro de una misma empresa/tipo.
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_company_id::text,'global') || ':' || p_prefix, 0));
  select coalesce(max((substring(reference_code from '[0-9]+$'))::bigint), 0) + 1
    into n
  from (
    select reference_code from public.clients where company_id = p_company_id and reference_code like p_prefix || '-%'
    union all
    select reference_code from public.credits where company_id = p_company_id and reference_code like p_prefix || '-%'
    union all
    select reference_code from public.financial_records where company_id = p_company_id and reference_code like p_prefix || '-%'
  ) s;
  return p_prefix || '-' || lpad(n::text, 7, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- 2) Libro de trazabilidad inmutable de operaciones de negocio.
-- -----------------------------------------------------------------------------
create table if not exists public.record_audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null,
  entity_type text not null,
  entity_id uuid not null,
  entity_reference_code text null,
  action text not null check (action in ('INSERT','UPDATE','DELETE','SOFT_DELETE','WRITE_OFF','LINK')),
  actor_user_id uuid null,
  occurred_at timestamptz not null default now(),
  old_data jsonb null,
  new_data jsonb null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists record_audit_log_entity_idx
  on public.record_audit_log(entity_type, entity_id, occurred_at desc);
create index if not exists record_audit_log_company_idx
  on public.record_audit_log(company_id, occurred_at desc);

alter table public.record_audit_log enable row level security;

drop policy if exists "audit log company read" on public.record_audit_log;
create policy "audit log company read"
  on public.record_audit_log for select to authenticated
  using (
    company_id is null
    or company_id = public.get_user_company_id(auth.uid())
    or public.is_super_admin(auth.uid())
  );

create or replace function public.audit_business_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_json jsonb;
  new_json jsonb;
  company uuid;
  entity uuid;
  action_name text;
  ref_code text;
begin
  old_json := case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) else null end;
  new_json := case when TG_OP in ('INSERT','UPDATE') then to_jsonb(NEW) else null end;
  entity := coalesce((new_json->>'id')::uuid, (old_json->>'id')::uuid);
  company := coalesce((new_json->>'company_id')::uuid, (old_json->>'company_id')::uuid);
  ref_code := coalesce(new_json->>'reference_code', old_json->>'reference_code');

  if TG_OP = 'INSERT' then
    action_name := 'INSERT';
  elsif TG_OP = 'DELETE' then
    action_name := 'DELETE';
  elsif coalesce((new_json->>'is_deleted')::boolean, false)
        and not coalesce((old_json->>'is_deleted')::boolean, false) then
    action_name := 'SOFT_DELETE';
  else
    action_name := 'UPDATE';
  end if;

  insert into public.record_audit_log(
    company_id, entity_type, entity_id, entity_reference_code,
    action, actor_user_id, old_data, new_data
  ) values (
    company, TG_TABLE_NAME, entity, ref_code,
    action_name, auth.uid(), old_json, new_json
  );

  return coalesce(NEW, OLD);
end;
$$;

-- El trigger es defensivo: registra también operaciones directas hechas por
-- servicios internos, no solamente las realizadas desde React.
drop trigger if exists trg_clients_audit on public.clients;
create trigger trg_clients_audit after insert or update or delete on public.clients
for each row execute function public.audit_business_record();

drop trigger if exists trg_credits_audit on public.credits;
create trigger trg_credits_audit after insert or update or delete on public.credits
for each row execute function public.audit_business_record();

drop trigger if exists trg_financial_records_audit on public.financial_records;
create trigger trg_financial_records_audit after insert or update or delete on public.financial_records
for each row execute function public.audit_business_record();

drop trigger if exists trg_credit_schedule_audit on public.credit_payment_schedules;
create trigger trg_credit_schedule_audit after insert or update or delete on public.credit_payment_schedules
for each row execute function public.audit_business_record();

-- -----------------------------------------------------------------------------
-- 3) Libro explícito de bajas por incobrabilidad.
-- -----------------------------------------------------------------------------
create table if not exists public.client_write_offs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  client_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  financial_record_id uuid null,
  reason text not null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  reversed_at timestamptz null,
  reversed_by uuid null,
  reversal_reason text null
);

create index if not exists client_write_offs_client_idx
  on public.client_write_offs(client_id, created_at desc);
create index if not exists client_write_offs_company_idx
  on public.client_write_offs(company_id, created_at desc);

alter table public.client_write_offs enable row level security;

drop policy if exists "client write offs company read" on public.client_write_offs;
create policy "client write offs company read"
  on public.client_write_offs for select to authenticated
  using (company_id = public.get_user_company_id(auth.uid()) or public.is_super_admin(auth.uid()));

alter table public.clients
  add column if not exists written_off_amount numeric(14,2) not null default 0,
  add column if not exists write_off_reason text,
  add column if not exists written_off_at timestamptz,
  add column if not exists written_off_by uuid;

-- -----------------------------------------------------------------------------
-- 4) Alta automática de referencias para nuevos registros.
-- -----------------------------------------------------------------------------
create or replace function public.assign_fleetease_reference_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reference_code is null and new.company_id is not null then
    if TG_TABLE_NAME = 'clients' then
      new.reference_code := public.next_fleetease_reference_code(new.company_id, 'CLI');
    elsif TG_TABLE_NAME = 'credits' then
      new.reference_code := public.next_fleetease_reference_code(new.company_id, 'CRE');
    elsif TG_TABLE_NAME = 'financial_records' then
      new.reference_code := public.next_fleetease_reference_code(new.company_id, 'FIN');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clients_reference_code on public.clients;
create trigger trg_clients_reference_code before insert on public.clients
for each row execute function public.assign_fleetease_reference_code();

drop trigger if exists trg_credits_reference_code on public.credits;
create trigger trg_credits_reference_code before insert on public.credits
for each row execute function public.assign_fleetease_reference_code();

drop trigger if exists trg_financial_records_reference_code on public.financial_records;
create trigger trg_financial_records_reference_code before insert on public.financial_records
for each row execute function public.assign_fleetease_reference_code();

-- Backfill de registros existentes que aún no tengan código visible.
update public.clients c
set reference_code = public.next_fleetease_reference_code(c.company_id, 'CLI')
where c.reference_code is null and c.company_id is not null;

update public.credits c
set reference_code = public.next_fleetease_reference_code(c.company_id, 'CRE')
where c.reference_code is null and c.company_id is not null;

update public.financial_records f
set reference_code = public.next_fleetease_reference_code(f.company_id, 'FIN')
where f.reference_code is null and f.company_id is not null;

-- -----------------------------------------------------------------------------
-- 5) Función transaccional de baja de cliente.
--    Regla: deuda > 0 => se crea un gasto/pérdida por incobrable, se conserva
--    el cliente, se marca inactivo y se deja el saldo histórico en write-off.
-- -----------------------------------------------------------------------------
create or replace function public.offboard_client_with_writeoff(
  p_client_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.clients%rowtype;
  amount_to_writeoff numeric(14,2);
  category_id uuid;
  financial_id uuid;
  writeoff_id uuid;
begin
  select * into c from public.clients where id = p_client_id for update;
  if not found then raise exception 'Cliente no encontrado'; end if;

  if c.is_deleted then
    raise exception 'El cliente ya está dado de baja/eliminado lógicamente';
  end if;

  if not (c.company_id = public.get_user_company_id(auth.uid()) or public.is_super_admin(auth.uid())) then
    raise exception 'No autorizado para esta empresa';
  end if;

  amount_to_writeoff := greatest(coalesce(c.balance,0), 0);

  if amount_to_writeoff > 0 then
    select id into category_id
    from public.financial_categories
    where company_id = c.company_id
      and lower(name) = lower('Pérdida por incobrable')
    order by is_default desc nulls last
    limit 1;

    if category_id is null then
      insert into public.financial_categories(name, type, affects, description, is_default, company_id, category)
      values ('Pérdida por incobrable', 'expense', 'none', 'Deuda de cliente dada de baja como incobrable', true, c.company_id, 'Pérdida por incobrable')
      returning id into category_id;
    end if;

    insert into public.financial_records(
      company_id, client_id, category_id, category, type, amount,
      description, date, is_deleted, notes, source_record_id, source_record_type
    ) values (
      c.company_id, c.id, category_id, 'Pérdida por incobrable', 'expense', amount_to_writeoff,
      'Baja de cliente: deuda incobrable', current_date, false,
      coalesce(p_reason,'Baja de cliente con saldo pendiente'), c.id, 'client'
    ) returning id into financial_id;

    insert into public.client_write_offs(
      company_id, client_id, amount, financial_record_id, reason, created_by
    ) values (
      c.company_id, c.id, amount_to_writeoff, financial_id,
      coalesce(p_reason,'Baja de cliente con saldo pendiente'), auth.uid()
    ) returning id into writeoff_id;
  end if;

  update public.clients
  set status = 'inactive',
      is_deleted = true,
      written_off_amount = amount_to_writeoff,
      write_off_reason = case when amount_to_writeoff > 0 then coalesce(p_reason,'Baja de cliente con saldo pendiente') else null end,
      written_off_at = case when amount_to_writeoff > 0 then now() else null end,
      written_off_by = case when amount_to_writeoff > 0 then auth.uid() else null end,
      updated_at = now()
  where id = c.id;

  return jsonb_build_object(
    'client_id', c.id,
    'client_reference_code', c.reference_code,
    'written_off_amount', amount_to_writeoff,
    'financial_record_id', financial_id,
    'write_off_id', writeoff_id,
    'status', 'inactive'
  );
end;
$$;

revoke all on function public.offboard_client_with_writeoff(uuid,text) from public;
grant execute on function public.offboard_client_with_writeoff(uuid,text) to authenticated;

-- No se permite borrar físicamente el expediente de un cliente desde el rol
-- autenticado. La aplicación debe utilizar el proceso de baja.
revoke delete on public.clients from authenticated;
revoke delete on public.credits from authenticated;
revoke delete on public.financial_records from authenticated;
revoke delete on public.credit_payment_schedules from authenticated;
