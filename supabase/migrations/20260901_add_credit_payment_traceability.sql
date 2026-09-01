alter table public.financial_records
  add column if not exists credit_payment_schedule_id uuid references public.credit_payment_schedules(id) on delete set null;

create index if not exists idx_financial_records_credit_payment_schedule
  on public.financial_records(credit_payment_schedule_id)
  where credit_payment_schedule_id is not null;

create or replace function public.auto_link_credit_payment_records()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  grant_record_id uuid;
begin
  if new.is_deleted = true or new.type <> 'payment' or coalesce(new.credit_payment, false) <> true then
    return new;
  end if;

  select fr.id
    into grant_record_id
  from public.financial_records fr
  where fr.company_id = new.company_id
    and fr.credit_id = new.credit_id
    and fr.type = 'income'
    and coalesce(fr.credit_granted, false) = true
    and fr.is_deleted = false
  order by fr.date asc, fr.created_at asc
  limit 1;

  if grant_record_id is not null then
    insert into public.financial_record_links (
      company_id, source_financial_record_id, target_financial_record_id,
      relationship_type, created_by
    ) values (
      new.company_id, new.id, grant_record_id,
      'credit_payment_to_income', auth.uid()
    )
    on conflict (source_financial_record_id, target_financial_record_id, relationship_type) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.auto_link_credit_payment_records() from public;

drop trigger if exists trg_auto_link_credit_payment_records on public.financial_records;
create trigger trg_auto_link_credit_payment_records
after insert on public.financial_records
for each row
when (new.type = 'payment' and coalesce(new.credit_payment, false) = true)
execute function public.auto_link_credit_payment_records();