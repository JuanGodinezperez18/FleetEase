-- New gateway for callers that retain one request ID per payment intent.
-- The existing payment RPC remains unchanged; no fees or formulas are added.
create schema if not exists fleetease_private;
create table fleetease_private.credit_payment_requests (
  company_id uuid not null,
  request_id uuid not null,
  actor_id uuid not null,
  payload jsonb not null,
  payment_id uuid,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (company_id, request_id),
  unique (company_id, payment_id)
);
alter table fleetease_private.credit_payment_requests enable row level security;
revoke all on table fleetease_private.credit_payment_requests from public, anon, authenticated;

create or replace function public.process_credit_payment_once(
  p_company_id uuid, p_credit_id uuid, p_client_id uuid, p_amount numeric, p_request_id uuid,
  p_payment_date date default (now() at time zone 'America/Mexico_City')::date,
  p_payment_method text default null, p_reference text default null, p_created_by uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_company uuid := public.auth_user_company_id();
  v_amount numeric;
  v_payload jsonb;
  v_request fleetease_private.credit_payment_requests;
  v_response jsonb;
  v_payment_id uuid;
begin
  if v_uid is null or v_company is null or p_company_id is distinct from v_company
     or not exists(select 1 from public.users u where u.id=v_uid and u.company_id=v_company
       and u.is_deleted=false and u.role::text in ('admin','editor','super_admin'))
     or (p_created_by is not null and p_created_by is distinct from v_uid) then
    raise exception 'CREDIT_PAYMENT_NOT_AUTHORIZED' using errcode='42501';
  end if;
  if p_request_id is null or p_credit_id is null then
    raise exception 'CREDIT_PAYMENT_REQUEST_REQUIRED' using errcode='22023';
  end if;
  if p_amount is null or p_amount in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)
     or p_amount<=0 or p_amount>100000000 then
    raise exception 'INVALID_AMOUNT' using errcode='22003';
  end if;
  v_amount := round(p_amount,2);
  if v_amount<=0 then raise exception 'INVALID_AMOUNT' using errcode='22003'; end if;
  if p_payment_date is null or p_payment_date > (now() at time zone 'America/Mexico_City')::date then
    raise exception 'FINANCIAL_DATE_IN_FUTURE' using errcode='22023';
  end if;
  v_payload := jsonb_build_object('creditId',p_credit_id,'clientId',p_client_id,'amount',v_amount,
    'date',p_payment_date,'method',coalesce(p_payment_method,'transferencia'),
    'reference',coalesce(p_reference,'Pago de crédito'));

  -- A concurrent INSERT with this key waits for the first transaction to finish.
  insert into fleetease_private.credit_payment_requests(company_id,request_id,actor_id,payload)
  values(v_company,p_request_id,v_uid,v_payload) on conflict(company_id,request_id) do nothing;
  select * into strict v_request from fleetease_private.credit_payment_requests
   where company_id=v_company and request_id=p_request_id for update;
  if v_request.actor_id is distinct from v_uid then
    raise exception 'CREDIT_PAYMENT_NOT_AUTHORIZED' using errcode='42501';
  end if;
  if v_request.payload is distinct from v_payload then
    raise exception 'CREDIT_PAYMENT_REQUEST_MISMATCH' using errcode='22023';
  end if;
  if v_request.response is not null then
    return v_request.response || jsonb_build_object('idempotentReplay',true);
  end if;

  v_response := public.process_credit_payment_atomic(v_company,p_credit_id,p_client_id,v_amount,
    p_payment_date,p_payment_method,p_reference,v_uid);
  v_payment_id := nullif(coalesce(v_response->>'paymentId',v_response->>'payment_id'),'')::uuid;
  if v_payment_id is null or (v_response->>'success')::boolean is distinct from true then
    raise exception 'CREDIT_PAYMENT_RESPONSE_INVALID';
  end if;
  update fleetease_private.credit_payment_requests set payment_id=v_payment_id,response=v_response
   where company_id=v_company and request_id=p_request_id;
  return v_response || jsonb_build_object('idempotentReplay',false);
end;
$function$;
revoke all on function public.process_credit_payment_once(uuid,uuid,uuid,numeric,uuid,date,text,text,uuid) from public,anon;
grant execute on function public.process_credit_payment_once(uuid,uuid,uuid,numeric,uuid,date,text,text,uuid) to authenticated;
