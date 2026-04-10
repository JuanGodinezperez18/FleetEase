# Guía de Deploy en Vercel - FleetEase Manager

## 1. Variables de Entorno en Vercel

Configura estas variables en **Vercel Dashboard → Project Settings → Environment Variables**:

### Requeridas
| Variable | Valor | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Clave anónima de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | ⚠️ **SOLO servidor**, nunca exponer al cliente |
| `NEXT_PUBLIC_APP_URL` | `https://tu-app.vercel.app` | URL de producción |

### Stripe (Pagos)
| Variable | Valor | Notas |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` o `sk_test_...` | ⚠️ **SOLO servidor** |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | ⚠️ **SOLO servidor**, del dashboard de Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` o `pk_test_...` | Pública, safe para cliente |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER` | `price_xxx` | Price ID del plan Starter |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` | `price_xxx` | Price ID del plan Pro |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE` | `price_xxx` | Price ID del plan Enterprise |

### Cron Jobs
| Variable | Valor | Notas |
|---|---|---|
| `CRON_SECRET` | Random string (genera con `openssl rand -hex 32`) | Protege las rutas `/api/cron/*` |

### Salud
| Variable | Valor | Notas |
|---|---|---|
| `HEALTH_CHECK_SECRET` | Random string | Acceso al endpoint `/api/health` |

### Opcionales (durante migración)
| Variable | Valor | Notas |
|---|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | Tu project ID | Solo durante migración Firebase → Supabase |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase service account email | Solo durante migración |
| `FIREBASE_ADMIN_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n..."` | ⚠️ **SOLO servidor** |

---

## 2. Configurar Stripe Webhook

1. Ve a **Stripe Dashboard → Developers → Webhooks**
2. Click **"Add endpoint"**
3. URL: `https://tu-app.vercel.app/api/stripe/webhook`
4. Selecciona estos eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copia el **Signing Secret** (`whsec_...`) y pégalo en `STRIPE_WEBHOOK_SECRET` en Vercel

### Para testing local con Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copia el webhook secret que imprime y agrégalo a .env.local
```

---

## 3. Configurar Vercel Cron Jobs

Los cron jobs se configuran automáticamente con el archivo `vercel.json` incluido en el proyecto.

Al hacer deploy, Vercel activará automáticamente:
- `0 2 * * *` → Limpieza de inspecciones expiradas
- `0 8 * * *` → Check de mantenimiento
- `0 9 * * *` → Check de seguros
- `0 10 * * *` → Check de licencias

**Importante**: Necesitas tener un plan **Hobby o superior** en Vercel para usar Cron Jobs.

Verifica que estén activos en: **Vercel Dashboard → Cron Jobs**

---

## 4. Ejecutar RLS en Supabase

1. Ve a **Supabase Dashboard → SQL Editor**
2. Copia el contenido de `supabase/migrations/001_enable_rls_policies.sql`
3. Ejecuta el SQL completo
4. Verifica que todas las tablas tengan RLS habilitado:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
   Todas deben mostrar `rowsecurity = true`

---

## 5. Deploy

```bash
# Push a tu rama principal
git add .
git commit -m "feat: security fixes + stripe migration + cron jobs"
git push origin main
```

Vercel detectará el push automáticamente y hará deploy.

### Verificar deploy:
1. Abre `https://tu-app.vercel.app/api/health` → debe devolver `{"status":"healthy"}`
2. Abre `https://tu-app.vercel.app/api/stripe/status` (autenticado) → debe devolver datos de suscripción
3. Verifica los cron jobs en Vercel Dashboard → Cron Jobs

---

## 6. Post-Deploy Checklist

- [ ] Health check responde correctamente
- [ ] Stripe webhook recibe eventos (verifica en Stripe Dashboard → Webhooks → ver evento reciente)
- [ ] Cron jobs ejecutan en el horario configurado (verifica en Vercel → Cron Jobs → ejecuciones recientes)
- [ ] RLS funciona: un usuario de empresa A NO puede ver datos de empresa B
- [ ] Checkout de Stripe redirige correctamente
- [ ] Billing portal funciona
- [ ] Rate limiting funciona (intenta hacer muchas requests rápidas)

---

## 7. Firebase Functions - Cuándo eliminar

**NO elimines las Firebase Functions hasta que:**
1. ✅ Todas las nuevas API routes estén probadas en producción
2. ✅ El checkout de Stripe funcione end-to-end
3. ✅ Los cron jobs de Vercel estén ejecutando correctamente
4. ✅ El webhook de Stripe esté procesando eventos

Cuando estés listo:
```bash
# Firebase: desactivar functions (no eliminar inmediatamente)
firebase functions:delete createCheckoutSession
firebase functions:delete getSubscriptionStatus
firebase functions:delete createPortalSession
firebase functions:delete scheduledMaintenanceCheck
firebase functions:delete scheduledInsuranceCheck
firebase functions:delete scheduledLicenseCheck
firebase functions:delete deleteExpiredInspections
```

Las functions de Auth (`createUser`, `updateUser`, `deleteUser`, etc.) se pueden eliminar **después** de completar la migración de Auth a Supabase.
