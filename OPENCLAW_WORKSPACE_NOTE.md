# OpenClaw / Mimoclaw Workspace Progress

Branch created from the mimoclaw_workspace.tar.gz snapshot (2026-10-02).

- Workspace bootstrap: 2026-10-02T17:50:35Z
- Project: FleetEase Manager (Next.js + Supabase migration)
- Skills and agents included in the original workspace.

## Última actualización: 2026-10-04 (Bloques A parcial + C completo)

### ✅ Completado

**Bloque A (backend / seguridad) — parcial:**
- Nuevos módulos en `src/lib/security/`:
  - `validation.ts` — `parseJsonBody()` + esquemas Zod reutilizables (id, email,
    password, rol, fechas, paginación…).
  - `api-error.ts` — respuestas de error **opacas** con `requestId`, log
    server-side, y `authErrorMessage()` (mapeo seguro de códigos Auth; nunca
    `error.message` crudo al cliente).
  - `cookies.ts` — `hardenAuthCookieOptions()` / `hardenServerCookieOptions()`:
    fuerza `Secure` (prod) + `SameSite=lax` + `path=/`. Nota: `httpOnly` queda
    en `false` para cookies de auth porque `createBrowserClient` (@supabase/ssr)
    las lee desde JS; documentado en el módulo.
- Fugas de errores internos eliminadas en 10 archivos:
  `admin/users/{create,delete,resend-welcome,send-password-reset,update-claims,
  update-password}`, `register`, `cron/insurance-check`, `cron/license-check`
  (incluye eliminación de `details: error.message`).
- Cookies endurecidas en `middleware.ts`, `api/logout`, `api/health`.
- `NEXT_PUBLIC_BYPASS_SESSION_COOKIE` neutralizada en `AGENTS.md` / `CLAUDE.md`
  (comentada + advertencia: prohibida en producción). Verificado que ningún
  código la lee.

**Bloque C (producto / UX) — completo:**
- `src/app/not-found.tsx` — 404 personalizada con tokens `--fe-*`.
- Banner de cookies con consentimiento real:
  - `src/lib/cookie-consent.ts` — modelo versionado (necessary/analítica/marketing),
    persistencia en localStorage + cookie de respaldo (180 días, SameSite=Lax,
    Secure en prod), eventos `COOKIE_CONSENT_EVENT` / `COOKIE_PREFERENCES_EVENT`.
  - `src/components/cookie-consent/cookie-banner.tsx` — Aceptar todas / Solo
    necesarias / Configurar (sin dark patterns), sin animaciones.
  - `src/components/cookie-consent/manage-cookies-button.tsx` — botón en
    `/cookies` para reabrir preferencias.
  - Wiring en `src/app/layout.tsx`.
- Animaciones de landing respetando `prefers-reduced-motion`:
  - `src/components/landing/landing-reveal.tsx` (`RevealSection` / `Reveal` con
    framer-motion + `useReducedMotion` → render estático si reduce).
  - 7/7 secciones de `src/app/page.tsx` convertidas a `RevealSection`.
- Ocultar APKs: guard en `middleware.ts` → 404 para `.apk/.xapk/.aab/.ipa`
  (verificado: no hay binarios de app en el repo; es defensa preventiva).
- `npm audit` en CI: step en `.github/workflows/quality-gate.yml`
  (`--omit=dev --audit-level=high`, `continue-on-error` hasta limpiar backlog).

### 📋 Pendiente (próxima sesión)

1. **Verificación (Bloque D)** — bloqueada hasta que `npm ci` complete:
   cada instalación quedó truncada al abortarse sesiones previas
   (`node_modules/typescript` incompleto). Ejecutar en orden:
   `npm ci` → `npm run type-check` → `npm run test:ci` → `npm run build`.
2. **Zod en las 25 rutas API restantes** (gap mayor del Bloque A): usar
   `parseJsonBody()` de `src/lib/security/validation.ts` + esquemas del mismo
   módulo. Rutas sin validación esquemática:
   - JSON: `admin/push-subscription`, `admin/users/{create,delete,resend-welcome,
     send-password-reset,update-claims,update-password}`, `register`,
     `notifications/broadcast`, `stripe/checkout`.
   - FormData (endurecer tipo/tamaño de archivo + `safe-storage-path`):
     `upload`, `upload-assignment-photo`, `upload-inspection`,
     `seguimiento/upload-foto`.
   - Sin body (validar query/headers donde aplique): `auth/profile`, `health`,
     `logout`, `stripe/{portal,status,webhook}`, `cron/*`.
   - Ya con Zod: `delete-file`, `download-file`, `notifications/send`.
3. **Bloque B (BD)** — auditoría RLS tabla por tabla, aislamiento por
   `company_id`, RPCs `SECURITY DEFINER` con `search_path` fijo, cifrado de
   PII, políticas de Storage por tenant.

### ⛔ Restricciones del proyecto (respetadas)

- No tocar `src/lib/vehicle-calculations.ts` ni `src/lib/financial-metrics.ts`.
- Mantener soft delete (`is_deleted`) y aislamiento por `company_id`.

### Archivos tocados en esta tanda

Ver `git log` de esta rama. Resumen: 17 modificados + 7 nuevos
(`src/lib/security/{validation,api-error,cookies}.ts`, `src/lib/cookie-consent.ts`,
`src/components/cookie-consent/*`, `src/components/landing/landing-reveal.tsx`,
`src/app/not-found.tsx`).
