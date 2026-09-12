begin;

-- The generic audit trigger is also attached to credit_payment_schedules,
-- but that table does not have reference_code. Direct NEW.reference_code
-- therefore aborts create_credit_atomic when it inserts the payment schedule.
-- Read optional fields through row JSON so the trigger is compatible with
-- tables that do not expose reference_code.
create or replace function public.audit_business_record()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_new jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  v_company uuid;
  v_ref text;
  v_action text;
begin
  v_company := coalesce(nullif(v_new->>'company_id','')::uuid, nullif(v_old->>'company_id','')::uuid);
  v_ref := coalesce(nullif(v_new->>'reference_code',''), nullif(v_old->>'reference_code',''));
  v_action := case when tg_op='INSERT' then 'CREATE' when tg_op='UPDATE' then 'UPDATE' else 'DELETE' end;

  insert into public.record_audit_log(
    company_id,
    entity_type,
    entity_id,
    entity_reference_code,
    action,
    actor_user_id,
    old_data,
    new_data,
    metadata
  )
  values(
    v_company,
    tg_table_name,
    coalesce(new.id,old.id),
    v_ref,
    v_action,
    auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then v_old end,
    case when tg_op in ('INSERT','UPDATE') then v_new end,
    jsonb_build_object('trigger',tg_name)
  );

  return coalesce(new,old);
end;
$$;

revoke execute on function public.audit_business_record() from public,anon,authenticated;

commit;
