# Bloque B — Seguridad multi-tenant — CERRADO (2026-10-03)

## Estado: ✅ Completo (código + BD)

Único paso manual restante: Auth Dashboard (HaveIBeenPwned).

---

## Migraciones aplicadas en vivo (Supabase)

| Migración | Contenido |
|-----------|-----------|
| `block_b_revoke_anon_and_storage_tenant_policies` | REVOKE anon + policies vehicle-images / company-logos |
| `block_b_tighten_notifications_rls` | SELECT/UPDATE solo uid o admin/super_admin |
| `block_b_seguimientos_storage_tenant_policies` | Policies bucket `seguimientos` |

Réplicas en repo:
- `supabase/migrations/20261003225000_block_b_revoke_anon_and_storage_tenant_policies.sql`
- `supabase/migrations/20261003225500_block_b_tighten_notifications_rls.sql`
- `supabase/migrations/20261003230000_block_b_seguimientos_storage_tenant_policies.sql`

---

## Checklist Bloque B

| Ítem | Estado |
|------|--------|
| RLS en todas las tablas `public` (37/37) | ✅ |
| Aislamiento `company_id` en entidades de negocio | ✅ |
| Soft delete donde aplica | ✅ |
| `search_path` fijo en `SECURITY DEFINER` | ✅ |
| Triggers internos solo `service_role` | ✅ |
| REVOKE grants residuales `anon` | ✅ |
| Storage policies tenant (`vehicle-images`, `company-logos`, `documents`, `inspection-images`, `seguimientos`) | ✅ |
| Paths de upload alineados `companies/{companyId}/…` | ✅ |
| Notifications RLS endurecido | ✅ |
| Ledger pagos/créditos deny-all al cliente | ✅ (preexistente) |
| Leaked password protection (HaveIBeenPwned) | ⏳ **manual Dashboard** |
| Cifrado PII en reposo | ○ diferido (fase posterior) |
| Limpieza índices unused | ○ opcional performance |

---

## Paths de Storage (canónico)

```
companies/{companyId}/vehicles/{vehicleId}/images/…
companies/{companyId}/vehicles/{vehicleId}/assignments/…
companies/{companyId}/vehicles/{vehicleId}/inspections/…
companies/{companyId}/vehicles/{vehicleId}/seguimientos/…
companies/{companyId}/branding/…
companies/{companyId}/clients/{clientId}/documents/…
companies/{companyId}/receipts/{year}/{month}/…
```

Rutas API actualizadas:
- `src/app/api/upload/route.ts` (ya usaba el patrón)
- `src/app/api/upload-inspection/route.ts`
- `src/app/api/upload-assignment-photo/route.ts`
- `src/app/api/seguimiento/upload-foto/route.ts`

---

## Acción manual (1 minuto)

Supabase Dashboard → **Authentication** → **Providers** → Email →
activar **Leaked password protection** (HaveIBeenPwned).

Docs: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

## Fuera de alcance / diferido

- **Cifrado PII** (teléfono, docs de identidad): requiere diseño de claves,
  rotación y migración de datos; no bloquea multi-tenant.
- **Índices unused (54)**: advisor de performance; revisar en sesión dedicada.
- **WARN advisors** sobre RPC `SECURITY DEFINER` ejecutables por `authenticated`:
  intencionales (helpers RLS + APIs de negocio). No revocar.
