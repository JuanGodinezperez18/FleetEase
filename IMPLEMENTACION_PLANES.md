# Guía de Implementación: Sistema de Planes y Suscripciones

## Resumen

Se ha implementado un sistema completo de gestión de planes y suscripciones para FleetEase Manager, alineado con los planes publicados en la landing page.

## Planes Disponibles

| Plan | Precio | Vehículos | Usuarios | Características Principales |
|------|--------|-----------|----------|----------------------------|
| **Starter** | $299/mes | 5 | 1 | Gestión básica, dashboard, soporte email |
| **Pro** | $599/mes | 15 | 3 | Rentabilidad, Client Score, alertas, reportes Excel |
| **Enterprise** | $999/mes | Ilimitados | Ilimitados | API, multi-empresa, white-label, soporte 24/7 |

## Archivos Creados/Modificados

### Nuevos Archivos

1. **`src/config/plans.ts`**
   - Configuración de planes
   - Funciones utilitarias para validación de límites
   - Mensajes de error personalizados

2. **`src/config/stripe.ts`**
   - Configuración de Stripe
   - Mapeo de precios y características
   - Funciones de verificación de features

3. **`src/config/feature-flags.ts`**
   - Sistema de feature flags por plan
   - Control de características disponibles
   - Mapeo de rutas a features

4. **`src/hooks/use-subscription.ts`**
   - Hook para gestión de suscripción
   - Funciones: upgradePlan, openPortal, verifyUpgrade
   - Estado de la suscripción

5. **`src/app/dashboard/settings/subscription/page.tsx`**
   - Página de gestión de suscripción
   - Comparador de planes
   - Estado de uso (vehículos/usuarios)
   - Botones de upgrade y gestión de billing

6. **`src/app/dashboard/faq/page.tsx`**
   - Página de preguntas frecuentes
   - Búsqueda de preguntas
   - Filtros por categoría
   - 28 preguntas sobre todas las funcionalidades

### Archivos Modificados

1. **`functions/src/index.ts`**
   - Integración con Stripe
   - Funciones: `createCheckoutSession`, `getSubscriptionStatus`, `createPortalSession`
   - Manejo de webhooks

2. **`src/types/index.ts`**
   - Agregados campos: `plan`, `maxVehicles`, `maxUsers` a interfaz `Company`

3. **`src/contexts/data-provider.tsx`**
   - Agregado `rawCompanies` al DataContextType

4. **`src/app/registro/page.tsx`**
   - Selector visual de planes
   - Envío del plan seleccionado al registrar

5. **`src/components/layout/sidebar-nav.tsx`**
   - Enlace a "Suscripción y Planes"
   - Enlace a "Preguntas Frecuentes"
   - Enlace a "Contactar Soporte" (mailto)

6. **`src/app/dashboard/vehicles/page.tsx`**
   - Validación de límite de vehículos al crear

7. **`src/app/dashboard/users/page.tsx`**
   - Validación de límite de usuarios al crear

8. **`.env.example`**
   - Variables de entorno de Stripe
   - Instrucciones de configuración

## Configuración Requerida

### 1. Stripe Dashboard

