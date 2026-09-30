# FleetEase — Análisis de Seguridad y Performance

**Fecha:** 2026-09-30
**Repo:** `JuanGodinezperez18/FleetEase` @ `67bae1f`
**Stack:** Next.js 16.3.6 · React 19.2 · TypeScript 5.9 · Supabase (Auth + Postgres + Storage) · Stripe · Vercel

---

## Resumen ejecutivo

La base de seguridad es **sólida para un proyecto de esta etapa**: CSP con nonce por request, verificación de firma en webhooks de Stripe, autorización consistente en rutas API con aislamiento multi-tenant, RLS habilitado con 70+ policies y uploads con allowlist de MIME. Los principales riesgos están en la **capa de abuso** (rate limiting débil, registro sin protección server-side), la **cadena de suministro** (sin lockfile) y en deuda técnica que puede ocultar bugs (`ignoreBuildErrors`).

| Área | Estado |
|------|--------|
| Secretos / credenciales | ✅ Sin secretos hardcodeados; `.env.local` fuera del repo |
| Headers / CSP | ✅ Fuerte (nonce + strict-dynamic, HSTS, COOP/COEP) |
| Autorización en APIs | ✅ Consistente (Bearer + rol + tenant isolation) |
| RLS en base de datos | ✅ Habilitado + migraciones de hardening |
| Stripe / webhooks | ✅ Firma verificada con `constructEvent` |
| Rate limiting / anti-abuso | 🔴 Débil (3 de 26 endpoints, en memoria) |
| Cadena de suministro (deps) | 🔴 Sin `package-lock.json` |
| Calidad de build | 🟡 `ignoreBuildErrors: true` |
| Escalabilidad de datos | 🟡 Tablas completas al cliente con `limit(2000–5000)` |
| Bundle | 🟡 Bien lazy-load en general; huecos puntuales |

---

## Seguimiento de remediación

Cambios preparados en la rama `security/performance-hardening`; aún requieren revisión e integración en `master`.

### Implementado en la rama
- El registro muestra reCAPTCHA v2 y verifica el token en el servidor. Se valida una contraseña de al menos 8 caracteres con mayúscula, minúscula, número y símbolo.
- Se añadieron límites para registro (5/hora por IP), uploads (10/minuto), checkout (10/minuto) y las rutas que usan `requireAdmin` (30/minuto).
- `rate-limit.ts` puede usar Upstash Redis con un contador Lua atómico. Si no se configuran ambas variables de Upstash, conserva el fallback en memoria; por tanto, la protección distribuida requiere configurar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en Vercel.
- La CSP restringe `img-src` a los orígenes de Supabase, Firebase y los hosts usados por mapas y avatares; también permite los orígenes de reCAPTCHA.
- La ruta de Enterprise interno lee su ID, nombre y confirmación de variables de entorno, y responde 503 si faltan.
- jsPDF, jspdf-autotable y xlsx se cargan solo cuando se genera un reporte.

### Configuración pendiente para desplegar estos cambios
- Añadir `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` y `RECAPTCHA_SECRET_KEY`.
- Añadir `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` para que el rate limiting sea compartido entre instancias.
- Añadir `INTERNAL_COMPANY_ID`, `INTERNAL_COMPANY_NAME` e `INTERNAL_ENTERPRISE_CONFIRMATION` para conservar habilitada la operación interna.

### Pendiente de remediación
- **S3:** generar y commitear `package-lock.json` desde un entorno con npm para fijar las resoluciones completas.
- **S4:** resolver errores existentes de TypeScript antes de retirar `ignoreBuildErrors` y activar el chequeo en CI.
- **P1:** diseñar y migrar paginación/selección de columnas en el proveedor de datos sin cambiar la semántica multiempresa.
- **P3:** revisar la fuente CDN de SheetJS y fijar su integridad o migrar a un paquete mantenido.
- **P4:** localizar tablas grandes y añadir debounce/virtualización donde corresponda.
- Ampliar la cobertura de rate limiting a las rutas restantes.

No se ejecutaron manualmente build ni pruebas automatizadas durante esta edición remota. El preview automático de Vercel completó la compilación correctamente; las pruebas automatizadas no se ejecutaron.

---

## 1. SEGURIDAD

### ✅ Lo que está bien hecho

