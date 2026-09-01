-- Hash invitation tokens at rest (SHA-256). Keep optional plaintext only during transition.
-- Application should store token_hash and compare hash(received_token) on accept.

alter table public.user_invitations
  add column if not exists token_hash text;

create unique index if not exists user_invitations_token_hash_uidx
  on public.user_invitations (token_hash)
  where token_hash is not null;

-- Backfill: hash existing plaintext tokens when present and token_hash is null
-- Uses pgcrypto digest if available; otherwise leave for app-side migration.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pgcrypto') then
    update public.user_invitations
    set token_hash = encode(digest(token, 'sha256'), 'hex')
    where token is not null
      and token_hash is null
      and length(token) > 0;
  end if;
end $$;

comment on column public.user_invitations.token_hash is
  'SHA-256 hex digest of invitation token. Compare hash(received) == token_hash. Never log raw tokens.';
