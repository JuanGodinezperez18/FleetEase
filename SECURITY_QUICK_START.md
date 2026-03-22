# 🚨 ROTACIÓN DE CREDENCIALES - ACCIÓN INMEDIATA

## ⚡ RESUMEN EJECUTIVO

✅ **Archivos sensibles removidos del repositorio** (commit `3831fb46d`)
❌ **Credenciales DEBEN rotarse AHORA** - Están expuestas en historial de git
⏱️ **Tiempo estimado**: 30-45 minutos

---

## 🎯 PASOS RÁPIDOS (30 minutos)

### 1️⃣ Firebase Admin SDK (10 min) - CRÍTICO

```bash
# 1. Ve a: https://console.firebase.google.com/project/fleetease-manager/settings/serviceaccounts/adminsdk
# 2. Click "Generate new private key" → Descargar
# 3. Guardar como .serviceAccount.json en la raíz del proyecto
# 4. En la misma página, elimina la clave antigua
# 5. Actualiza en producción (Vercel/Firebase)
```

### 2️⃣ Google Maps API (10 min) - CRÍTICO

```bash
# 1. Ve a: https://console.cloud.google.com/apis/credentials?project=fleetease-manager
# 2. "+ CREATE CREDENTIALS" → "API key"
# 3. Copia la nueva key
# 4. Click en la nueva key → "Edit API key"
# 5. Application restrictions: "HTTP referrers"
#    - https://tudominio.com/*
#    - http://localhost:3000/*
# 6. API restrictions: "Maps JavaScript API", "Geocoding API"
# 7. Actualiza .env.local:
#    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...NUEVA_KEY
# 8. Elimina la key antigua (espera 5 min primero)
```

### 3️⃣ Gemini AI API (5 min) - ALTO

```bash
# 1. Ve a: https://aistudio.google.com/app/apikey
# 2. Revoca la key antigua
# 3. "Create API key" → Copia
# 4. Actualiza .env.local:
#    GEMINI_API_KEY=AIza...NUEVA_KEY
#    GOOGLE_AI_KEY=AIza...NUEVA_KEY
```

### 4️⃣ Twilio (5 min) - ALTO

```bash
# 1. Ve a: https://console.twilio.com/
# 2. Account → Settings → API Credentials
# 3. "Create new Auth Token" → Copia
# 4. Actualiza .env.local:
#    TWILIO_AUTH_TOKEN=...NUEVO_TOKEN
# 5. Después de 24h, elimina el token antiguo
```

### 5️⃣ VAPID Keys (5 min) - MEDIO

```bash
npx web-push generate-vapid-keys

# Actualiza .env.local con las nuevas keys
```

---

## 🔍 VERIFICACIÓN RÁPIDA

```bash
# Prueba que la app funcione
npm run dev

# Verifica:
- [ ] Login funciona (Firebase Auth)
- [ ] Mapa carga (Google Maps)
- [ ] Puedes crear/editar datos (Firebase Admin)
- [ ] Mensajes se envían (Twilio)
```

---

## ⚠️ IMPORTANTE

**Los archivos .env y .env.local AÚN EXISTEN LOCALMENTE**
- Esto es correcto - solo se removieron de git
- La aplicación seguirá funcionando mientras rotas
- NO los commitees de nuevo

**Actualizar en producción**:
```bash
# Vercel
vercel env add VARIABLE_NAME production

# Firebase
firebase functions:secrets:set VARIABLE_NAME
```

---

## 📄 Documentación Completa

Ver `SECURITY_CREDENTIAL_ROTATION.md` para instrucciones detalladas.

---

**SIGUIENTE PASO**: Empieza con Firebase Admin SDK ↑
