-- Persistencia de gastos multilínea.
-- Un gasto sigue siendo UN financial_record; sus conceptos se conservan
-- en JSONB para no crear varios movimientos financieros por una sola compra.

alter table public.financial_records
  add column if not exists items jsonb;

comment on column public.financial_records.items is
  'Detalle de líneas de un gasto multilínea. No representa movimientos financieros adicionales; amount del registro es el total.';

create index if not exists idx_financial_records_items_gin
  on public.financial_records using gin (items)
  where type = 'expense' and items is not null;