1. **CSP por request con nonce + `strict-dynamic`** (`middleware.ts`) — patrón moderno correcto; sin `unsafe-eval` en producción (solo dev).
2. **Headers de seguridad completos**: HSTS con preload, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, COOP `same-origin`, COEP `credentialless`.
3. **`requireAdmin()`** (`src/lib/admin-api-auth.ts`): valida Bearer token contra Supabase Auth, chequea rol (`admin`/`super_admin`) y **aislamiento por `company_id`** para no-operar sobre otra empresa. Las rutas `/api/admin/users/*` lo usan.
4. **Cron jobs protegidos** con `Bearer CRON_SECRET` y fallan cerrados si el secreto no está configurado (`insurance-check`, `license-check`, `maintenance-check`, `subscription-expiry-check`).
5. **Webhook de Stripe** verifica firma: `stripe.webhooks.constructEvent(body, signature, secret)` (línea 89 de `webhook/route.ts`).
6. **Uploads endurecidos** (`api/upload`): allowlist de MIME por carpeta, límite 10 MB, rechazo de `../` (path traversal), `upsert: false`.
7. **`download-file` / `delete-file`** verifican ownership del archivo (`verifyFileOwnership`) → sin IDOR trivial.
8. **`upload-foto` (seguimiento)** valida que el vehículo pertenezca a la empresa del usuario (403 cross-tenant).
9. **RLS habilitado** en las tablas (`001_enable_rls_policies.sql`, 70 policies) + migraciones posteriores de *lockdown* de funciones financieras y trazabilidad.
10. **Sin secretos en el código**: solo referencias a `process.env.*`; únicamente `.env.local.template` versionado (sin valores reales).
11. `dangerouslySetInnerHTML` solo en 2 lugares (QR generado localmente y wrapper de Recharts) — riesgo bajo.

### 🔴 Hallazgos

#### S1 — `/api/register` sin rate limiting ni verificación server-side de reCAPTCHA (ALTO)
- **Dónde:** `src/app/api/register/route.ts` — solo valida campos obligatorios y delega en `supabaseAdmin.auth.admin.createUser`.
- **Riesgo:** creación masiva de cuentas bot (afecta costos y datos), credential stuffing sin freno, spam de empresas de prueba. El reCAPTCHA del frontend **no se verifica en el servidor**, por lo que se bypassea con curl.
- **Recomendación:**
  1. Verificar el token de reCAPTCHA/Turnstile en el servidor (`https://www.google.com/recaptcha/api/siteverify`).
  2. Rate limit por IP: ≤ 5 registros/hora.
  3. Validar fortaleza de contraseña en servidor (mín. 8 chars + complejidad), no solo en cliente.

#### S2 — Rate limiting inefectivo en serverless y con cobertura mínima (ALTO)
- **Dónde:** `src/lib/rate-limit.ts` — almacenamiento **en memoria** (el propio archivo admite que en Vercel multi-instancia no funciona); solo se aplica en `health`, `notifications/send` y `notifications/broadcast`. **23 de 26 endpoints sin rate limit**, incluidos `register`, `stripe/checkout`, `admin/users/*`, `upload/*`.
- **Riesgo:** brute force a endpoints de admin, abuso de cuotas de upload, enumeración.
- **Recomendación:** migrar a `@upstash/ratelimit` + Redis (multi-región en Vercel) y aplicar limiters diferenciados: auth (5/min), uploads (10/min), admin (30/min), stripe (10/min).

#### S3 — Sin `package-lock.json` commiteado (ALTO)
- **Dónde:** raíz del repo — no hay lockfile de ningún gestor.
- **Riesgo:** builds no reproducibles; `npm audit` no corre (verificado: `ENOLOCK`); cada `npm install` puede resolver versiones distintas de las 100+ dependencias con rango `^` → **superficie de ataque de supply chain** y regresiones silenciosas.
- **Recomendación:** generar y commitear `package-lock.json`, correr `npm audit` en CI (o `npm audit signatures`), y considerar Dependabot/Renovate.

#### S4 — `typescript.ignoreBuildErrors: true` (MEDIO)
- **Dónde:** `next.config.mjs` (marcado como "TEMPORAL").
- **Riesgo:** errores de tipos se despliegan a producción; los errores de tipos suelen ser el síntoma de bugs de validación/undefined que pueden traducirse en fallos de autorización o crashes.
- **Recomendación:** correr `npx tsc --noEmit` en CI como gate y quitar la bandera; hay TODO explícito en el config.

#### S5 — CSP permisiva en `img-src` y `style-src` (BAJO)
- **Dónde:** `middleware.ts` → `img-src 'self' data: https: blob: ...` acepta **cualquier host HTTPS**; `style-src 'unsafe-inline'`.
- **Riesgo:** exfiltración vía `<img>` a host del atacante si hay XSS (limitado por `script-src` estricto); CSS injection de baja criticidad.
- **Recomendación:** restringir `img-src` a los buckets de Supabase/Firebase + `self`; mantener `unsafe-inline` en estilos es aceptable con nonce en scripts.

#### S6 — IDs y confirmación hardcodeados en `grant-internal-enterprise` (BAJO)
- **Dónde:** `src/app/api/admin/grant-internal-enterprise/route.ts` — `INTERNAL_COMPANY_ID` y `CONFIRMATION` literales en el código.
- **Nota:** la ruta NO usa `requireAdmin`, pero implementa sus propios checks equivalentes (super_admin + company_id + confirmación), así que **no es una vulnerabilidad abierta**; solo algo de "seguridad por oscuridad" y divergencia del patrón.
- **Recomendación:** mover el ID/confirmación a variables de entorno y reutilizar `requireAdmin` con `targetCompanyId` para consistencia.

