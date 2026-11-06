create or replace function public.soft_delete_tenant_record(
  p_table text,
  p_id uuid,
  p_company_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_role text;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select u.company_id, u.role::text into v_company_id, v_role
    from public.users u
   where u.id = auth.uid() and u.is_deleted = false;

  if not found or v_role is null or v_role not in ('admin', 'editor', 'super_admin') then
    raise exception 'SOFT_DELETE_FORBIDDEN' using errcode = '42501';
  end if;
  if p_company_id is null or p_id is null then
    raise exception 'SOFT_DELETE_SCOPE_REQUIRED' using errcode = '22023';
  end if;
  if v_role <> 'super_admin' and p_company_id is distinct from v_company_id then
    raise exception 'SOFT_DELETE_FORBIDDEN' using errcode = '42501';
  end if;

  if p_table = 'financial_records' then
    update public.financial_records
       set is_deleted = true
     where id = p_id and company_id = p_company_id and is_deleted = false
       and type in ('income', 'expense') and credit_id is null
       and coalesce(credit_payment, false) = false
       and coalesce(credit_granted, false) = false;
  elsif p_table = 'vehicles' then
    perform 1 from public.vehicles
     where id = p_id and company_id = p_company_id and is_deleted = false
     for update;
    if not found then
      raise exception 'SOFT_DELETE_NOT_FOUND_ALREADY_DELETED_OR_PROTECTED' using errcode = 'P0002';
    end if;
    if exists (
      select 1 from public.vehicles v
       where v.id = p_id and v.company_id = p_company_id
         and (v.client_id is not null or coalesce(v.locked_by_credit, false) or v.associated_credit_id is not null)
    ) or exists (
      select 1 from public.clients c
       where c.assigned_vehicle_id = p_id and c.company_id = p_company_id and c.is_deleted = false
    ) or exists (
      select 1 from public.vehicle_assignment_logs l
       where l.vehicle_id = p_id and l.company_id = p_company_id and l.unassigned_at is null
    ) or exists (
      select 1 from public.credits c
       where c.vehicle_id = p_id and c.company_id = p_company_id and c.is_deleted = false and c.status = 'active'
    ) then
      raise exception 'VEHICLE_REQUIRES_RELEASE_BEFORE_DELETE' using errcode = '42501';
    end if;
    update public.vehicles
       set is_deleted = true
     where id = p_id and company_id = p_company_id and is_deleted = false;
  else
    raise exception 'SOFT_DELETE_TABLE_NOT_ALLOWED' using errcode = '22023';
  end if;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'SOFT_DELETE_NOT_FOUND_ALREADY_DELETED_OR_PROTECTED' using errcode = 'P0002';
  end if;
  return v_count;
end;
$$;

revoke all on function public.soft_delete_tenant_record(text, uuid, uuid) from public, anon;
grant execute on function public.soft_delete_tenant_record(text, uuid, uuid) to authenticated;
