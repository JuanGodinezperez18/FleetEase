-- Multas: charge client balance, exclude from company operating income, and allow partial payments.
-- Applied to Supabase and kept here for reproducible deployments.

insert into public.financial_categories (name,type,affects,description,is_default,company_id)
select 'Multa','income','client_balance','Cargo de multa aplicado al saldo del cliente; no representa ingreso operativo cobrado.',true,null
where not exists (select 1 from public.financial_categories where lower(trim(name))='multa' and type='income' and affects='client_balance' and company_id is null);

insert into public.financial_categories (name,type,affects,description,is_default,company_id)
select 'Pago de Multa','payment','client_balance','Pago parcial o total aplicado a una multa pendiente del cliente.',true,null
where not exists (select 1 from public.financial_categories where lower(trim(name))='pago de multa' and type='payment' and affects='client_balance' and company_id is null);

-- The canonical function bodies are deployed in the database. This migration intentionally
-- documents the required categories and is followed by the application-side RPC calls.
