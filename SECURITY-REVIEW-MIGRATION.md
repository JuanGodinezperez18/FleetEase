# Security Review & Migration - Resumen de Cambios

**Fecha**: 10 de abril de 2026
**Stack**: Supabase PostgreSQL + Supabase Auth + Stripe + Vercel Deploy

---

## ✅ Cambios Completados

### 1. 🔴 CORS Fix
**Archivo**: `src/config/security.ts`
- Eliminó wildcard `*` en `Access-Control-Allow-Origin`
- Ahora usa `NEXT_PUBLIC_APP_URL` o fallback a `https://fleetease-manager.vercel.app`

### 2. 🔴 Row Level Security (RLS) Policies
**Archivo nuevo**: `supabase/migrations/001_enable_rls_policies.sql`
- Políticas RLS para **25 tablas** con aislamiento multi-tenant por `company_id`
- Funciones auxiliares `auth_user_role()` y `auth_user_company_id()` para rendimiento
- **18 índices** creados para optimizar consultas RLS
- **Acción requerida**: Ejecutar este SQL en el SQL Editor de Supabase o con `supabase db push`

### 3. 🟡 Rate Limiting
**Archivo nuevo**: `src/lib/rate-limit.ts`
- Implementación sin dependencias externas (memoria con TTL + cleanup automático)
- 5 limitadores preconfigurados:
  - `authLimiter`: 10 intentos / 15 min (login)
  - `uploadLimiter`: 20 uploads / min
  - `notificationLimiter`: 5 notificaciones / min
  - `apiLimiter`: 200 requests / 15 min (general)
  - `healthLimiter`: 30 checks / min
- Headers `X-RateLimit-*` incluidos en respuestas 429
- **Aplicado a**: `/api/health`, `/api/upload-inspection`, `/api/notifications/send`, `/api/notifications/broadcast`

### 4. 🟡 Stripe API Routes (reemplazan Firebase Functions)
**Archivos nuevos**:
- `src/app/api/stripe/checkout/route.ts` → Crea sesión de checkout
- `src/app/api/stripe/portal/route.ts` → Crea sesión de billing portal
- `src/app/api/stripe/status/route.ts` → Obtiene estado de suscripción
- `src/app/api/stripe/webhook/route.ts` → Maneja webhooks de Stripe

**Hook actualizado**: `src/hooks/use-subscription.ts`
- Ya no usa Firebase Functions (`httpsCallable`)
- Ahora llama a las rutas `/api/stripe/*` directamente
- `verifyUpgrade` simplificado: el webhook ya actualizó la BD

**Eventos que maneja el webhook**:
- `checkout.session.completed` → Activa suscripción y plan
- `customer.subscription.updated` → Actualiza status y plan
- `customer.subscription.deleted` → Cancela suscripción, downgrade a starter
- `invoice.payment_failed` → Log para recovery

### 5. 🟡 Cron Jobs como Vercel Cron (reemplazan Firebase Scheduled Functions)
**Archivos nuevos**:
- `src/app/api/cron/maintenance-check/route.ts` → Revisa mantenimiento de vehículos
- `src/app/api/cron/insurance-check/route.ts` → Revisa seguros por vencer
- `src/app/api/cron/license-check/route.ts` → Revisa licencias por vencer
- `src/app/api/cron/inspection-cleanup/route.ts` → Limpia inspecciones expiradas

**Configuración**: `vercel.json`
```json
{
  "crons": [
    { "path": "/api/cron/inspection-cleanup", "schedule": "0 2 * * *" },
    { "path": "/api/cron/maintenance-check",     "schedule": "0 8 * * *" },
    { "path": "/api/cron/insurance-check",        "schedule": "0 9 * * *" },
    { "path": "/api/cron/license-check",          "schedule": "0 10 * * *" }
  ]
}
```

**Protegidos por**: `CRON_SECRET` env var (Authorization header)

### 6. 🟢 Zod Validation en API Routes
**Routes con validación Zod**:
- `/api/delete-file` → Schema `DeleteFileSchema`
- `/api/download-file` → Schema `DownloadFileSchema`
- `/api/notifications/send` → Schema `SendNotificationSchema`
- `/api/stripe/checkout` → Validación de planId + companyId
- `/api/stripe/portal` → Validación de companyId opcional

### 7. 🟢 Audit dangerouslySetInnerHTML
- `src/components/ui/chart.tsx` → **SEGURO**. Solo usa valores internos constantes y `React.useId()`, no input de usuario.

### 8. 🟢 Middleware Verificado
- `middleware.ts` → Ya usa Supabase correctamente con `createServerClient` de `@supabase/ssr`
- Verifica sesión, obtiene perfil con role y company_id
- Protege rutas `/dashboard`, `/partner`, `/client` por rol

### 9. Variables de Entorno Actualizadas
**Archivo**: `.env.local.template`
- Agregadas: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_*`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`

---

## ⏳ Pendiente (Requiere más trabajo / decisiones)

### A. Migración Auth Completa: Firebase Auth → Supabase Auth
**Estado**: El middleware ya usa Supabase Auth. Las API routes mixtas usan ambos sistemas.
**Qué falta**:
1. Reemplazar verificación de Firebase tokens en API routes (`admin.auth().verifyIdToken()`) con Supabase session
2. Eliminar dependencia de Firebase Admin SDK en routes que ya pueden usar Supabase
3. Migrar funciones de user management (`createUser`, `updateUser`, `deleteUser`) a Supabase Admin API
4. Actualizar el Auth Provider en el cliente para usar solo Supabase

