create table if not exists public.vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  photos jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now(),
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  is_deleted boolean not null default false
);
alter table public.vehicle_inspections enable row level security;
create index if not exists idx_vehicle_inspections_company_expires on public.vehicle_inspections(company_id, expires_at);
create index if not exists idx_vehicle_inspections_vehicle_timestamp on public.vehicle_inspections(vehicle_id, timestamp desc);
drop policy if exists vehicle_inspections_company_select on public.vehicle_inspections;
create policy vehicle_inspections_company_select on public.vehicle_inspections for select to authenticated
using (company_id = (select public.auth_user_company_id()) or (select public.auth_user_role())='super_admin');
drop policy if exists vehicle_inspections_company_insert on public.vehicle_inspections;
create policy vehicle_inspections_company_insert on public.vehicle_inspections for insert to authenticated
with check (company_id = (select public.auth_user_company_id()) or (select public.auth_user_role())='super_admin');
drop policy if exists vehicle_inspections_company_update on public.vehicle_inspections;
create policy vehicle_inspections_company_update on public.vehicle_inspections for update to authenticated
using (company_id = (select public.auth_user_company_id()) or (select public.auth_user_role())='super_admin')
with check (company_id = (select public.auth_user_company_id()) or (select public.auth_user_role())='super_admin');
