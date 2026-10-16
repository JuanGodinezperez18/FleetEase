-- Prevent tenant-level administrators from bypassing company-scoped RLS.
--
-- public.is_user_admin() is used by RLS policies and offboard_client_with_writeoff().
-- A tenant administrator already has access to their own company through the
-- company_id = get_user_company_id() predicate. Only the global super_admin role
-- should satisfy the cross-company administrative bypass.
--
-- CREATE OR REPLACE preserves the function's existing ACL. This migration does
-- not alter grants, data, table structure, or policies.

create or replace function public.is_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.is_deleted = false
      and u.role = 'super_admin'
  );
$function$;