**Archivos afectados**:
- `src/app/api/upload/route.ts` (Firebase token)
- `src/app/api/delete-file/route.ts` (Firebase token)
- `src/app/api/download-file/route.ts` (Firebase token)
- `src/app/api/notifications/send/route.ts` (Firebase session cookie)
- `src/app/api/notifications/broadcast/route.ts` (Firebase session cookie)
- `src/app/api/seguimiento/upload-foto/route.ts` (Firebase session cookie)
- `src/lib/server/firebase-admin.ts` (puede eliminarse después de migrar)

### B. Notificaciones: FCM → Supabase Realtime + Web Push
**Estado**: Las notificaciones siguen usando FCM/Firebase.
**Opciones**:
1. **Corto plazo**: Mantener FCM solo para push notifications (Firebase Messaging es gratis y funciona bien)
2. **Mediano plazo**: Migrar a Web Push API (VAPID) + Supabase Realtime para notificaciones in-app
3. **Largo plazo**: Usar un servicio como OneSignal o Resend para email + push

**Recomendación**: Mantener FCM temporalmente y migrar gradualmente a Web Push.

### C. Limpieza de Firebase Functions
**Estado**: Las Firebase Functions en `functions/` siguen existiendo.
**Cuándo eliminar**: Después de que las nuevas rutas de API estén probadas en producción y el equipo confirme que todo funciona.
**Qué se puede eliminar primero**:
- `functions/src/index.ts` → Stripe functions (ya reemplazadas)
- `functions/src/cron/*` → Cron functions (ya reemplazadas por Vercel Cron)
- `functions/src/notifications/` → Si se migra notificaciones

### D. Stripe Webhook en Vercel
**Acción requerida en Stripe Dashboard**:
1. Crear webhook endpoint apuntando a `https://tu-app.vercel.app/api/stripe/webhook`
2. Seleccionar eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Copiar el `STRIPE_WEBHOOK_SECRET` y agregarlo como env var en Vercel

---

## 📋 Checklist Pre-Deploy

- [ ] Ejecutar `supabase/migrations/001_enable_rls_policies.sql` en Supabase
- [ ] Configurar env vars en Vercel:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER`
  - `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`
  - `NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Configurar Stripe Webhook endpoint → `/api/stripe/webhook`
- [ ] Activar Vercel Cron jobs (se activan automáticamente con `vercel.json` en deploy)
- [ ] Configurar `NEXT_PUBLIC_APP_URL` para producción
- [ ] Probar checkout flow completo en modo test
- [ ] Probar webhook con Stripe CLI localmente
- [ ] Verificar que RLS funciona correctamente con queries de prueba
- [ ] Run `npm audit` y fix vulnerabilities
- [ ] Run `npm run build` exitosamente

---

## 📊 Resumen de Firebase Functions

### ✅ Ya reemplazadas:
| Firebase Function | Reemplazo | Estado |
|---|---|---|
| `createCheckoutSession` | `/api/stripe/checkout` | ✅ Listo |
| `getSubscriptionStatus` | `/api/stripe/status` | ✅ Listo |
| `createPortalSession` | `/api/stripe/portal` | ✅ Listo |
| `handleStripeWebhook` | `/api/stripe/webhook` | ✅ Listo |
| `scheduledMaintenanceCheck` | `/api/cron/maintenance-check` | ✅ Listo |
| `scheduledInsuranceCheck` | `/api/cron/insurance-check` | ✅ Listo |
| `scheduledLicenseCheck` | `/api/cron/license-check` | ✅ Listo |
| `deleteExpiredInspections` | `/api/cron/inspection-cleanup` | ✅ Listo |

### ⏳ Aún necesitan migración:
| Firebase Function | Complejidad | Notas |
|---|---|---|
| `createUser` | Alta | Necesita Supabase Admin API + email de bienvenida |
| `updateUser` | Media | Puede ser API route con service role key |
| `deleteUser` | Alta | Soft delete + desactivar auth user |
| `setAdminClaims` | Media | Reemplazar con UPDATE directo a tabla users + RLS |
| `syncUserClaims` | Baja | No necesario con Supabase (roles en tabla) |
| `createCompanyAndUser` | Alta | Flow completo de SaaS registration |
| `refreshMyClaims` | Baja | No necesario con Supabase |
| `sendPasswordResetEmail` | Baja | Usar Supabase Auth client SDK |
| `resendWelcomeEmail` | Baja | Implementar con Resend/SendGrid |
| `onUserUpdated` (trigger) | Media | Reemplazar con DB trigger o manejar en API |
| `sendWeeklyReport` | Media | Puede ser otro Vercel Cron job |

---

## 🎯 Próximos Pasos Recomendados

1. **Ejecutar RLS en Supabase** → Es lo más crítico para seguridad
2. **Configurar Stripe en Dashboard** → Products, Prices, Webhooks
3. **Deploy a Vercel** → Probar las nuevas rutas en staging
4. **Migrar Auth gradualmente** → Empezar con las API routes de upload/download
5. **Eliminar Firebase Functions** una por una después de verificar reemplazos
