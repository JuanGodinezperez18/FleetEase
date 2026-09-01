revoke execute on function public.auto_link_credit_payment_to_grant() from anon;
revoke execute on function public.auto_link_credit_payment_to_grant() from public;
grant execute on function public.auto_link_credit_payment_to_grant() to authenticated;

revoke execute on function public.link_financial_records(uuid, uuid, text) from anon;
revoke execute on function public.link_financial_records(uuid, uuid, text) from public;
grant execute on function public.link_financial_records(uuid, uuid, text) to authenticated;
