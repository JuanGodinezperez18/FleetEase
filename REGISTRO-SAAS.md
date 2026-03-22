# 📋 Proceso de Registro SaaS - FleetEase

## 🎯 Flujo de Registro Automático

Cuando un usuario se registra desde la landing page, el sistema crea automáticamente:

1. ✅ **Empresa** (Company)
2. ✅ **Usuario Admin** asignado a esa empresa

---

## 🔄 Flujo Completo

### Paso 1: Usuario llena formulario en `/registro`

```typescript
{
  name: "Juan Pérez",
  email: "juan@transportesrodriguez.com",
  phone: "55 1234 5678",
  password: "******",
  companyName: "Transportes Rodríguez"
}
```

### Paso 2: Sistema ejecuta `createCompanyAndUser` (Cloud Function)

**Lo que hace la función:**

1. **Crea documento en `companies/`**
   ```typescript
   {
     id: "auto-generated-id",
     name: "Transportes Rodríguez",
     status: "active",
     plan: "starter",
     maxVehicles: 5,
     maxUsers: 1,
     createdAt: "2026-03-18T...",
     updatedAt: "2026-03-18T..."
   }
   ```

2. **Crea documento en `users/{uid}`**
   ```typescript
   {
     uid: "firebase-auth-uid",
     email: "juan@transportesrodriguez.com",
     name: "Juan Pérez",
     phone: "55 1234 5678",
     role: "admin",
     companyId: "auto-generated-id",
     partnerAccess: [],
     isDeleted: false,
     createdAt: "2026-03-18T..."
   }
   ```

3. **Establece Custom Claims en Firebase Auth**
   ```typescript
   {
     role: "admin",
     companyId: "auto-generated-id",
     partnerAccess: []
   }
   ```

4. **Retorna éxito al cliente**
   ```typescript
   {
     success: true,
     companyId: "auto-generated-id",
     companyName: "Transportes Rodríguez",
     plan: "starter"
   }
   ```

### Paso 3: Frontend redirige a `/dashboard`

El usuario ya puede:
- ✅ Ver el dashboard de su empresa
- ✅ Cargar vehículos
- ✅ Registrar clientes
- ✅ Crear ingresos/gastos
- ✅ Invitar más usuarios (si upgrade de plan)

---

## 🔧 Función Cloud: `createCompanyAndUser`

**Archivo:** `functions/src/index.ts`

```typescript
export const createCompanyAndUser = onCall(async (request) => {
  // 1. Validar autenticación
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  // 2. Extraer datos del request
  const { email, name, phone, companyName } = request.data;

  // 3. Crear empresa
  const companyRef = db.collection('companies').doc();
  await companyRef.set({
    id: companyRef.id,
    name: companyName,
    status: 'active',
    plan: 'starter',
    maxVehicles: 5,
    maxUsers: 1,
    // ... timestamps
  });

  // 4. Crear usuario admin
  const userData = {
    uid: request.auth.uid,
    email,
    name,
    phone,
    role: 'admin',
    companyId: companyRef.id,
    // ... más campos
  };
  await db.collection('users').doc(request.auth.uid).set(userData);

  // 5. Establecer custom claims
  await admin.auth().setCustomUserClaims(request.auth.uid, {
    role: 'admin',
    companyId: companyRef.id,
    partnerAccess: []
  });

  // 6. Retornar éxito
  return {
    success: true,
    companyId: companyRef.id,
    companyName,
    plan: 'starter'
  };
});
```

---

## 🛡️ Manejo de Errores

### Error: Email ya registrado

```typescript
if (error.code === 'auth/email-already-in-use') {
  toast.error('Este correo ya está registrado. Inicia sesión o usa otro correo.');
}
```

### Error: Fallo en creación de datos

```typescript
try {
  // Crear empresa y usuario...
} catch (error) {
  // Cleanup: eliminar usuario de auth si falla la creación de datos
  await admin.auth().deleteUser(userId);
  throw new HttpsError('internal', 'Error al crear la cuenta');
}
```

---

## 📊 Planes por Defecto

### Plan Starter (Gratis)

```typescript
{
  plan: 'starter',
  maxVehicles: 5,
  maxUsers: 1,
  features: [
    'Gestión básica de vehículos',
    'Gestión básica de clientes',
    'Registro de ingresos/gastos',
    'Dashboard simple',
    'Soporte por email'
  ],
  satIntegration: false,
  aiRecommendations: false
}
```

