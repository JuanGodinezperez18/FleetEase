-- Separación de pagos de ingresos/gastos + trazabilidad de aplicación.
-- Idempotente para poder ejecutarse en entornos existentes.

alter table public.financial_categories
  add column if not exists payment_kind text;

alter table public.financial_records
  add column if not exists payment_kind text;

alter table public.financial_record_links
  add column if not exists amount_applied numeric(14,2);

create index if not exists idx_financial_records_payment_kind
  on public.financial_records(payment_kind)
  where type = 'payment' and is_deleted = false;

create index if not exists idx_financial_record_links_source
  on public.financial_record_links(source_financial_record_id);

create index if not exists idx_financial_record_links_target
  on public.financial_record_links(target_financial_record_id);

-- Clasificación única para todos los pagos. Los nombres históricos se
-- conservan para no romper registros existentes, pero dejan de ser ingresos.
update public.financial_categories
set type = 'payment', affects = 'client_balance', payment_kind = 'client_payment'
where lower(trim(name)) in ('pago de cliente', 'pago cliente', 'abono de cliente');

update public.financial_categories
set type = 'payment', affects = 'partner_balance', payment_kind = 'partner_payment'
where lower(trim(name)) in ('pago a socio', 'pago de socio', 'abono a socio');

update public.financial_categories
set type = 'payment', affects = 'none', payment_kind = 'supplier_payment'
where lower(trim(name)) in ('pago a proveedor', 'pago de proveedor', 'abono a proveedor');

update public.financial_categories
set type = 'payment', affects = 'credit_payment', payment_kind = 'credit_payment'
where lower(trim(name)) in ('pago de crédito', 'pago credito', 'pago de crédito semanal');

update public.financial_categories
set payment_kind = case
  when lower(trim(name)) like 'pago%cliente%' then 'client_payment'
  when lower(trim(name)) like 'pago%proveedor%' then 'supplier_payment'
  when lower(trim(name)) like 'pago%socio%' then 'partner_payment'
  when lower(trim(name)) like 'pago%crédito%' or lower(trim(name)) like 'pago%credito%' then 'credit_payment'
  else payment_kind
end
where type = 'payment';

-- Todos los registros existentes heredan la clasificación de su categoría.
update public.financial_records fr
set payment_kind = fc.payment_kind
from public.financial_categories fc
where fr.category_id = fc.id
  and fr.type = 'payment'
  and fr.payment_kind is distinct from fc.payment_kind;

-- En el nuevo modelo, un pago de cliente siempre reduce la cuenta por cobrar.
-- El trigger existente de balances consume la afectación de la categoría; esta
-- normalización garantiza que el dato persistido también sea inequívoco.

-- Los pagos de crédito quedan ligados a su crédito y a su registro de crédito
-- otorgado mediante financial_record_links. Para registros históricos sin link,
-- crear la relación de forma idempotente.
insert into public.financial_record_links (
  company_id,
  source_financial_record_id,
  target_financial_record_id,
  relationship_type,
  amount_applied,
  created_by
)
select
  p.company_id,
  p.id,
  g.id,
  'credit_payment_to_income',
  p.amount,
  p.created_by
from public.financial_records p
join public.financial_records g
  on g.company_id = p.company_id
 and g.credit_id = p.credit_id
 and g.type = 'income'
 and coalesce(g.credit_granted, false) = true
 and g.is_deleted = false
where p.type = 'payment'
  and coalesce(p.credit_payment, false) = true
  and p.credit_id is not null
  and p.is_deleted = false
  and not exists (
    select 1 from public.financial_record_links l
    where l.source_financial_record_id = p.id
      and l.target_financial_record_id = g.id
      and l.relationship_type = 'credit_payment_to_income'
  );

-- Validación de consistencia: payment_kind solo se usa para registros de pago.
alter table public.financial_records
  drop constraint if exists financial_records_payment_kind_check;
alter table public.financial_records
  add constraint financial_records_payment_kind_check
  check (payment_kind is null or type = 'payment');
