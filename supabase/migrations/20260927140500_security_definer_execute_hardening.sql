-- Security hardening: restrict SECURITY DEFINER RPC exposure.
-- Financial RPCs remain executable by authenticated because the application uses them.
-- Unused privileged RPCs are removed from the authenticated API surface.
-- Public/anon execution is explicitly revoked for all affected functions.

revoke execute on function public.get_superadmin_dashboard_summary() from authenticated, anon, public;
revoke execute on function public.link_financial_records(uuid, uuid, text) from authenticated, anon, public;

revoke execute on function public.auth_user_company_id() from anon, public;
revoke execute on function public.auth_user_role() from anon, public;
revoke execute on function public.cancel_multa_atomic(uuid,uuid,text,uuid) from anon, public;
revoke execute on function public.create_credit_atomic(jsonb) from anon, public;
revoke execute on function public.create_financial_record(jsonb) from anon, public;
revoke execute on function public.create_multa_atomic(jsonb) from anon, public;
revoke execute on function public.delete_financial_payment_atomic(uuid) from anon, public;
revoke execute on function public.get_user_company_id() from anon, public;
revoke execute on function public.is_user_admin() from anon, public;
revoke execute on function public.offboard_client_with_writeoff(uuid,text) from anon, public;
revoke execute on function public.process_credit_payment_atomic(uuid,uuid,uuid,numeric,date,text,text,uuid) from anon, public;
revoke execute on function public.update_financial_payment_atomic(uuid,numeric,date,text,text,uuid) from anon, public;
revoke execute on function public.update_financial_record_metadata(uuid,jsonb) from anon, public;
