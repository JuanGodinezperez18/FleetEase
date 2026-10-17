-- Prevent soft-deleted user profiles from retaining tenant identity or role via SECURITY DEFINER helpers.
-- Preserve the existing function ACLs; CREATE OR REPLACE does not change grants.
-- This makes tenant-scoped RPCs and RLS helpers treat deleted profiles as unauthenticated.
create or replace function public.auth_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select company_id
  from public.users
  where id = auth.uid()
    and is_deleted = false
  limit 1;
$function$;

create or replace function public.auth_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select role
  from public.users
  where id = auth.uid()
    and is_deleted = false
  limit 1;
$function$;
