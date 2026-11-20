alter table public.financial_categories add column if not exists is_deleted boolean not null default false;

create or replace function public.guard_financial_category_archive()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.is_deleted is distinct from new.is_deleted then
    if old.company_id is null or old.company_id is distinct from new.company_id
      or old.is_default or new.is_default
      or not exists (select 1 from public.users u where u.id=auth.uid()
        and not u.is_deleted and u.company_id=old.company_id and u.role in ('admin','super_admin'))
    then raise exception 'No autorizado para archivar esta categoría.' using errcode='42501'; end if;
    if new.is_deleted and exists (select 1 from public.financial_records f where f.category_id=old.id) then
      raise exception 'La categoría tiene movimientos registrados y no puede archivarse.' using errcode='23503';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_financial_category_archive() from public,anon,authenticated;
create trigger guard_financial_category_archive before update on public.financial_categories
for each row execute function public.guard_financial_category_archive();

create or replace function public.archive_financial_category(p_id uuid,p_company_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  if p_company_id is null or p_company_id is distinct from public.auth_user_company_id()
    or not exists (select 1 from public.users u where u.id=auth.uid()
      and not u.is_deleted and u.company_id=p_company_id and u.role in ('admin','super_admin'))
  then raise exception 'No autorizado para archivar categorías.' using errcode='42501'; end if;
  update public.financial_categories set is_deleted=true
    where id=p_id and company_id=p_company_id and not is_deleted;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function public.archive_financial_category(uuid,uuid) from public,anon;
grant execute on function public.archive_financial_category(uuid,uuid) to authenticated;

drop policy "Users can view financial categories" on public.financial_categories;
create policy "Users can view financial categories" on public.financial_categories for select
using (not is_deleted and (company_id is null or company_id=public.auth_user_company_id() or public.auth_user_role()='super_admin'));

create or replace function public.guard_active_financial_category()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.category_id is not null then
    perform 1 from public.financial_categories c where c.id=new.category_id and not c.is_deleted for share;
    if not found then raise exception 'La categoría no está disponible.' using errcode='23503'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_active_financial_category() from public,anon,authenticated;
create trigger guard_active_financial_category before insert or update of category_id on public.financial_records
for each row execute function public.guard_active_financial_category();
