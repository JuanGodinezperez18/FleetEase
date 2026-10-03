# OpenClaw / Mimoclaw Workspace Progress

Branch created from the mimoclaw_workspace.tar.gz snapshot (2026-10-02).

- Workspace bootstrap: 2026-10-02T17:50:35Z
- Project: FleetEase Manager (Next.js + Supabase migration)
- Skills and agents included in the original workspace.

## Última actualización: 2026-10-03 (Bloques A parcial + B completo + C completo)

### ✅ Completado

**Bloque A (backend / seguridad) — parcial:**
- Módulos `src/lib/security/` (`validation`, `api-error`, `cookies`).
- Errores opacos + cookies endurecidas en middleware/API.
- `NEXT_PUBLIC_BYPASS_SESSION_COOKIE` neutralizada.
- Zod / validación en rutas críticas (gap: resto de APIs — ver pendiente).

**Bloque B (BD / multi-tenant) — completo:**
- Auditoría live: RLS 37/37, `company_id`, `search_path` en DEFINER, triggers service_role.
- `REVOKE` residuales de `anon`.
- Storage policies tenant: `vehicle-images`, `company-logos`, `seguimientos`
  (+ preexistentes `documents`, `inspection-images`).
- Paths de upload canónicos `companies/{companyId}/…` en inspection, assignment, seguimiento.
- Notifications RLS: solo dueño (`uid`) o admin/super_admin.
- Docs: `docs/bloque-b-security-audit-2026-10-03.md`.
- ⏳ Manual: activar Leaked Password Protection en Supabase Auth Dashboard.

**Bloque C (producto / UX) — completo:**
- 404 custom, cookie consent, RevealSection + reduced motion, bloqueo APK en middleware,
  `npm audit` en CI.

### 📋 Pendiente (próxima sesión)

1. **Bloque D (verificación):** `npm ci` → type-check → test:ci → build.
2. **Zod en rutas API restantes** (gap Bloque A).
3. Auth Dashboard: HaveIBeenPwned ON.
4. (Opcional) Cifrado PII / limpieza índices unused.

### ⛔ Restricciones del proyecto (respetadas)

- No tocar `src/lib/vehicle-calculations.ts` ni `src/lib/financial-metrics.ts`.
- Mantener soft delete (`is_deleted`) y aislamiento por `company_id`.
