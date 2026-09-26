-- Performance hardening: indexes and RLS initplan optimization.
-- Generated from Supabase advisor audit on 2026-09-26.
-- Keep this migration synchronized with the production database.

create index if not exists idx_accounts_payable_source_financial_record_id
  on public.accounts_payable(source_financial_record_id);
create index if not exists idx_accounts_payable_supplier_purchase_id
  on public.accounts_payable(supplier_purchase_id);
create index if not exists idx_catalog_items_category_id
  on public.catalog_items(category_id);
create index if not exists idx_client_write_offs_client_id
  on public.client_write_offs(client_id);
create index if not exists idx_client_write_offs_financial_record_id
  on public.client_write_offs(financial_record_id);
create index if not exists idx_supplier_purchase_allocations_company_id
  on public.supplier_purchase_allocations(company_id);
create index if not exists idx_supplier_purchase_items_catalog_item_id
  on public.supplier_purchase_items(catalog_item_id);

drop index if exists public.idx_financial_record_links_source;
drop index if exists public.idx_financial_record_links_target;
drop index if exists public.idx_vehicle_assignment_logs_client_id;

drop policy if exists notification_read_states_delete_own on public.notification_read_states;
create policy notification_read_states_delete_own on public.notification_read_states for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists notification_read_states_insert_own on public.notification_read_states;
create policy notification_read_states_insert_own on public.notification_read_states for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists notification_read_states_select_own on public.notification_read_states;
create policy notification_read_states_select_own on public.notification_read_states for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists notification_read_states_update_own on public.notification_read_states;
create policy notification_read_states_update_own on public.notification_read_states for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications" on public.notifications for insert to authenticated
with check (
  uid = (select auth.uid())
  or company_id = (select public.auth_user_company_id())
  or (select public.auth_user_role()) = 'super_admin'
);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications for update to authenticated
using (
  uid = (select auth.uid())
  or company_id = (select public.auth_user_company_id())
  or (select public.auth_user_role()) = 'super_admin'
)
with check (
  uid = (select auth.uid())
  or company_id = (select public.auth_user_company_id())
  or (select public.auth_user_role()) = 'super_admin'
);

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications for select to authenticated
using (
  uid = (select auth.uid())
  or company_id = (select public.auth_user_company_id())
  or (select public.auth_user_role()) = 'super_admin'
);

drop policy if exists "Insert users" on public.users;
create policy "Insert users" on public.users for insert to authenticated
with check (
  id = (select auth.uid())
  or (select public.auth_user_role()) = 'super_admin'
  or (
    (select public.auth_user_role()) = 'admin'
    and company_id = (select public.auth_user_company_id())
    and role <> 'super_admin'::user_role
  )
);

drop policy if exists "Update users" on public.users;
create policy "Update users" on public.users for update to authenticated
using (
  id = (select auth.uid())
  or (
    (select public.auth_user_role()) in ('admin','super_admin')
    and company_id = (select public.auth_user_company_id())
  )
  or (select public.auth_user_role()) = 'super_admin'
)
with check (
  (
    id = (select auth.uid())
    and role::text = (select public.auth_user_role())
    and company_id = (select public.auth_user_company_id())
  )
  or (select public.auth_user_role()) = 'super_admin'
  or (
    company_id = (select public.auth_user_company_id())
    and role <> 'super_admin'::user_role
    and (id <> (select auth.uid()) or role::text = (select public.auth_user_role()))
  )
);

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" on public.users for select to authenticated
using (
  id = (select auth.uid())
  or (
    (select public.auth_user_role()) in ('admin','editor','super_admin')
    and company_id = (select public.auth_user_company_id())
  )
  or (select public.auth_user_role()) = 'super_admin'
);

drop policy if exists "Users can delete own FCM tokens" on public.fcm_tokens;
create policy "Users can delete own FCM tokens" on public.fcm_tokens for delete to authenticated
using (user_id = (select auth.uid()) or (select public.auth_user_role()) = 'super_admin');

drop policy if exists "Users can insert own FCM tokens" on public.fcm_tokens;
create policy "Users can insert own FCM tokens" on public.fcm_tokens for insert to authenticated
with check (user_id = (select auth.uid()) or (select public.auth_user_role()) = 'super_admin');

drop policy if exists "Users can update own FCM tokens" on public.fcm_tokens;
create policy "Users can update own FCM tokens" on public.fcm_tokens for update to authenticated
using (user_id = (select auth.uid()) or (select public.auth_user_role()) = 'super_admin')
with check (user_id = (select auth.uid()) or (select public.auth_user_role()) = 'super_admin');

drop policy if exists "Users can view own FCM tokens" on public.fcm_tokens;
create policy "Users can view own FCM tokens" on public.fcm_tokens for select to authenticated
using (user_id = (select auth.uid()) or (select public.auth_user_role()) = 'super_admin');
