# ✅ Checklist: Habilitar Deploy de Cloud Functions

## 📋 Pendientes

### 1. Habilitar Billing en Firebase
- [ ] Ir a https://console.developers.google.com/billing/enable?project=fleetease-manager
- [ ] Agregar tarjeta de crédito
- [ ] Esperar 2-3 minutos para que se propague

### 2. Obtener Claves de Stripe
- [ ] Ir a https://dashboard.stripe.com/apikeys
- [ ] Copiar `Publishable key` (pk_test_...)
- [ ] Copiar `Secret key` (sk_test_...)

### 3. Crear Productos en Stripe
- [ ] Crear producto "Starter" con precio recurrente mensual
- [ ] Crear producto "Pro" con precio recurrente mensual
- [ ] Crear producto "Enterprise" con precio recurrente mensual
- [ ] Copiar los 3 Price IDs (price_...)

### 4. Configurar Variables Locales
- [ ] Crear/actualizar `.env.local` con:
  ```bash
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER=price_...
  NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_...
  NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE=price_...
  ```

### 5. Configurar Secrets en Firebase
- [ ] Ejecutar: `./scripts/setup-stripe-secrets.sh`
- [ ] O ejecutar manualmente:
  ```bash
  firebase functions:secrets:set STRIPE_SECRET_KEY
  firebase functions:secrets:set APP_URL
  firebase functions:secrets:set STRIPE_PRICE_ID_STARTER
  firebase functions:secrets:set STRIPE_PRICE_ID_PRO
  firebase functions:secrets:set STRIPE_PRICE_ID_ENTERPRISE
  ```

### 6. Desplegar Funciones
- [ ] Ejecutar: `firebase deploy --only functions:createCompanyAndUser`
- [ ] Verificar: `firebase functions:list`

### 7. Testear Registro
- [ ] Ir a `/registro`
- [ ] Completar formulario con datos de prueba
- [ ] Verificar que se crea la empresa y usuario

---

## 🎯 Una vez completado

El flujo de registro debería funcionar así:
1. Usuario llena formulario en `/registro`
2. Se llama a `createCompanyAndUser` (Cloud Function)
3. Se crea la empresa en Firestore
4. Se asigna el usuario a la empresa
5. Se redirige al dashboard

---

## 📞 Soporte

Si hay errores:
1. Revisar logs: `firebase functions:log`
2. Verificar secrets: `firebase functions:secrets:access STRIPE_SECRET_KEY`
3. Revisar CSP en navegador (F12 → Console)

---

**Fecha de creación**: Marzo 2026
