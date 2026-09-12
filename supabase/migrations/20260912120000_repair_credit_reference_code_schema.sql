begin;

-- Production repair: create_credit_atomic relies on the credit reference-code
-- trigger, but some environments have the trigger without the credits column.
-- Keep this migration idempotent so it safely repairs schema drift.
alter table public.credits
  add column if not exists reference_code text;

create unique index if not exists credits_company_reference_code_uidx
  on public.credits(company_id, reference_code)
  where reference_code is not null;

-- Recreate the trigger after the column is guaranteed to exist. The trigger
-- function is defined by the traceability migration and assigns CRE-XXXXXXX
-- reference codes automatically.
drop trigger if exists credits_assign_fleetease_reference_code on public.credits;
create trigger credits_assign_fleetease_reference_code
  before insert on public.credits
  for each row
  execute function public.assign_fleetease_reference_code();

commit;
