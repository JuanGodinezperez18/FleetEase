create or replace function public.get_credit_settlement_payments(p_company_id uuid)
returns table(credit_id uuid, payment_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_company_id is null
    or p_company_id is distinct from public.auth_user_company_id()
    or not exists (
      select 1 from public.users u
      where u.id=auth.uid() and u.company_id=p_company_id
        and not u.is_deleted and u.role in ('admin','editor','super_admin')
    )
  then
    raise exception 'No autorizado para consultar los pagos de liquidación.' using errcode='42501';
  end if;

  return query
    select ctx.credit_id, ctx.payment_id
    from fleetease_private.credit_settlement_reversal_context ctx
    join public.credits c on c.id=ctx.credit_id and c.company_id=ctx.company_id
    join public.financial_records f on f.id=ctx.payment_id
      and f.company_id=ctx.company_id and f.credit_id=ctx.credit_id
    where ctx.company_id=p_company_id and c.status='completed' and not c.is_deleted
      and f.type='payment' and f.credit_payment and not f.is_deleted;
end;
$$;
revoke all on function public.get_credit_settlement_payments(uuid) from public, anon;
grant execute on function public.get_credit_settlement_payments(uuid) to authenticated;
