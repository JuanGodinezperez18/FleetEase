-- Included by credit_assignment_lifecycle.sql inside its isolated transaction.
reset role;
\ir ../migrations/20261107235137_idempotent_credit_payments.sql
insert into public.users values
 (public.test_id(2),public.test_id(101),'editor',false),
 (public.test_id(3),public.test_id(101),'client',false),
 (public.test_id(4),public.test_id(102),'admin',false);
insert into public.clients(id,company_id,created_at) values(public.test_id(801),public.test_id(101),now()-interval '2 days');
insert into public.vehicles(id,company_id,created_at,status,current_mileage,partner_id)
 values(public.test_id(802),public.test_id(101),now()-interval '2 days','active',100,public.test_id(501));
insert into public.vehicle_assignment_logs(vehicle_id,client_id,company_id,assigned_at,assigned_by)
 values(public.test_id(802),public.test_id(801),public.test_id(101),now()-interval '1 day',public.test_id(1));
insert into public.credits(id,company_id,client_id,vehicle_id,total_amount,paid_amount,remaining_balance,payments_made,status)
 values(public.test_id(803),public.test_id(101),public.test_id(801),public.test_id(802),20,0,20,0,'active');
update public.vehicles set locked_by_credit=true,associated_credit_id=public.test_id(803) where id=public.test_id(802);
update public.clients set has_active_credit=true,active_credit_id=public.test_id(803) where id=public.test_id(801);
insert into public.credit_payment_schedules(company_id,credit_id,payment_number,amount,paid_amount,status,due_date)
 select public.test_id(101),public.test_id(803),n,10,0,'pending',current_date from generate_series(1,2) n;
\if :{?concurrency_fixture}
-- Leave this credit active for two independent connections in CI.
\else
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(1))::text,true);
do $$ declare a jsonb; b jsonb; begin
 a:=public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),4,public.test_id(901),current_date,'Efectivo','QA146',null);
 b:=public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),4,public.test_id(901),current_date,'Efectivo','QA146',null);
 if a->>'paymentId' is distinct from b->>'paymentId' then raise exception 'Duplicate credit payment on retry'; end if;
 if (select count(*) from public.financial_records where credit_id=public.test_id(803) and type='payment' and not is_deleted)<>1 then raise exception 'Duplicate payment rows'; end if;
 if (select remaining_balance from public.credits where id=public.test_id(803))<>16 then raise exception 'Retry changed balance'; end if;
 if b->>'idempotentReplay'<>'true' then raise exception 'Replay not identified'; end if;
 begin
  perform public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),5,public.test_id(901),current_date,'Efectivo','QA146',null);
  raise exception 'Expected request mismatch';
 exception when invalid_parameter_value then if sqlerrm<>'CREDIT_PAYMENT_REQUEST_MISMATCH' then raise; end if; end;
 begin
  perform public.process_credit_payment_once(public.test_id(102),public.test_id(803),public.test_id(801),4,public.test_id(901));
  raise exception 'Expected tenant rejection';
 exception when insufficient_privilege then null; end;
 begin
  perform public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),4,public.test_id(905),current_date,null,null,public.test_id(2));
  raise exception 'Expected forged actor rejection';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Fail after the last payment has finalized the credit and released resources.
create function public.test_fail_idempotent_audit() returns trigger language plpgsql as $$ begin
 if new.entity_type='credit' and new.entity_id=public.test_id(803) and (new.changes->>'amount')::numeric=16 then
  raise exception 'QA146_AUDIT_FAILURE'; end if; return new; end $$;
create trigger test_fail_idempotent_audit before insert on public.audit_logs for each row execute function public.test_fail_idempotent_audit();
set local role authenticated;
do $$ begin
 begin
  perform public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),16,public.test_id(902));
  raise exception 'Expected audit failure';
 exception when raise_exception then if sqlerrm<>'QA146_AUDIT_FAILURE' then raise; end if; end;
 if (select remaining_balance from public.credits where id=public.test_id(803))<>16 then raise exception 'Balance rollback failed'; end if;
 if not exists(select 1 from public.vehicles where id=public.test_id(802) and status='active' and client_id=public.test_id(801) and locked_by_credit) then raise exception 'Vehicle rollback failed'; end if;
 if not exists(select 1 from public.vehicle_assignment_logs where vehicle_id=public.test_id(802) and unassigned_at is null) then raise exception 'History rollback failed'; end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from fleetease_private.credit_payment_requests where request_id=public.test_id(902)) then raise exception 'Failed request retained'; end if;
end $$;
drop trigger test_fail_idempotent_audit on public.audit_logs;
set local role authenticated;
do $$ declare a jsonb; b jsonb; n numeric; begin
 a:=public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),16,public.test_id(902));
 b:=public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),16,public.test_id(902));
 if a->>'paymentId' is distinct from b->>'paymentId' or b->>'idempotentReplay'<>'true' then raise exception 'Completed replay failed'; end if;
 if (select count(*) from public.financial_records where credit_id=public.test_id(803) and type='payment' and not is_deleted)<>2 then raise exception 'Completed duplicate rows'; end if;
 foreach n in array array['NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric,0.004::numeric] loop
  begin
   perform public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),n,public.test_id(903));
   raise exception 'Expected invalid amount';
  exception when numeric_value_out_of_range then null; end;
 end loop;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(2))::text,true);
do $$ begin
 begin
  perform public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),4,public.test_id(901),current_date,'Efectivo','QA146');
  raise exception 'Expected actor-bound replay rejection';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',public.test_id(3))::text,true);
do $$ begin
 begin
  perform public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),4,public.test_id(904));
  raise exception 'Expected client role rejection';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.process_credit_payment_once(uuid,uuid,uuid,numeric,uuid,date,text,text,uuid)','EXECUTE') then raise exception 'Anonymous RPC grant'; end if;
 if has_table_privilege('authenticated','fleetease_private.credit_payment_requests','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Direct request table access'; end if;
 if (select count(*) from fleetease_private.credit_payment_requests)<>2 then raise exception 'Unexpected request count'; end if;
end $$;
select 'CREDIT_PAYMENT_IDEMPOTENCY_PASS' as result;
\endif
