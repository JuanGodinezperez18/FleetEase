# 🔒 ROTACIÓN DE CREDENCIALES - ACCIÓN INMEDIATA REQUERIDA

**Fecha de exposición detectada**: 2025-11-26
**Archivos expuestos en git**: `.env`, `.env.local`, `.serviceAccount.json`
**Commits con exposición**: Desde `cccb96a81` (Oct 2024) hasta `979396c58` (Nov 2024)

---

## ⚠️ ESTADO ACTUAL

✅ **Archivos removidos del repositorio** (commit `3831fb46d`)
❌ **Credenciales AÚN ACTIVAS** - Deben rotarse INMEDIATAMENTE
❌ **Historial de git contiene las credenciales** - Considerar limpiar historial

---

## 📋 CHECKLIST DE ROTACIÓN

### 🔴 PRIORIDAD CRÍTICA (Hacer AHORA)

#### 1. Firebase Admin SDK (serviceAccount.json)

**Riesgo**: Acceso completo a Firestore, Storage, Auth, Cloud Functions

**Pasos para rotar**:

1. **Ve a Firebase Console**
   - URL: https://console.firebase.google.com/project/fleetease-manager/settings/serviceaccounts/adminsdk

2. **Genera nueva clave privada**
   - Click en "Generate new private key"
   - Descarga el archivo JSON
   - Guárdalo como `.serviceAccount.json` (LOCAL, NO COMMITEAR)

3. **Elimina la clave antigua**
   - En la misma página, encuentra la clave expuesta
   - Email: `firebase-adminsdk-xxxxx@fleetease-manager.iam.gserviceaccount.com`
   - Click en "..." → "Delete"
   - Confirma la eliminación

4. **Actualiza variables de entorno**
   ```bash
   # En .env.local (NO COMMITEAR)
   APP_PROJECT_ID=fleetease-manager
   APP_CLIENT_EMAIL=firebase-adminsdk-NEW@fleetease-manager.iam.gserviceaccount.com
   APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[NUEVA CLAVE]\n-----END PRIVATE KEY-----\n"
   ```

5. **Verifica en producción** (Vercel/Firebase Hosting)
   - Ve a tu plataforma de deployment
   - Actualiza las variables de entorno
   - Redeploy la aplicación

**Verificación**:
```bash
# Prueba que la nueva clave funciona
npm run dev
# Intenta crear un documento en Firestore desde la app
```

---

#### 2. Google Maps API Key

**Riesgo**: Uso no autorizado, cargos fraudulentos en tu cuenta de Google Cloud

**Pasos para rotar**:

1. **Ve a Google Cloud Console**
   - URL: https://console.cloud.google.com/apis/credentials?project=fleetease-manager

2. **Encuentra la API key expuesta**
   - Busca en la lista de credenciales
   - Probablemente se llama "Browser key" o "Maps JavaScript API key"

3. **Crea nueva API key**
   - Click en "+ CREATE CREDENTIALS" → "API key"
   - Copia la nueva key inmediatamente

4. **Configura restricciones** (IMPORTANTE)
   ```
   Application restrictions:
   ☑ HTTP referrers (web sites)

   Website restrictions:
   - https://tudominio.com/*
   - https://tudominio.vercel.app/*
   - http://localhost:3000/* (solo para desarrollo)

   API restrictions:
   ☑ Restrict key
   - Maps JavaScript API
   - Geocoding API
   - Places API
   ```

5. **Elimina la key antigua**
   - Selecciona la key expuesta
   - Click en "DELETE"
   - Espera 5 minutos antes de eliminar (por si hay problemas)

6. **Actualiza en tu código**
   ```bash
   # .env.local
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...NEW_KEY
   ```

**Verificación**:
```bash
# Verifica que el mapa cargue en la aplicación
# Ve a cualquier página que use Google Maps
```

---

#### 3. Gemini / Google AI API Key

**Riesgo**: Uso no autorizado, costos excesivos

**Pasos para rotar**:

1. **Ve a Google AI Studio**
   - URL: https://aistudio.google.com/app/apikey

2. **Revoca la key antigua**
   - Encuentra la key expuesta en la lista
   - Click en "Revoke" o icono de basura

3. **Crea nueva API key**
   - Click en "Create API key"
   - Selecciona tu proyecto (fleetease-manager)
   - Copia la nueva key

4. **Actualiza variables**
   ```bash
   # .env.local
   GEMINI_API_KEY=AIza...NEW_KEY
   GOOGLE_AI_KEY=AIza...NEW_KEY  # Probablemente la misma
   ```

**Verificación**:
```bash
# Prueba cualquier feature que use Gemini AI
```

---

#### 4. Twilio Credentials

**Riesgo**: Envío de mensajes no autorizados, costos SMS/WhatsApp

**Pasos para rotar**:

1. **Ve a Twilio Console**
   - URL: https://console.twilio.com/

2. **Genera nuevo Auth Token**
   - Ve a Account → Settings → API Credentials
   - Scroll hasta "Auth Tokens"
   - Click en "Create new Auth Token"
   - Copia el nuevo token (solo se muestra una vez)

