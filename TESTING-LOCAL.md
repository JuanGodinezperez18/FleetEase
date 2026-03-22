# 🧪 Guía de Testing Local - Registro SaaS

## 🚀 Inicio del Entorno Local

### 1. Iniciar Next.js (Desarrollo)

```bash
cd /home/user/studio
npm run dev
```

**Esperar a que veas:**
```
✓ Ready in 3.2s
○ http://localhost:3000
```

---

### 2. Iniciar Emuladores de Firebase

En otra terminal:

```bash
cd /home/user/studio
firebase emulators:start --only auth,functions,firestore
```

**Esperar a que veas:**
```
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app │
└─────────────────────────────────────────────────────────────┘

┌───────────┬────────────────┬─────────────────────────────────┐
│ Emulator  │ Host:Port      │ View in Emulator UI            │
├───────────┼────────────────┼─────────────────────────────────┤
│ Auth      │ localhost:9150 │ http://localhost:4000/auth     │
│ Functions │ localhost:5001 │ http://localhost:4000/functions│
│ Firestore │ localhost:8080 │ http://localhost:4000/firestore│
└───────────┴────────────────┴─────────────────────────────────┘
```

---

### 3. Configurar Variables de Entorno

Crear `.env.local` si no existe:

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=localhost:9150
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

**Importante:** El frontend debe estar configurado para usar emuladores.

---

## 🧪 Pruebas a Realizar

### Test 1: Landing Page

**URL:** http://localhost:3000

**Qué verificar:**
- [ ] Hero section carga correctamente
- [ ] Animaciones son suaves
- [ ] Links de navegación funcionan
- [ ] Botón "Comenzar Gratis" lleva a `/registro`
- [ ] Responsive en móvil

---

### Test 2: Página de Registro

**URL:** http://localhost:3000/registro

**Paso 1: Información Básica**
- [ ] Formulario muestra 3 inputs
- [ ] Input "Nombre de tu Empresa" funciona
- [ ] Input "Tu Nombre Completo" funciona
- [ ] Input "Correo Electrónico" funciona
- [ ] Botón "Continuar" está disabled si faltan campos
- [ ] Click en "Continuar" avanza al paso 2

**Paso 2: Contacto y Acceso**
- [ ] Input "Teléfono" funciona
- [ ] Input "Contraseña" funciona
- [ ] Input "Confirmar Contraseña" funciona
- [ ] Validación de contraseñas que no coinciden
- [ ] Validación de contraseña < 6 caracteres
- [ ] Botón "Atrás" regresa al paso 1
- [ ] Botón "Continuar" avanza al paso 3

**Paso 3: Confirmación**
- [ ] Muestra resumen de todos los datos
- [ ] Muestra plan "Starter" incluido
- [ ] Botón "Atrás" regresa al paso 2
- [ ] Botón "Crear Cuenta" ejecuta el registro

---

### Test 3: Registro Completo (E2E)

**Datos de prueba:**
```
Empresa: Transportes Rodríguez
Nombre: Juan Pérez
Email: juan@test.com
Teléfono: 55 1234 5678
Contraseña: Test123456
```

**Pasos:**

1. **Llenar formulario completo**
   ```
   Paso 1: Transportes Rodríguez, Juan Pérez, juan@test.com
   Paso 2: 55 1234 5678, Test123456, Test123456
   Paso 3: Review y click en "Crear Cuenta"
   ```

2. **Verificar en Emulator UI**

   **Auth:**
   - Abrir: http://localhost:4000/auth
   - Verificar que usuario existe
   - UID debe coincidir con el del toast

   **Firestore:**
   - Abrir: http://localhost:4000/firestore
   - Verificar colección `companies`
     - Documento creado con nombre "Transportes Rodríguez"
     - Plan: starter
     - maxVehicles: 5
   - Verificar colección `users`
     - Documento con UID del usuario
     - Role: admin
     - CompanyId: ID de la empresa creada

   **Functions:**
   - Abrir: http://localhost:4000/functions
   - Verificar log de llamada a `createCompanyAndUser`
   - Verificar respuesta exitosa

3. **Verificar redirección**
   - [ ] Redirige a `/dashboard`
   - [ ] Toast de éxito aparece
   - [ ] Dashboard carga sin errores

---

### Test 4: Errores y Validaciones

**Email duplicado:**
```
1. Registrar usuario con juan@test.com
2. Intentar registrar otro usuario con mismo email
3. Verificar error: "Este correo ya está registrado"
```

**Contraseñas diferentes:**
```
1. Paso 2: Contraseña = "Test123", Confirmar = "Test456"
2. Click en "Continuar"
3. Verificar error: "Las contraseñas no coinciden"
```

**Contraseña débil:**
```
1. Paso 2: Contraseña = "123"
2. Click en "Continuar"
3. Verificar error: "La contraseña debe tener al menos 6 caracteres"
```

