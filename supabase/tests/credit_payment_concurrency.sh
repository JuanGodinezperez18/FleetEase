#!/usr/bin/env bash
set -euo pipefail

scratch_dir=$(mktemp -d)
leader_pid=
follower_pid=
cleanup() {
  for pid in "$leader_pid" "$follower_pid"; do
    if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; fi
  done
  rm -rf "$scratch_dir"
}
trap cleanup EXIT

psql -X -v ON_ERROR_STOP=1 -v concurrency_fixture=1 -f supabase/tests/credit_assignment_lifecycle.sql
cat > "$scratch_dir/payment.sql" <<'SQL'
begin;
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub',public.test_id(1))::text,true) \gset
select public.process_credit_payment_once(public.test_id(101),public.test_id(803),public.test_id(801),20,public.test_id(901));
\if :hold
select pg_sleep(5) \gset
\endif
commit;
SQL

PGAPPNAME=credit_retry_leader psql -XqAt -v ON_ERROR_STOP=1 -v hold=true -f "$scratch_dir/payment.sql" > "$scratch_dir/leader" &
leader_pid=$!
for _ in {1..40}; do
  if [[ $(psql -XAtc "select exists(select from pg_stat_activity where application_name='credit_retry_leader' and wait_event='PgSleep')") == t ]]; then
    break
  fi
  sleep 0.1
done
PGAPPNAME=credit_retry_follower psql -XqAt -v ON_ERROR_STOP=1 -v hold=false -f "$scratch_dir/payment.sql" > "$scratch_dir/follower" &
follower_pid=$!
blocked=false
for _ in {1..40}; do
  if [[ $(psql -XAtc "select exists(select from pg_stat_activity where application_name='credit_retry_follower' and wait_event_type='Lock')") == t ]]; then
    blocked=true
    break
  fi
  sleep 0.1
done
wait "$leader_pid"
leader_pid=
wait "$follower_pid"
follower_pid=
[[ "$blocked" == true ]]
python3 - "$scratch_dir" <<'PYTHON'
import json
import sys
from pathlib import Path

directory = Path(sys.argv[1])
leader = json.loads((directory / "leader").read_text())
follower = json.loads((directory / "follower").read_text())
assert leader["idempotentReplay"] is False
assert follower["idempotentReplay"] is True
assert leader["paymentId"] == follower["paymentId"]
assert leader["newCreditBalance"] == follower["newCreditBalance"] == 0
PYTHON
psql -X -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
 if (select count(*) from public.financial_records
     where credit_id=public.test_id(803) and type='payment' and not is_deleted)<>1
   or not exists(select 1 from public.credits where id=public.test_id(803) and remaining_balance=0 and status='completed')
 then raise exception 'Concurrent retry changed persisted payment or balance'; end if;
end $$;
select 'CREDIT_PAYMENT_CONCURRENCY_PASS' as result;
SQL
