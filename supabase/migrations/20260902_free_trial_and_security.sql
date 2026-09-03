-- FleetEase: Free trial metadata + security preferences
-- Safe to run repeatedly.

alter table public.companies
  add column if not exists subscription_status text;

alter table public.companies
  add column if not exists trial_ends_at timestamptz;

-- Existing companies remain active unless their plan is the new Free trial.
update public.companies
set subscription_status = 'active'
where subscription_status is null;

-- A Free plan is a 14-day trial: no payment method is required.
-- The application enforces the 2-vehicle / 1-user limits from src/config/plans.ts.

comment on column public.companies.subscription_status is
  'FleetEase billing state: active, trialing, past_due, canceled, etc.';

comment on column public.companies.trial_ends_at is
  'UTC timestamp at which a Free trial expires; NULL for paid plans.';
