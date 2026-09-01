-- =============================================================================
-- FleetEase — aplicar en Supabase SQL Editor (proyecto producción)
-- Fecha: 2026-09-01
-- NO borra historial. Solo añade columnas, índices y verifica privilegios.
-- =============================================================================

-- 1) Invitation token hashing
alter table public.user_invitations
  add column if not exists token_hash text;

create unique index if not exists user_invitations_token_hash_uidx
  on public.user_invitations (token_hash)
  where token_hash is not null;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pgcrypto') then
    update public.user_invitations
    set token_hash = encode(digest(token, 'sha256'), 'hex')
    where token is not null
      and token_hash is null
      and length(token) > 0;
  end if;
exception when others then
  raise notice 'Backfill token_hash skipped: %', sqlerrm;
end $$;

comment on column public.user_invitations.token_hash is
  'SHA-256 hex digest of invitation token. Compare hash(received) == token_hash.';

-- 2) Verificar privilegios de funciones de trazabilidad (debe ser sin anon execute)
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'offboard_client_with_writeoff',
    'link_financial_records',
    'auto_link_credit_payment',
    'cancel_credit_with_adjustment'
  )
order by p.proname;

-- 3) Soft-delete columns presence (informativo)
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and column_name in ('is_deleted', 'reference_code', 'token_hash')
  and table_name in (
    'clients','credits','financial_records','vehicles','users','user_invitations'
  )
order by table_name, column_name;

-- 4) Si anon_can_execute = true en alguna función, ejecutar:
-- REVOKE EXECUTE ON FUNCTION public.offboard_client_with_writeoff FROM anon, public;
-- REVOKE EXECUTE ON FUNCTION public.link_financial_records FROM anon, public;
-- (ajusta firmas exactas según el SELECT anterior)

-- 5) Storage: listar buckets (informativo)
select id, name, public from storage.buckets order by name;