### ✅ Verificaciones adicionales realizadas
- `.env.local` / secretos reales en git: **no encontrados** (solo template).
- `sk_live`/`AIza`/`service_role`/tokens de GitHub en código: **no encontrados**.
- SQL injection: acceso vía Supabase query builder y 23 llamadas a `.rpc()` con parámetros; sin SQL crudo con interpolación detectado.
- IDOR en archivos: mitigado por `verifyFileOwnership` en download y delete.

---

## 2. PERFORMANCE

### ✅ Lo que está bien hecho

1. **React Query bien configurado**: `staleTime: 10 min`, `gcTime: 30 min` por defecto (`providers.tsx`) y tiempos por query.
2. **Lazy loading de dependencias pesadas**: `xlsx` y `tesseract.js` se importan dinámicamente (`await import(...)`) en la mayoría de usos.
3. **Índices de DB**: migración `20260926070000_performance_hardening_indexes_rls.sql` crea índices sobre FKs frecuentes (`accounts_payable`, `client_write_offs`, `supplier_purchase_*`, `catalog_items`).
4. **Imágenes**: `sharp` como dependencia, `remotePatterns` acotados a buckets conocidos, `dangerouslyAllowSVG: false`, compresión client-side con `browser-image-compression`.
5. **Headers/`poweredByHeader: false`** y COEP `credentialless` sin bloquear previews.

### 🟡 Áreas de mejora

#### P1 — Carga de tablas completas al cliente (MEDIO-ALTO)
- **Dónde:** `src/contexts/data-provider-supabase.tsx` — queries tipo `select('*').limit(2000–5000)` para clients, vehicles, credits, financial_records, mileage_logs.
- **Impacto:** con cientos de vehículos/movimientos, el payload y el trabajo de mapeo en cliente crecen sin control; `select('*')` trae columnas que la UI no usa (incl. notas largas, URLs).
- **Recomendación:**
  1. `select()` explícito con solo columnas necesarias.
  2. Paginación real (range) o infinite query en listados.
  3. Agregados en servidor (views/materialized views) para dashboards.

#### P2 — Huecos de lazy loading en exportación y gráficos (MEDIO)
- **Dónde:** `src/lib/reports/pdf-generator.ts` (`jsPDF` + `jspdf-autotable`) y `excel-generator.ts` importan **estáticamente**; `xlsx` también estático en `mileage-history-modal.tsx`. `recharts` (~400 KB min) se importa en páginas de dashboard y en páginas de auth se usa `framer-motion`.
- **Impacto:** peso extra en el bundle inicial de las rutas que importan esos módulos aunque el usuario nunca exporte nada.
- **Recomendación:** mover `pdf-generator`/`excel-generator` a `await import()` (patrón ya usado en el resto del código) y `next/dynamic` para los paneles con Recharts.

#### P3 — `xlsx` desde CDN de SheetJS sin lockfile (MEDIO, combo con S3)
- **Dónde:** `package.json` → `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz"`.
- **Impacto:** dependencia externa fuera del registry de npm; si el CDN cae o es comprometido, el build se rompe o peor.
- **Recomendación:** verificar el hash o usar un fork publicado en npm; con lockfile queda congelada la URL exacta.

#### P4 — Búsquedas/filtros sin debounce evidente (BAJO)
- Recomendación: revisar tablas grandes (`data-table`) para debounce de 300 ms en inputs de búsqueda y virtualización si se superan ~200 filas.

#### P5 — CSP con `upgrade-insecure-requests` + doble set de headers (BAJO, solo informativo)
- Los headers de seguridad se definen en `middleware.ts` **y** en `next.config.mjs` (HSTS/X-Frame/etc. duplicados). No rompe nada, pero conviene tener una sola fuente de verdad para evitar divergencias.

---

## 3. Plan de acción sugerido

| Prioridad | Acción | Esfuerzo |
|-----------|--------|----------|
| 🔴 1 | Verificar reCAPTCHA + rate limit en `/api/register` | Bajo |
| 🔴 2 | Commitear `package-lock.json` + `npm audit` en CI | Bajo |
| 🔴 3 | Rate limiting distribuido (Upstash) en auth/uploads/admin/stripe | Medio |
| 🟡 4 | Quitar `ignoreBuildErrors` con gate `tsc --noEmit` en CI | Medio |
| 🟡 5 | `select()` explícito + paginación en `data-provider-supabase` | Medio |
| 🟡 6 | Lazy-load de `pdf-generator`/`excel-generator`/paneles Recharts | Bajo |
| 🟢 7 | Endurecer `img-src` de la CSP | Bajo |
| 🟢 8 | Unificar headers de seguridad en una sola fuente | Bajo |

---

*Metodología: revisión estática de código (grep/análisis de rutas API, middleware, migraciones SQL, config de Next.js), verificación de git history para secretos, e intento de `npm audit`. No se ejecutó la aplicación ni pruebas de penetración dinámicas.*
