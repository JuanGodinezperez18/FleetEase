revoke execute on function public.link_financial_records(uuid, uuid, text) from anon;

create or replace function public.auto_link_credit_payment_to_grant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  grant_id uuid;
begin
  if new.is_deleted is distinct from true
     and new.type = 'payment'
     and new.credit_payment is true
     and new.credit_id is not null then
    select fr.id
      into grant_id
      from public.financial_records fr
     where fr.company_id = new.company_id
       and fr.credit_id = new.credit_id
       and fr.credit_granted is true
       and fr.type = 'income'
       and fr.is_deleted is not true
     order by fr.date asc, fr.created_at asc
     limit 1;

    if grant_id is not null and grant_id <> new.id then
      perform public.link_financial_records(
        new.id,
        grant_id,
        'credit_payment_to_income'
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.auto_link_credit_payment_to_grant() from public;
grant execute on function public.auto_link_credit_payment_to_grant() to authenticated;

drop trigger if exists trg_auto_link_credit_payment_to_grant on public.financial_records;
create trigger trg_auto_link_credit_payment_to_grant
after insert on public.financial_records
for each row
when (new.type = 'payment' and new.credit_payment = true)
execute function public.auto_link_credit_payment_to_grant();
