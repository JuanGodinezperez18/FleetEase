create table if not exists public.subscription_email_reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reminder_key text not null,
  period_end timestamptz not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(company_id, reminder_key, period_end)
);

alter table public.subscription_email_reminders enable row level security;
revoke all on public.subscription_email_reminders from anon, authenticated;
