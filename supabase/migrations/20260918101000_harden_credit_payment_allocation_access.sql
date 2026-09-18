create index if not exists idx_credit_payment_alloc_company
  on public.financial_payment_credit_allocations(company_id);

drop policy if exists "No direct client access" on public.financial_payment_credit_allocations;
create policy "No direct client access"
  on public.financial_payment_credit_allocations
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on table public.financial_payment_credit_allocations from anon, authenticated;
