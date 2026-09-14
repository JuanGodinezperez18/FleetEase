-- FleetEase: compras a proveedores + cuentas por pagar.
-- Las compras son transacciones financieras independientes de los gastos
-- asociados a vehículos. Las asignaciones permiten distribuir una compra
-- entre varios gastos de vehículo sin duplicar el gasto operativo.

alter table public.financial_records
  add column if not exists record_origin text;

alter table public.financial_records
  drop constraint if exists financial_records_record_origin_check;

alter table public.financial_records
  add constraint financial_records_record_origin_check
  check (record_origin is null or record_origin in (
    'vehicle_expense',
    'supplier_purchase',
    'partner_paid_expense'
  ));

create index if not exists idx_financial_records_supplier_origin
  on public.financial_records(company_id, record_origin, date desc)
  where is_deleted = false;

create table if not exists public.supplier_purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  financial_record_id uuid unique references public.financial_records(id) on delete set null,
  purchase_date date not null default current_date,
  reference text,
  payment_method text not null default 'cash',
  status text not null default 'paid',
  due_date date,
  total numeric(14,2) not null check (total > 0),
  notes text,
  evidence_urls text[],
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint supplier_purchases_payment_method_check
    check (payment_method in ('cash','credit')),
  constraint supplier_purchases_status_check
    check (status in ('paid','pending','partially_paid','cancelled')),
  constraint supplier_purchases_credit_due_date_check
    check (payment_method <> 'credit' or due_date is not null)
);

create table if not exists public.supplier_purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.supplier_purchases(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_purchase_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchase_id uuid not null references public.supplier_purchases(id) on delete cascade,
  financial_record_id uuid not null references public.financial_records(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint supplier_purchase_allocations_unique
    unique (purchase_id, financial_record_id)
);

create table if not exists public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  party_type text not null,
  party_id uuid not null,
  source_financial_record_id uuid references public.financial_records(id) on delete set null,
  supplier_purchase_id uuid references public.supplier_purchases(id) on delete set null,
  original_amount numeric(14,2) not null check (original_amount > 0),
  due_date date,
  status text not null default 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint accounts_payable_party_type_check
    check (party_type in ('supplier','partner')),
  constraint accounts_payable_status_check
    check (status in ('pending','partially_paid','paid','cancelled'))
);

create index if not exists idx_supplier_purchases_company_date
  on public.supplier_purchases(company_id, purchase_date desc)
  where is_deleted = false;
create index if not exists idx_supplier_purchases_supplier
  on public.supplier_purchases(supplier_id)
  where is_deleted = false;
create index if not exists idx_supplier_purchase_items_purchase
  on public.supplier_purchase_items(purchase_id);
create index if not exists idx_supplier_purchase_allocations_purchase
  on public.supplier_purchase_allocations(purchase_id);
create index if not exists idx_supplier_purchase_allocations_financial
  on public.supplier_purchase_allocations(financial_record_id);
create index if not exists idx_accounts_payable_company_status_due
  on public.accounts_payable(company_id, status, due_date)
  where is_deleted = false;
create index if not exists idx_accounts_payable_party
  on public.accounts_payable(party_type, party_id)
  where is_deleted = false;

-- Existing supplier payment RPC must be able to settle supplier purchase
-- expense records. Client payments remain tied to income records.
create or replace function public.create_financial_payment(
  p_company_id uuid,
  p_payment_kind text,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text default null,
  p_reference text default null,
  p_client_id uuid default null,
  p_partner_id uuid default null,
  p_supplier_id uuid default null,
  p_target_financial_record_id uuid default null,
  p_credit_id uuid default null,
  p_credit_payment_schedule_id uuid default null,
  p_created_by uuid default null
)
returns public.financial_records
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.financial_records;
  v_target public.financial_records;
  v_applied numeric(14,2);
  v_outstanding numeric(14,2);
  v_category_id uuid;
  v_expected_target_type text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto del pago debe ser mayor que cero';
  end if;

  if p_payment_kind not in ('client_payment','partner_payment','supplier_payment','credit_payment') then
    raise exception 'Tipo de pago no válido: %', p_payment_kind;
  end if;

  if p_target_financial_record_id is not null then
    v_expected_target_type := case
      when p_payment_kind in ('partner_payment','supplier_payment') then 'expense'
      else 'income'
    end;

    select * into v_target
    from public.financial_records
    where id = p_target_financial_record_id
      and company_id = p_company_id
      and is_deleted = false
    for update;

    if not found then
      raise exception 'El cargo financiero indicado no existe o no pertenece a la empresa';
    end if;

    if v_target.type <> v_expected_target_type then
      raise exception 'El registro seleccionado no corresponde al tipo de obligación del pago';
    end if;

    select coalesce(sum(amount_applied),0) into v_applied
    from public.financial_record_links
    where target_financial_record_id = v_target.id;

    v_outstanding := greatest(0, v_target.amount - v_applied);

    if p_amount > v_outstanding then
      raise exception 'El pago de % excede el saldo pendiente de %', p_amount, v_outstanding;
    end if;
  end if;

  select id into v_category_id
  from public.financial_categories
  where company_id = p_company_id
    and type = 'payment'
    and payment_kind = p_payment_kind
  order by created_at nulls last
  limit 1;

  if v_category_id is null then
    raise exception 'No existe categoría financiera para %', p_payment_kind;
  end if;

  insert into public.financial_records (
    company_id, type, category_id, category, amount, date,
    payment_method, reference, client_id, partner_id, supplier_id,
    credit_id, credit_payment, credit_payment_schedule_id,
    payment_kind, created_by, is_deleted
  )
  select
    p_company_id, 'payment', v_category_id,
    fc.name, p_amount, coalesce(p_payment_date, current_date),
    p_payment_method, p_reference, p_client_id, p_partner_id, p_supplier_id,
    p_credit_id, p_payment_kind = 'credit_payment', p_credit_payment_schedule_id,
    p_payment_kind, p_created_by, false
  from public.financial_categories fc
  where fc.id = v_category_id
  returning * into v_payment;

  if p_target_financial_record_id is not null then
    insert into public.financial_record_links (
      company_id, source_financial_record_id, target_financial_record_id,
      relationship_type, amount_applied, created_by
    ) values (
      p_company_id, v_payment.id, p_target_financial_record_id,
      p_payment_kind || '_to_financial_record', p_amount, p_created_by
    );
  end if;

  return v_payment;
end;
$$;