1. Crea cuenta en [Stripe](https://stripe.com)
2. Crea 3 productos con sus precios:
   - Starter ($299 MXN)
   - Pro ($599 MXN)
   - Enterprise ($999 MXN)
3. Copia los Price IDs
4. Configura webhooks:
   - Endpoint: `https://tu-dominio/functions/checkout`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`

### 2. Variables de Entorno

```bash
# Stripe (Cliente)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE=price_...

# Stripe (Servidor)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://tu-dominio.com
```

### 3. Secrets de Cloud Functions

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set APP_URL
firebase functions:secrets:set STRIPE_PRICE_ID_STARTER
firebase functions:secrets:set STRIPE_PRICE_ID_PRO
firebase functions:secrets:set STRIPE_PRICE_ID_ENTERPRISE
```

## Características por Plan

### Plan Starter
- ✅ Gestión de vehículos (hasta 5)
- ✅ Gestión de clientes
- ✅ Gestión de socios
- ✅ Registro de ingresos/gastos
- ✅ Dashboard básico
- ✅ Notificaciones por email
- ❌ Rentabilidad por vehículo
- ❌ Client Score
- ❌ Alertas de mantenimiento
- ❌ Reportes en Excel
- ❌ Múltiples usuarios
- ❌ API de integración

### Plan Pro
- ✅ Todo lo del Starter
- ✅ Hasta 15 vehículos
- ✅ 3 usuarios
- ✅ Rentabilidad por vehículo
- ✅ Client Score
- ✅ Alertas de mantenimiento
- ✅ Reportes en Excel
- ✅ Soporte prioritario
- ✅ Notificaciones por WhatsApp
- ❌ API de integración
- ❌ White-label

### Plan Enterprise
- ✅ Todo lo del Pro
- ✅ Vehículos ilimitados
- ✅ Usuarios ilimitados
- ✅ API de integración
- ✅ Multi-empresa
- ✅ White-label (personalización de marca)
- ✅ Integración con SAT
- ✅ Soporte 24/7
- ✅ SLA garantizado

## Flujo de Upgrade de Plan

1. Usuario va a "Configuración > Suscripción y Planes"
2. Selecciona el plan deseado
3. Click en "Upgrade"
4. Es redirigido a Stripe Checkout
5. Completa el pago
6. Stripe redirige de vuelta a la aplicación
7. El webhook actualiza la suscripción en Firestore
8. El usuario recibe confirmación

## Validación de Límites

### Vehículos
Al intentar crear un nuevo vehículo:
```typescript
if (!canAddVehicle(plan, currentVehicleCount)) {
  toast.error('Límite de vehículos alcanzado', {
    description: getVehicleLimitMessage(plan, currentVehicleCount)
  });
  return;
}
```

### Usuarios
Al intentar crear un nuevo usuario:
```typescript
if (!canAddUser(plan, currentUsersCount)) {
  throw new Error(getUserLimitMessage(plan, currentUsersCount));
}
```

## Feature Flags

Para verificar si una feature está disponible:
```typescript
import { isFeatureEnabled } from '@/config/feature-flags';

// En un componente
const canAccessProfitability = isFeatureEnabled(currentPlan, 'profitability');

if (!canAccessProfitability) {
  // Mostrar mensaje de upgrade o deshabilitar feature
}
```

## Soporte y Contacto

El menú lateral ahora incluye:
- **Suscripción y Planes**: Gestión de suscripción
- **Preguntas Frecuentes**: FAQ con 28 preguntas
- **Contactar Soporte**: Abre cliente de email a `soporte@fleetease.mx`

## Próximos Pasos (Opcional)

1. **Webhook Handler**: Implementar endpoint para recibir webhooks de Stripe
2. **Trial Period**: Configurar período de prueba de 14 días
3. **Discount Codes**: Habilitar códigos de promoción en Stripe
4. **Invoice Billing**: Habilitar facturación automática
5. **Dunning Management**: Gestión de pagos fallidos
6. **Analytics Dashboard**: Métricas de MRR, churn, etc.

## Notas Importantes

1. **Seguridad**: Las validaciones de límites están tanto en cliente como en servidor
2. **Auditoría**: Todos los cambios de plan se registran en `subscriptionChanges`
3. **Flexibilidad**: El sistema de feature flags permite activar/desactivar características fácilmente
4. **UX**: Los usuarios ven claramente qué características tienen disponibles
5. **Stripe Portal**: Los usuarios pueden gestionar su suscripción desde el portal de Stripe

## URLs Importantes

- **Suscripción**: `/dashboard/settings/subscription`
- **FAQ**: `/dashboard/faq`
- **Soporte**: `mailto:soporte@fleetease.mx`
