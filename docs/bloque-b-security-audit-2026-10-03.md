# Bloque B — Auditoría seguridad multi-tenant (2026-10-03)

## Aplicado en vivo (Supabase)

Migración: `block_b_revoke_anon_and_storage_tenant_policies`

### 1. REVOKE anon
Sin privilegios de tabla residuales para `anon` en:
- `accounts_payable`
- `notification_read_states`
- `supplier_purchases` / `supplier_purchase_items` / `supplier_purchase_allocations`
- `vehicle_inspections`

### 2. Storage tenant policies
Buckets públicos `vehicle-images` y `company-logos`:
- INSERT / UPDATE / DELETE / SELECT (authenticated) limitados a
  `companies/{auth_user_company_id()}/...` o `super_admin`
- Lectura anónima por URL pública (`getPublicUrl`) sigue funcionando
  porque el bucket es público; escrituras client-side quedan acotadas.

Paths reales de la API (`src/app/api/upload/route.ts`):
- `companies/{companyId}/vehicles/{entityId}/images/...`
- `companies/{companyId}/branding/...`

## Ya en buen estado (pre-auditoría)
- RLS enabled en 37/37 tablas `public`
- Aislamiento `company_id` + soft delete en entidades core
- Todas las `SECURITY DEFINER` con `search_path` fijo
- Triggers internos solo `service_role`
- Ledger `financial_payment_credit_allocations` con policy deny-all al cliente

## Pendiente manual (Dashboard Auth)
- Activar **Leaked Password Protection** (HaveIBeenPwned):
  Authentication → Providers → Email → Password strength

## Advisors restantes (WARN esperados)
- 15 funciones `SECURITY DEFINER` ejecutables por `authenticated`
  (helpers RLS + RPCs de negocio intencionales)
- Leaked password protection disabled (ver arriba)

## No hecho en este paso
- Ajuste fino RLS de `notifications` (SELECT company-wide vs solo `uid`)
- Limpieza de índices unused (performance, no seguridad)
- Cifrado PII adicional (fuera de alcance inmediato)
