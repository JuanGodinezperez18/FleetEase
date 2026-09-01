-- FleetEase: financial record traceability links
-- This migration mirrors the production migration already applied as
-- financialrecordlinkstraceabilityv3fix. It is intentionally idempotent so
-- future environments can reproduce the traceability model.

create table if not exists public.financial_record_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  source_financial_record_id uuid not null references public.financial_records(id),
  target_financial_record_id uuid not null references public.financial_records(id),
  relationship_type text not null check (relationship_type in (
    'client_payment_to_income',
    'credit_payment_to_income',
    'payment_to_schedule',
    'writeoff_of_client_debt',
    'adjustment_to_record',
    'related'
  )),
  created_by uuid null,
  created_at timestamptz not null default now(),
  constraint financial_record_links_no_self_link
    check (source_financial_record_id <> target_financial_record_id),
  constraint financial_record_links_unique_relationship
    unique (source_financial_record_id, target_financial_record_id, relationship_type)
);

create index if not exists idx_financial_record_links_source
  on public.financial_record_links(source_financial_record_id);
create index if not exists idx_financial_record_links_target
  on public.financial_record_links(target_financial_record_id);
create index if not exists idx_financial_record_links_company
  on public.financial_record_links(company_id);

alter table public.financial_record_links enable row level security;

revoke all on public.financial_record_links from anon;
grant select, insert on public.financial_record_links to authenticated;

drop policy if exists financial_record_links_select_company on public.financial_record_links;
create policy financial_record_links_select_company
  on public.financial_record_links
  for select
  to authenticated
  using (
    company_id = get_user_company_id()
    or auth_user_role() = 'super_admin'
  );

drop policy if exists financial_record_links_insert_company on public.financial_record_links;
create policy financial_record_links_insert_company
  on public.financial_record_links
  for insert
  to authenticated
  with check (
    company_id = get_user_company_id()
    or auth_user_role() = 'super_admin'
  );

create or replace function public.link_financial_records(
  p_source_financial_record_id uuid,
  p_target_financial_record_id uuid,
  p_relationship_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.financial_records%rowtype;
  v_target public.financial_records%rowtype;
  v_company_id uuid;
  v_link_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if p_source_financial_record_id = p_target_financial_record_id then
    raise exception 'Un registro no puede enlazarse consigo mismo';
  end if;

  if p_relationship_type not in (
    'client_payment_to_income',
    'credit_payment_to_income',
    'payment_to_schedule',
    'writeoff_of_client_debt',
    'adjustment_to_record',
    'related'
  ) then
    raise exception 'Tipo de relación no permitido';
  end if;

  select * into v_source
  from public.financial_records
  where id = p_source_financial_record_id
  for update;

  select * into v_target
  from public.financial_records
  where id = p_target_financial_record_id
  for update;

  if v_source.id is null or v_target.id is null then
    raise exception 'Registro financiero no encontrado';
  end if;
  if coalesce(v_source.is_deleted, false) or coalesce(v_target.is_deleted, false) then
    raise exception 'No se pueden enlazar registros eliminados';
  end if;
  if v_source.company_id is distinct from v_target.company_id then
    raise exception 'No se pueden enlazar registros de empresas diferentes';
  end if;

  v_company_id := v_source.company_id;
  if auth_user_role() <> 'super_admin'
     and v_company_id is distinct from get_user_company_id() then
    raise exception 'No autorizado para enlazar estos registros';
  end if;

  insert into public.financial_record_links (
    company_id,
    source_financial_record_id,
    target_financial_record_id,
    relationship_type,
    created_by
  ) values (
    v_company_id,
    p_source_financial_record_id,
    p_target_financial_record_id,
    p_relationship_type,
    auth.uid()
  )
  on conflict (source_financial_record_id, target_financial_record_id, relationship_type)
  do update set company_id = excluded.company_id
  returning id into v_link_id;

  return jsonb_build_object(
    'id', v_link_id,
    'companyId', v_company_id,
    'sourceFinancialRecordId', p_source_financial_record_id,
    'targetFinancialRecordId', p_target_financial_record_id,
    'relationshipType', p_relationship_type
  );
end;
$$;

revoke all on function public.link_financial_records(uuid, uuid, text) from public;
grant execute on function public.link_financial_records(uuid, uuid, text) to authenticated;
