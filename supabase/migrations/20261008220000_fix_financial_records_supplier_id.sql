-- Fix: financial_records.supplier_id required by create_supplier_purchase / register_payment RPCs.
-- The column was defined in 20260905230000 but may be missing in some environments.

alter table public.financial_records
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

alter table public.financial_records
  add column if not exists payment_kind text;

alter table public.financial_records
  add column if not exists record_origin text;

create index if not exists idx_financial_records_supplier
  on public.financial_records(supplier_id)
  where supplier_id is not null;

-- Optional safety: allow record_origin values used by supplier purchases
alter table public.financial_records drop constraint if exists financial_records_record_origin_check;
alter table public.financial_records
  add constraint financial_records_record_origin_check
  check (
    record_origin is null
    or record_origin in ('vehicle_expense', 'supplier_purchase', 'partner_paid_expense')
  );
