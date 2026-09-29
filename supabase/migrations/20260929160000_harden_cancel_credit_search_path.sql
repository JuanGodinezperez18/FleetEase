-- Security-only hardening: preserve cancel_credit_atomic behavior while
-- preventing untrusted search_path resolution inside this SECURITY DEFINER RPC.
create or replace function public.cancel_credit_atomic(
  p_company_id uuid,
  p_credit_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_auth_company_id uuid := public.auth_user_company_id();
  v_credit public.credits;
  v_granted_record_id uuid;
  v_note_category_id uuid;
  v_note_category_name text := 'Nota de Crédito';
  v_paid numeric(14,2);
  v_remaining numeric(14,2);
  v_now timestamptz := now();
  v_note_id uuid;
begin
  if v_uid is null or v_auth_company_id is null then
    raise exception 'AUTH_REQUIRED' using errcode='42501';
  end if;
  if p_company_id is distinct from v_auth_company_id then
    raise exception 'INVALID_COMPANY' using errcode='42501';
  end if;

  select * into v_credit
  from public.credits
  where id=p_credit_id and company_id=p_company_id and is_deleted=false
  for update;

  if not found then raise exception 'CREDIT_NOT_FOUND' using errcode='P0002'; end if;
  if v_credit.status <> 'active' then raise exception 'CREDIT_NOT_ACTIVE' using errcode='42501'; end if;

  select coalesce(sum(fr.amount),0)::numeric(14,2) into v_paid
  from public.financial_records fr
  where fr.company_id=p_company_id and fr.credit_id=p_credit_id
    and fr.credit_payment=true and fr.is_deleted=false;

  v_paid := greatest(v_paid, coalesce(v_credit.paid_amount,0));
  v_remaining := greatest(round(coalesce(v_credit.remaining_balance,0),2),0);

  select fr.id into v_granted_record_id
  from public.financial_records fr
  where fr.company_id=p_company_id and fr.credit_id=p_credit_id
    and fr.credit_granted=true and fr.type='income' and fr.is_deleted=false
  order by fr.created_at desc
  limit 1
  for update;

  if v_paid <= 0 then
    if v_granted_record_id is not null then
      update public.financial_records
      set is_deleted=true, updated_at=v_now,
          notes=concat_ws(' | ', nullif(notes,''), 'Crédito cancelado sin pagos')
      where id=v_granted_record_id;
    end if;
  else
    select fc.id, fc.name into v_note_category_id, v_note_category_name
    from public.financial_categories fc
    where (fc.company_id=p_company_id or fc.company_id is null)
      and fc.type='expense' and lower(fc.name)=lower('Nota de Crédito')
    order by case when fc.company_id=p_company_id then 0 else 1 end, fc.is_default desc
    limit 1;

    if v_note_category_id is null then
      raise exception 'CREDIT_CANCELLATION_NOTE_CATEGORY_NOT_CONFIGURED';
    end if;

    if v_remaining > 0 then
      insert into public.financial_records(
        company_id,type,category_id,category,amount,date,payment_method,description,
        client_id,vehicle_id,partner_id,credit_id,is_deleted,created_by,created_at,updated_at,
        notes,source_record_id,source_record_type
      )
      values(
        p_company_id,'expense',v_note_category_id,v_note_category_name,v_remaining,current_date,
        'ajuste_contable','Nota de crédito por cancelación de crédito',
        v_credit.client_id,v_credit.vehicle_id,
        (select v.partner_id from public.vehicles v where v.id=v_credit.vehicle_id and v.company_id=p_company_id),
        p_credit_id,false,v_uid,v_now,v_now,
        concat_ws(' | ', 'Saldo pendiente cancelado', nullif(p_reason,'')),
        coalesce(v_granted_record_id,p_credit_id::uuid),
        'credit_cancellation_note'
      )
      returning id into v_note_id;
    end if;
  end if;

  update public.credit_payment_schedules
  set status='cancelled'::public.payment_status, is_deleted=true
  where credit_id=p_credit_id and company_id=p_company_id and is_deleted=false
    and status in ('pending','overdue');

  update public.credits set status='cancelled', updated_at=v_now
  where id=p_credit_id and company_id=p_company_id;

  update public.clients
  set has_active_credit=false, active_credit_id=null, updated_at=v_now
  where id=v_credit.client_id and company_id=p_company_id;

  if v_credit.vehicle_id is not null then
    update public.vehicle_assignment_logs
    set unassigned_at=v_now, end_date=v_now,
        reason=case when nullif(p_reason,'') is null then 'Crédito cancelado' else 'Crédito cancelado: ' || p_reason end
    where vehicle_id=v_credit.vehicle_id and client_id=v_credit.client_id and unassigned_at is null;

    update public.vehicles
    set client_id=null, status='active', locked_by_credit=false, associated_credit_id=null, updated_at=v_now
    where id=v_credit.vehicle_id and company_id=p_company_id;
  end if;

  insert into public.audit_logs(action,entity_type,entity_id,entity_name,user_id,user_name,"timestamp",changes,company_id)
  values(
    'delete'::public.audit_action,'credit',p_credit_id,'Cancelación de crédito',v_uid,null,v_now,
    jsonb_build_object(
      'paid_amount',v_paid,'remaining_balance',v_remaining,
      'mode',case when v_paid <= 0 then 'void_granted_income' else 'credit_note' end,
      'financial_record_id',v_granted_record_id,'credit_note_id',v_note_id,'reason',p_reason
    ),
    p_company_id
  );

  return jsonb_build_object(
    'success',true,'creditId',p_credit_id,'paidAmount',v_paid,'remainingBalance',v_remaining,
    'mode',case when v_paid <= 0 then 'void_granted_income' else 'credit_note' end,
    'financialRecordId',v_granted_record_id,'creditNoteId',v_note_id
  );
end;
$$;

revoke all on function public.cancel_credit_atomic(uuid,uuid,text) from public, anon;
grant execute on function public.cancel_credit_atomic(uuid,uuid,text) to authenticated;