### Plan Pro ($999/mes)

```typescript
{
  plan: 'pro',
  maxVehicles: 20,
  maxUsers: 5,
  features: [
    'Todo lo del Starter',
    'Rentabilidad por vehículo',
    'Integración SAT',
    'Alertas inteligentes',
    'Soporte prioritario'
  ],
  satIntegration: true,
  aiRecommendations: false
}
```

### Plan Enterprise ($1,999/mes)

```typescript
{
  plan: 'enterprise',
  maxVehicles: 50,
  maxUsers: 20,
  features: [
    'Todo lo del Pro',
    'IA de recomendaciones',
    'API access',
    'Soporte 24/7',
    'Customizaciones'
  ],
  satIntegration: true,
  aiRecommendations: true
}
```

---

## 🎯 Beneficios de este Enfoque

### Para el Usuario

1. ✅ **Setup en < 2 minutos** - No necesita configurar nada manualmente
2. ✅ **Sin fricción** - No necesita entender conceptos técnicos
3. ✅ **Listo para usar** - Inmediatamente puede cargar datos
4. ✅ **Sin tarjeta** - Comienza gratis sin compromiso

### Para Nosotros (Negocio)

1. ✅ **Automatización total** - No requiere intervención manual
2. ✅ **Escalabilidad** - Puede crecer a miles de usuarios sin overhead
3. ✅ **Datos estructurados** - Cada usuario tiene su empresa desde el inicio
4. ✅ **Upsell automático** - Límites claros por plan facilitan upgrade

---

## 🔐 Seguridad

### Custom Claims

Los custom claims se establecen inmediatamente después de crear el usuario:

```typescript
{
  role: 'admin',
  companyId: 'company-id',
  partnerAccess: []
}
```

**Beneficios:**
- ✅ Reglas de seguridad de Firestore pueden verificar `request.auth.token.role`
- ✅ Cada usuario solo puede acceder a datos de su empresa
- ✅ No requiere consultas adicionales para verificar permisos

### Reglas de Seguridad

```javascript
// firestore.rules
match /companies/{companyId} {
  allow read: if request.auth.token.companyId == companyId;
  allow write: if request.auth.token.role == 'admin' && 
                  request.auth.token.companyId == companyId;
}
```

---

## 📈 Métricas de Registro

### KPIs a Monitorear

1. **Tasa de Conversión**
   ```
   (Registros completados / Visitas a /registro) * 100
   Objetivo: > 30%
   ```

2. **Tiempo de Registro**
   ```
   Tiempo promedio desde que abre /registro hasta que llega a /dashboard
   Objetivo: < 2 minutos
   ```

3. **Activación**
   ```
   (Usuarios que crean primer vehículo en 24h / Total registros) * 100
   Objetivo: > 60%
   ```

4. **Retención Día 7**
   ```
   (Usuarios activos día 7 / Total registros) * 100
   Objetivo: > 40%
   ```

---

## 🚀 Deploy de la Función

Para desplegar la función `createCompanyAndUser`:

```bash
cd /home/user/studio
firebase deploy --only functions:createCompanyAndUser
```

**Nota:** Requiere tener billing habilitado en Firebase.

---

## 🧪 Testing Local

### Con Emuladores

```bash
# Iniciar emuladores
firebase emulators:start

# En otra terminal, trigger manual de la función
curl -X POST http://localhost:5001/fleetease-manager/us-central1/createCompanyAndUser \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "name": "Test User",
    "phone": "5555555555",
    "companyName": "Test Company"
  }'
```

---

## ✅ Checklist de Registro

- [ ] Usuario llena formulario (4 campos obligatorios)
- [ ] Validación de email (formato válido)
- [ ] Validación de contraseña (mínimo 6 caracteres)
- [ ] Validación de confirmación de contraseña (coincide)
- [ ] Crear usuario en Firebase Auth
- [ ] Llamar a Cloud Function `createCompanyAndUser`
- [ ] Crear documento en `companies/`
- [ ] Crear documento en `users/{uid}`
- [ ] Establecer custom claims
- [ ] Redirigir a `/dashboard`
- [ ] Mostrar toast de éxito
- [ ] Si falla, hacer cleanup (eliminar usuario de auth)

---

**Fecha:** 2026-03-18
**Estado:** ✅ Implementado
**Próximo:** Agregar email de bienvenida automático
