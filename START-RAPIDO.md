# ⚡ Inicio Rápido - Testing Local

## 🚀 Comandos para Iniciar

### Terminal 1: Next.js (Frontend)

```bash
cd /home/user/studio
npm run dev
```

**Esperar:** `✓ Ready in Xs` → http://localhost:3000

---

### Terminal 2: Emuladores Firebase

```bash
cd /home/user/studio
firebase emulators:start --only auth,functions,firestore
```

**Esperar:** `✔  All emulators ready!`

---

### Terminal 3: (Opcional) Ver logs

```bash
# Logs de funciones en tiempo real
tail -f /home/user/studio/.firebase/emulators/debug/*.log
```

---

## 🧪 Prueba Rápida (5 minutos)

### 1. Abrir Landing

```
http://localhost:3000
```

- [ ] Verifica que carga la landing page
- [ ] Scroll para ver secciones
- [ ] Click en "Comenzar Gratis" → va a `/registro`

---

### 2. Abrir Registro

```
http://localhost:3000/registro
```

**Datos de prueba:**
```
Empresa: Transportes Rodríguez
Nombre: Juan Pérez
Email: juan@test.com
Teléfono: 55 1234 5678
Contraseña: Test123456
Confirmar: Test123456
```

**Pasos:**
1. Llenar paso 1 → Continuar
2. Llenar paso 2 → Continuar
3. Review paso 3 → Crear Cuenta
4. Verificar redirección a `/dashboard`

---

### 3. Verificar en Emulator UI

**Auth:**
```
http://localhost:4000/auth
```
- [ ] Usuario existe con email `juan@test.com`

**Firestore:**
```
http://localhost:4000/firestore
```
- [ ] Colección `companies` tiene documento "Transportes Rodríguez"
- [ ] Colección `users` tiene documento con UID del usuario
- [ ] Usuario tiene `role: admin` y `companyId: {id}`

**Functions:**
```
http://localhost:4000/functions
```
- [ ] Log de llamada a `createCompanyAndUser`
- [ ] Respuesta exitosa

---

## ✅ Si Todo Funciona

**Resultado esperado:**
- ✅ Usuario creado en Auth
- ✅ Empresa creada en Firestore (plan: starter, maxVehicles: 5)
- ✅ Usuario creado en Firestore (role: admin, companyId: {id})
- ✅ Redirección a `/dashboard` exitosa
- ✅ Dashboard carga sin errores

---

## 🐛 Si Algo Falla

### Error: "Cannot connect to emulator"

**Solución:**
```bash
# Matar procesos existentes
killall node
killall java

# Reiniciar emuladores
firebase emulators:start --only auth,functions,firestore
```

### Error: "Function not found: createCompanyAndUser"

**Solución:**
```bash
# Rebuild de functions
cd /home/user/studio/functions
npm run build

# Reiniciar emuladores
cd /home/user/studio
firebase emulators:start --only auth,functions,firestore
```

### Error: "CORS policy"

**Solución:**
```bash
# Verificar .env.local
cat .env.local

# Debe tener:
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

---

## 📊 URLs Importantes

| Servicio | URL |
|----------|-----|
| Landing Page | http://localhost:3000 |
| Registro | http://localhost:3000/registro |
| Dashboard | http://localhost:3000/dashboard |
| Login | http://localhost:3000/login |
| Emulator UI | http://localhost:4000 |
| Auth Emulator | http://localhost:4000/auth |
| Firestore Emulator | http://localhost:4000/firestore |
| Functions Emulator | http://localhost:4000/functions |

---

## 🎯 Checklist de Verificación

### Frontend (Next.js)

- [ ] Landing page carga en < 3s
- [ ] Registro page carga en < 2s
- [ ] Animaciones son suaves (60fps)
- [ ] Formulario validaciones funcionan
- [ ] Redirección funciona

### Backend (Firebase Emulators)

- [ ] Auth emulator está corriendo
- [ ] Functions emulator está corriendo
- [ ] Firestore emulator está corriendo
- [ ] Función `createCompanyAndUser` responde
- [ ] Datos se guardan en Firestore

### Integración

- [ ] Frontend se conecta a emuladores
- [ ] Registro crea empresa y usuario
- [ ] Custom claims se establecen
- [ ] Dashboard accede sin errores de permisos

---

## 📝 Notas

**Puertos usados:**
- Next.js: 3000
- Emulator UI: 4000
- Auth: 9150
- Functions: 5001
- Firestore: 8080

**Variables de entorno requeridas:**
```bash
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

**Tiempo estimado de inicio:**
- Next.js: 3-5 segundos
- Emuladores: 10-15 segundos

---

**Fecha:** 2026-03-18
**Estado:** Listo para testing
**Versión:** 1.0.0
