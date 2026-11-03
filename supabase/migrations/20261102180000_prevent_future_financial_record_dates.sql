-- Reject future-dated financial records at the database boundary.
-- This covers create_financial_record, create_expense_atomic, and any other
-- INSERT/UPDATE path that writes financial_records.

create or replace function public.reject_future_financial_record_date()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  business_today date := timezone('America/Monterrey', now())::date;
begin
  if new.date > business_today then
    raise exception 'FINANCIAL_DATE_IN_FUTURE' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke execute on function public.reject_future_financial_record_date() from public, anon, authenticated;

drop trigger if exists trg_reject_future_financial_record_date on public.financial_records;
create trigger trg_reject_future_financial_record_date
before insert or update of date on public.financial_records
for each row execute function public.reject_future_financial_record_date();

comment on function public.reject_future_financial_record_date() is
  'Rejects financial record dates after the current America/Monterrey business date for every write path, including create_financial_record and create_expense_atomic.';
