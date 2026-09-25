# Configuración de Stripe para FleetEase

## Catálogo comercial vigente

Los precios comerciales de FleetEase se administran en `src/config/plans.ts` y los Price IDs de Stripe se configuran exclusivamente del lado servidor.

| Plan | Mensual | Anual | Vehículos | Usuarios |
|---|---:|---:|---:|---:|
| Starter | $299 MXN | $2,990 MXN | 5 | 1 |
| Pro | $699 MXN | $6,990 MXN | 15 | 3 |
| Enterprise | $2,499 MXN | $24,990 MXN | 50 | 10 |

> Enterprise ya no es ilimitado. Para flotillas de más de 50 vehículos o necesidades especiales se debe manejar una cotización empresarial personalizada.

## Variables de entorno

Configura en Vercel Production:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

STRIPE_PRICE_ID_STARTER_MONTHLY=price_...
STRIPE_PRICE_ID_STARTER_YEARLY=price_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=price_...
```

Los Price IDs son variables de servidor y no deben llevar el prefijo `NEXT_PUBLIC_`. El checkout obtiene el Price ID mediante `getStripePriceId()` y nunca crea precios dinámicamente.

## Price IDs de producción confirmados

- Starter mensual: `price_1U8w8ND2V6onxbMN8AxeESFI`
- Starter anual: `price_1U8w9WD2V6onxbMNpXs1CnkX`
- Pro mensual: `price_1U8wAKD2V6onxbMNA42rQKxL`
- Pro anual: `price_1U8wBKD2V6onxbMN9EzoICXJ`
- Enterprise mensual: `price_1U8wCwD2V6onxbMNrtAuUVd0`
- Enterprise anual: `price_1U8wDlD2V6onxbMN7mAIHbJE`

## Webhook de producción

Endpoint:

`https://www.fleetease.com.mx/api/stripe/webhook`

Eventos requeridos:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

El webhook debe usar el Signing Secret de ese endpoint en `STRIPE_WEBHOOK_SECRET`.

## Seguridad y operación

- No expongas `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ni los Price IDs en variables `NEXT_PUBLIC_`.
- Mantén un solo catálogo comercial en `plans.ts`.
- Stripe contiene los productos/precios de cobro; FleetEase contiene las capacidades y límites.
- Los reportes y análisis financieros no deben recalcular por separado los movimientos: deben consumir la fuente financiera centralizada.
- WhatsApp Intelligence, Fleet Intelligence, API/webhooks, multiempresa, white-label, reportes personalizados e integraciones GPS multi-proveedor siguen fuera de las capacidades actuales.

## Prueba local

Usa Stripe CLI para reenviar eventos:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Antes de activar cobros reales, valida un checkout de prueba con cada ciclo y confirma que el webhook actualiza correctamente la suscripción.

**Última actualización:** septiembre de 2026
