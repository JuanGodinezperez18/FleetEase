-- FleetEase critical financial security hardening
-- Defense-in-depth: DB rejects forged financial semantics even when the client bypasses React.

create or replace function public.enforce_financial_record_integrity()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare caller_company uuid; caller_role text; category_company uuid; rel_company uuid;
begin
  caller_company := public.auth_user_company_id(); caller_role := public.auth_user_role();
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if caller_role <> 'super_admin' and new.company_id is distinct from caller_company then raise exception 'FINANCIAL_COMPANY_MISMATCH'; end if;
  if new.amount is null or new.amount <= 0 then raise exception 'FINANCIAL_AMOUNT_INVALID'; end if;
  if new.type not in ('income','expense','payment') then raise exception 'FINANCIAL_TYPE_INVALID'; end if;
  if new.category_id is null then raise exception 'FINANCIAL_CATEGORY_REQUIRED'; end if;
  select fc.company_id into category_company from public.financial_categories fc where fc.id = new.category_id;
  if not found then raise exception 'FINANCIAL_CATEGORY_NOT_FOUND'; end if;
  if category_company is not null and category_company is distinct from new.company_id then raise exception 'FINANCIAL_CATEGORY_COMPANY_MISMATCH'; end if;
  if new.client_id is not null then select c.company_id into rel_company from public.clients c where c.id = new.client_id; if not found or rel_company is distinct from new.company_id then raise exception 'FINANCIAL_CLIENT_COMPANY_MISMATCH'; end if; end if;
  if new.vehicle_id is not null then select v.company_id into rel_company from public.vehicles v where v.id = new.vehicle_id; if not found or rel_company is distinct from new.company_id then raise exception 'FINANCIAL_VEHICLE_COMPANY_MISMATCH'; end if; end if;
  if new.partner_id is not null then select p.company_id into rel_company from public.partners p where p.id = new.partner_id; if not found or rel_company is distinct from new.company_id then raise exception 'FINANCIAL_PARTNER_COMPANY_MISMATCH'; end if; end if;
  if new.credit_id is not null then select cr.company_id into rel_company from public.credits cr where cr.id = new.credit_id; if not found or rel_company is distinct from new.company_id then raise exception 'FINANCIAL_CREDIT_COMPANY_MISMATCH'; end if; end if;
  if coalesce(new.credit_payment,false) and (new.type <> 'payment' or new.credit_id is null) then raise exception 'CREDIT_PAYMENT_SEMANTICS_INVALID'; end if;
  if coalesce(new.credit_granted,false) and (new.type <> 'income' or new.credit_id is null) then raise exception 'CREDIT_GRANTED_SEMANTICS_INVALID'; end if;
  if new.payment_kind is not null and new.type <> 'payment' then raise exception 'PAYMENT_KIND_REQUIRES_PAYMENT_TYPE'; end if;
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id or new.amount is distinct from old.amount or new.type is distinct from old.type or new.category_id is distinct from old.category_id or new.client_id is distinct from old.client_id or new.vehicle_id is distinct from old.vehicle_id or new.partner_id is distinct from old.partner_id or new.credit_id is distinct from old.credit_id or new.credit_payment is distinct from old.credit_payment or new.credit_granted is distinct from old.credit_granted or new.payment_kind is distinct from old.payment_kind or new.created_by is distinct from old.created_by then
      if caller_role <> 'super_admin' then raise exception 'FINANCIAL_SENSITIVE_FIELDS_IMMUTABLE'; end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end; $$;
revoke execute on function public.enforce_financial_record_integrity() from public, anon, authenticated;
drop trigger if exists trg_enforce_financial_record_integrity on public.financial_records;
create trigger trg_enforce_financial_record_integrity before insert or update on public.financial_records for each row execute function public.enforce_financial_record_integrity();
revoke execute on function public.link_expense_mileage_log() from public, anon, authenticated;
revoke execute on function public.set_financial_record_category_name() from public, anon, authenticated;
revoke execute on function public.sync_client_security_deposit_from_financial_record() from public, anon, authenticated;
revoke execute on function public.link_financial_records(uuid,uuid,text) from public, anon;
grant execute on function public.link_financial_records(uuid,uuid,text) to authenticated;
revoke execute on function public.offboard_client_with_writeoff(uuid,text) from public, anon;
grant execute on function public.offboard_client_with_writeoff(uuid,text) to authenticated;
DO $$ declare r record; begin for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='process_multa_payment' loop execute format('revoke execute on function %s from public, anon', r.oid::regprocedure); execute format('grant execute on function %s to authenticated', r.oid::regprocedure); end loop; end $$;
alter function public.link_financial_records(uuid,uuid,text) set search_path='';
alter function public.offboard_client_with_writeoff(uuid,text) set search_path='';
alter function public.link_expense_mileage_log() set search_path='';
alter function public.set_financial_record_category_name() set search_path='';
alter function public.sync_client_security_deposit_from_financial_record() set search_path='';
comment on function public.enforce_financial_record_integrity() is 'Critical DB guard: validates tenant ownership, financial relationships, semantic flags and immutable financial fields.';