**Campos vacíos:**
```
1. Dejar campos vacíos en cada paso
2. Verificar que botón "Continuar" está disabled
```

---

## 🔍 Verificación de Datos

### En Firestore Emulator

**Empresa creada:**
```typescript
companies/{companyId}
{
  id: "abc123",
  name: "Transportes Rodríguez",
  status: "active",
  plan: "starter",
  maxVehicles: 5,
  maxUsers: 1,
  createdAt: "2026-03-18T...",
  updatedAt: "2026-03-18T..."
}
```

**Usuario creado:**
```typescript
users/{uid}
{
  uid: "firebase-uid-xyz",
  email: "juan@test.com",
  name: "Juan Pérez",
  phone: "55 1234 5678",
  role: "admin",
  companyId: "abc123",
  partnerAccess: [],
  isDeleted: false,
  createdAt: "2026-03-18T..."
}
```

---

## 🐛 Debugging

### Logs del Frontend

Abrir DevTools (F12) → Console

**Qué buscar:**
```
[Auth] Iniciando login...
✅ Usuario admin creado: {uid}
✅ Claims establecidos
```

### Logs de la Cloud Function

En la terminal de emuladores:

```
> call to createCompanyAndUser()
✅ Empresa creada: abc123 para Transportes Rodríguez
✅ Usuario admin creado: firebase-uid-xyz
✅ Claims establecidos para firebase-uid-xyz
```

### Errores Comunes

**Error: "Firebase Emulator not connected"**
```
Solución: Verificar que emuladores estén corriendo
Verificar: NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

**Error: "Function not found"**
```
Solución: Reiniciar emuladores
Comando: firebase emulators:start --only auth,functions,firestore
```

**Error: "CORS policy"**
```
Solución: Verificar que frontend y emuladores estén en puertos correctos
Frontend: localhost:3000
Auth Emulator: localhost:9150
Functions: localhost:5001
```

---

## ✅ Checklist Final

### Funcionalidad Básica

- [ ] Landing page carga correctamente
- [ ] Página de registro carga correctamente
- [ ] Formulario multi-step funciona (3 pasos)
- [ ] Validaciones de formulario funcionan
- [ ] Botones de navegación entre steps funcionan
- [ ] Resumen final muestra datos correctos

### Registro Exitoso

- [ ] Usuario se crea en Firebase Auth
- [ ] Empresa se crea en Firestore
- [ ] Usuario se crea en Firestore
- [ ] Custom claims se establecen
- [ ] Redirección a dashboard funciona
- [ ] Toast de éxito aparece

### Manejo de Errores

- [ ] Email duplicado muestra error claro
- [ ] Contraseñas diferentes muestran error
- [ ] Contraseña débil muestra error
- [ ] Campos vacíos previenen avance
- [ ] Errores de red se manejan correctamente

### UX/UI

- [ ] Animaciones son suaves (60fps)
- [ ] Loading states son claros
- [ ] Errores son visibles y comprensibles
- [ ] Responsive funciona en móvil
- [ ] Dark mode funciona correctamente

---

## 📊 Métricas de Testing

### Tiempo de Registro

**Objetivo:** < 2 minutos

**Cómo medir:**
1. Iniciar cronómetro al abrir `/registro`
2. Detener cuando llegue a `/dashboard`
3. Registrar tiempo

### Tasa de Éxito

**Objetivo:** 100% en entorno local

**Cómo medir:**
```
(Registros exitosos / Intentos totales) * 100
```

---

## 🎯 Criterios de Aceptación

El registro se considera **completado exitosamente** cuando:

1. ✅ Usuario puede completar los 3 steps sin errores
2. ✅ Empresa se crea en Firestore con plan "starter"
3. ✅ Usuario se crea en Firestore con rol "admin"
4. ✅ Usuario es redirigido a `/dashboard`
5. ✅ Toast de éxito se muestra
6. ✅ Usuario puede acceder al dashboard sin errores de permisos

---

## 🚀 Comandos Útiles

### Reiniciar emuladores
```bash
firebase emulators:start --only auth,functions,firestore
```

### Ver logs de funciones
```bash
firebase functions:log
```

### Exportar datos de emuladores
```bash
firebase emulators:export ./emulator-data
```

### Importar datos de emuladores
```bash
firebase emulators:start --import=./emulator-data
```

---

## 📝 Reporte de Bugs

Si encuentras un bug, reporta en este formato:

```markdown
**Bug:** [Descripción breve]

**Pasos para reproducir:**
1. Ir a /registro
2. Llenar formulario con [datos]
3. Click en [botón]
4. Ver [error]

**Comportamiento esperado:**
[Qué debería pasar]

**Comportamiento actual:**
[Qué pasa realmente]

**Screenshots:**
[Si aplica]

**Environment:**
- Browser: Chrome 122
- OS: macOS 14.3
- Emulators: auth, functions, firestore
```

---

**Fecha:** 2026-03-18
**Estado:** Listo para testing
**Versión:** 1.0.0
