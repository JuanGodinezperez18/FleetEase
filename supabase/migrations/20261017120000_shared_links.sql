-- Short-lived, read-only links to a single vehicle image/document.
-- Public and authenticated clients cannot access this table directly.
create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  bucket_name text not null check (bucket_name in ('vehicle-documents', 'vehicle-images')),
  object_path text not null check (object_path !~ '(^/|\\\\|(^|/)\\.\\.?(/|$))'),
  document_label text not null check (char_length(document_label) between 1 and 80),
  vehicle_label text not null check (char_length(vehicle_label) between 1 and 120),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  single_use boolean not null default false,
  use_count integer not null default 0 check (use_count >= 0),
  used_at timestamptz,
  revoked_at timestamptz,
  constraint shared_links_expiration_valid check (expires_at > created_at),
  constraint shared_links_single_use_consistent check (not single_use or used_at is null or use_count >= 1)
);

create index if not exists shared_links_company_created_idx
  on public.shared_links (company_id, created_at desc);
create index if not exists shared_links_creator_created_idx
  on public.shared_links (created_by, created_at desc);
create index if not exists shared_links_expiration_idx
  on public.shared_links (expires_at) where revoked_at is null;

alter table public.shared_links enable row level security;
revoke all on table public.shared_links from anon, authenticated;
grant select, insert, update, delete on table public.shared_links to service_role;

-- Atomically count a successful server-side delivery and consume single-use links.
-- Only the service role can execute this function. It does not grant public access.
create or replace function public.consume_shared_link(
  p_link_id uuid,
  p_now timestamptz,
  p_single_use boolean
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_consumed boolean := false;
begin
  update public.shared_links
     set use_count = use_count + 1,
         used_at = case when single_use then p_now else used_at end
   where id = p_link_id
     and single_use = p_single_use
     and revoked_at is null
     and expires_at > p_now
     and (not single_use or used_at is null)
  returning true into v_consumed;

  return coalesce(v_consumed, false);
end;
$function$;

revoke all on function public.consume_shared_link(uuid, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.consume_shared_link(uuid, timestamptz, boolean) to service_role;
