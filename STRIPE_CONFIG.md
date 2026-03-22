# Configuración de Stripe para FleetEase Manager

## 🎯 Resumen

Este documento te guiará para configurar Stripe y poder desplegar las Cloud Functions.

---

## 📋 Paso 1: Obtener API Keys de Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navega a **Developers** → **API keys**
3. Copia las siguientes claves:

   - **Publishable key** (empieza con `pk_test_` o `pk_live_`)
   - **Secret key** (empieza con `sk_test_` o `sk_live_`)

---

## 📦 Paso 2: Crear Productos y Precios en Stripe

1. Ve a **Products** en Stripe Dashboard
2. Crea 3 productos (uno por cada plan):

### Plan Starter
- **Nombre**: Starter
- **Precio**: $9/mes (o el precio que definiste)
- **Tipo**: Recurring (monthly)
- **Copia el Price ID**: `price_...` (lo ves después de crear el producto)

### Plan Pro
- **Nombre**: Pro
- **Precio**: $29/mes
- **Tipo**: Recurring (monthly)
- **Copia el Price ID**: `price_...`

### Plan Enterprise
- **Nombre**: Enterprise
- **Precio**: $99/mes
- **Tipo**: Recurring (monthly)
- **Copia el Price ID**: `price_...`

---

## 🔐 Paso 3: Configurar Variables de Entorno Locales

Crea o actualiza el archivo `.env.local` en la raíz del proyecto:

```bash
# STRIPE (PAGOS Y SUSCRIPCIONES)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica
NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER=price_starter_id
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_pro_id
NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE=price_enterprise_id
```

---

## ☁️ Paso 4: Configurar Secrets de Firebase Cloud Functions

Una vez habilitado el billing en Firebase, ejecuta estos comandos:

```bash
# Secret key de Stripe
firebase functions:secrets:set STRIPE_SECRET_KEY
# (Pega tu sk_test_... cuando te lo pida)

# Webhook secret (opcional, para producción)
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# URL de la aplicación
firebase functions:secrets:set APP_URL
# (Pega https://fleetease-manager.web.app)

# Price IDs
firebase functions:secrets:set STRIPE_PRICE_ID_STARTER
firebase functions:secrets:set STRIPE_PRICE_ID_PRO
firebase functions:secrets:set STRIPE_PRICE_ID_ENTERPRISE
```

---

## 🚀 Paso 5: Habilitar Billing en Firebase

1. Ve a [Google Cloud Console Billing](https://console.developers.google.com/billing/enable?project=fleetease-manager)
2. Agrega una tarjeta de crédito
3. Espera unos minutos a que se propague

> 💡 **Nota**: Firebase tiene un free tier generoso. No te cobrarán a menos que excedas los límites gratuitos.

---

## 📤 Paso 6: Desplegar Cloud Functions

Una vez habilitado el billing:

```bash
# Desplegar todas las funciones
firebase deploy --only functions

# O solo la función de registro
firebase deploy --only functions:createCompanyAndUser
```

---

## 🪝 Paso 7: Configurar Webhook de Stripe (Producción)

1. Ve a **Developers** → **Webhooks** en Stripe
2. Click en **Add endpoint**
3. Configura:
   - **Endpoint URL**: `https://us-central1-fleetease-manager.cloudfunctions.net/checkout`
   - **Events to send**: 
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Copia el **Signing secret** (`whsec_...`)
5. Actualiza el secret:
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```

---

## ✅ Verificación

Después de configurar todo, verifica que las funciones estén desplegadas:

```bash
firebase functions:list
```

Deberías ver `createCompanyAndUser` en la lista.

---

## 🧪 Testing Local

Para testing sin desplegar:

```bash
# Iniciar emuladores
firebase emulators:start

# En otra terminal, prueba el registro
# Ve a http://localhost:3000/registro
```

---

## 🆘 Soporte

Si tienes problemas:

1. Verifica que las claves de Stripe sean correctas
2. Asegúrate de que los Price IDs correspondan a productos recurrentes
3. Revisa los logs: `firebase functions:log`

---

## 📊 Resumen de Variables Necesarias

| Variable | Tipo | Dónde se usa |
|----------|------|--------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `.env.local` | Frontend |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER` | `.env.local` | Frontend |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` | `.env.local` | Frontend |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE` | `.env.local` | Frontend |
| `STRIPE_SECRET_KEY` | Firebase Secret | Cloud Functions |
| `STRIPE_WEBHOOK_SECRET` | Firebase Secret | Cloud Functions (webhooks) |
| `APP_URL` | Firebase Secret | Cloud Functions |
| `STRIPE_PRICE_ID_STARTER` | Firebase Secret | Cloud Functions |
| `STRIPE_PRICE_ID_PRO` | Firebase Secret | Cloud Functions |
| `STRIPE_PRICE_ID_ENTERPRISE` | Firebase Secret | Cloud Functions |

---

**Última actualización**: Marzo 2026
