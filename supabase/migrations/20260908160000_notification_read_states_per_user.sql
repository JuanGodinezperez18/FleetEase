create table if not exists public.notification_read_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

create index if not exists idx_notification_read_states_user
  on public.notification_read_states(user_id);

alter table public.notification_read_states enable row level security;
alter table public.notification_read_states force row level security;

drop policy if exists notification_read_states_select_own on public.notification_read_states;
drop policy if exists notification_read_states_insert_own on public.notification_read_states;
drop policy if exists notification_read_states_update_own on public.notification_read_states;
drop policy if exists notification_read_states_delete_own on public.notification_read_states;

create policy notification_read_states_select_own
  on public.notification_read_states for select
  using (user_id = auth.uid());

create policy notification_read_states_insert_own
  on public.notification_read_states for insert
  with check (user_id = auth.uid());

create policy notification_read_states_update_own
  on public.notification_read_states for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_read_states_delete_own
  on public.notification_read_states for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.notification_read_states to authenticated;