3. **Actualiza variables**
   ```bash
   # .env.local
   TWILIO_ACCOUNT_SID=AC...  # Este NO cambia
   TWILIO_AUTH_TOKEN=...NEW_TOKEN
   ```

4. **Invalida el token antiguo** (después de verificar)
   - Espera 24 horas para asegurar que todo funciona
   - Luego elimina el token antiguo desde la consola

**Verificación**:
```bash
# Envía un mensaje de prueba desde la aplicación
```

---

### 🟠 PRIORIDAD ALTA (Hacer hoy)

#### 5. VAPID Keys (Web Push Notifications)

**Riesgo**: Envío de notificaciones push no autorizadas

**Pasos para rotar**:

1. **Genera nuevas VAPID keys**
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Actualiza variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...NEW_PUBLIC
   VAPID_PRIVATE_KEY=...NEW_PRIVATE
   ```

3. **Re-subscribir usuarios**
   - Los usuarios existentes necesitarán re-autorizar notificaciones
   - Considera mostrar un mensaje en la app

**Verificación**:
```bash
# Envía una notificación push de prueba
```

---

#### 6. Firebase Client Credentials

**Riesgo**: BAJO (son públicas por diseño, pero deben tener restricciones)

**Pasos de seguridad**:

1. **Ve a Firebase Console**
   - URL: https://console.firebase.google.com/project/fleetease-manager/settings/general

2. **Verifica restricciones de API Key**
   - En "Your apps" → Web app
   - Click en el ícono de configuración
   - Verifica que el "API key" tenga restricciones

3. **Configura restricciones en Google Cloud**
   - Ve a Google Cloud Console → APIs & Services → Credentials
   - Encuentra "Browser key (auto created by Firebase)"
   - Configura HTTP referrers:
     ```
     - https://tudominio.com/*
     - https://tudominio.vercel.app/*
     - http://localhost:3000/*
     ```

**NO necesitas rotar**: `NEXT_PUBLIC_FIREBASE_*` (a menos que sospeches abuso)

---

## 🛡️ MEDIDAS DE SEGURIDAD ADICIONALES

### 1. Limpiar historial de git (OPCIONAL pero RECOMENDADO)

```bash
# ADVERTENCIA: Esto reescribe el historial de git
# Todos los colaboradores necesitarán re-clonar el repositorio

# Opción 1: BFG Repo-Cleaner (recomendado)
brew install bfg  # o descarga de https://rtyley.github.io/bfg-repo-cleaner/
bfg --delete-files .env
bfg --delete-files .env.local
bfg --delete-files .serviceAccount.json
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Opción 2: git filter-branch (más lento)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env .env.local .serviceAccount.json" \
  --prune-empty --tag-name-filter cat -- --all

# Forzar push (CUIDADO!)
git push origin --force --all
git push origin --force --tags
```

### 2. Habilitar alertas de seguridad en GitHub

```
Settings → Security → Secret scanning
☑ Enable secret scanning
☑ Enable push protection
```

### 3. Usar secretos de plataforma en producción

**Vercel**:
```bash
vercel env add APP_PRIVATE_KEY production
vercel env add TWILIO_AUTH_TOKEN production
# etc...
```

**Firebase Hosting**:
```bash
firebase functions:secrets:set APP_PRIVATE_KEY
firebase functions:secrets:set TWILIO_AUTH_TOKEN
```

### 4. Implementar rotación automática

```typescript
// lib/credentials.ts
export function checkCredentialAge() {
  const ROTATION_WARNING_DAYS = 90;
  const lastRotation = process.env.CREDENTIALS_LAST_ROTATED;

  if (!lastRotation) {
    console.warn('⚠️ Credentials rotation date not set');
    return;
  }

  const daysSinceRotation = (Date.now() - new Date(lastRotation).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceRotation > ROTATION_WARNING_DAYS) {
    console.warn(`⚠️ Credentials are ${daysSinceRotation} days old. Consider rotating.`);
  }
}
```

---

## ✅ CHECKLIST POST-ROTACIÓN

- [ ] Firebase Admin SDK rotado y verificado
- [ ] Google Maps API key rotado y con restricciones
- [ ] Gemini API key rotado
- [ ] Twilio Auth Token rotado
- [ ] VAPID keys rotados
- [ ] Variables actualizadas en .env.local
- [ ] Variables actualizadas en producción (Vercel/Firebase)
- [ ] Aplicación funciona correctamente
- [ ] Credenciales antiguas eliminadas
- [ ] .gitignore verificado
- [ ] .env.example creado
- [ ] Equipo notificado del cambio
- [ ] Documentación actualizada
- [ ] (Opcional) Historial de git limpiado
- [ ] (Opcional) Alertas de seguridad habilitadas

---

## 📞 CONTACTOS DE EMERGENCIA

**Si sospechas abuso activo de las credenciales**:

1. **Firebase/Google Cloud**: https://support.google.com/firebase/contact/support
2. **Twilio**: https://www.twilio.com/help/support
3. **Reporte de incidente interno**: [Tu proceso interno]

---

## 📚 RECURSOS ADICIONALES

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)

---

**Generado**: 2025-11-26
**Autor**: Claude Code Security Audit
**Versión**: 1.0
