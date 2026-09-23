-- SECURITY DEFINER helpers used only internally by triggers must not be callable via PostgREST.
revoke execute on function public.reconcile_supplier_payable_status(uuid) from authenticated, anon, public;
revoke execute on function public.sync_multa_status_from_payment() from authenticated, anon, public;

-- Domain RPCs are intended for signed-in application users, never anonymous callers.
revoke execute on function public.cancel_multa_atomic(uuid,uuid,text,uuid) from anon, public;
revoke execute on function public.create_multa_atomic(jsonb) from anon, public;
revoke execute on function public.create_vehicle_admin_income() from authenticated, anon, public;
