# Configuración de SSL/HTTPS para FleetEase Manager

## SSL Automático con Firebase Hosting

Firebase Hosting proporciona **SSL/HTTPS automáticamente** y sin configuración adicional. Todos los sitios alojados en Firebase Hosting obtienen un certificado SSL gratuito de Google Trust Services.

## ✅ Lo que Firebase hace automáticamente:

1. **Certificado SSL Gratuito**: Se genera y renueva automáticamente
2. **HTTPS Forzoso**: Todo el tráfico HTTP se redirige a HTTPS
3. **Renovación Automática**: Los certificados se renuevan antes de expirar
4. **Soporte para Dominios Personalizados**: SSL incluido para dominios custom

## 🔧 Configuración para Dominio Personalizado

### Paso 1: Agregar dominio en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `fleetease-manager`
3. Ve a **Hosting** > **Add custom domain**
4. Ingresa tu dominio (ej: `fleetease.mx` o `app.fleetease.mx`)
5. Sigue las instrucciones para verificar propiedad

### Paso 2: Configurar DNS

Firebase te proporcionará registros DNS para agregar:

```
# Registro A para dominio raíz
Type: A
Name: @
Value: 199.36.158.100

# Registro A para subdominios
Type: A  
Name: @
Value: 199.36.158.100

# O CNAME para subdominios
Type: CNAME
Name: www
Value: fleetease-manager.web.app
```

### Paso 3: Esperar Propagación SSL

- El certificado SSL se genera automáticamente después de configurar DNS
- Puede tomar de 5 a 30 minutos
- Firebase muestra el estado en Firebase Console

## 🚀 Despliegue con SSL

```bash
# Build de producción
npm run build

# Deploy a Firebase Hosting
firebase deploy --only hosting

# O deploy completo
firebase deploy
```

## 🔒 Headers de Seguridad Incluidos

El archivo `next.config.js` ya incluye headers de seguridad:

### Headers Implementados:

1. **Strict-Transport-Security (HSTS)**
   - Fuerza HTTPS por 1 año
   - Incluye subdominios
   - Preload para navegadores

2. **X-Frame-Options**
   - Previene clickjacking
   - Solo permite framing del mismo origen

3. **X-Content-Type-Options**
   - Previene MIME sniffing
   - Fuerza el tipo de contenido declarado

4. **X-XSS-Protection**
   - Activa filtro XSS del navegador
   - Modo de bloqueo activado

5. **Content-Security-Policy (CSP)**
   - Define fuentes permitidas de contenido
   - Previene ataques XSS
   - Restringe dominios de scripts, estilos, imágenes

6. **Referrer-Policy**
   - Controla información de referrer
   - Privacidad mejorada

7. **Cross-Origin Policies**
   - COOP: Aísla ventanas del navegador
   - COEP: Requiere CORS para recursos cruzados

## 🔐 Verificación de SSL

### Verificar certificado:

```bash
# Usando curl
curl -I https://tu-dominio.com

# Usando openssl
openssl s_client -connect tu-dominio.com:443 -servername tu-dominio.com

# Verificar fecha de expiración
echo | openssl s_client -connect tu-dominio.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Herramientas online:

- [SSL Labs Test](https://www.ssllabs.com/ssltest/) - Análisis completo
- [Security Headers](https://securityheaders.com/) - Verificar headers
- [Mozilla Observatory](https://observatory.mozilla.org/) - Security score

## 🛡️ Mejores Prácticas de Seguridad

### 1. Firebase Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Validar que usuario pertenece a la compañía
    match /companies/{companyId}/{subPath=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.companyId == companyId;
    }
  }
}
```

### 2. Variables de Entorno Seguras

```bash
# .env.local (NUNCA hacer commit)
STRIPE_SECRET_KEY=sk_live_...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Usar secrets de Firebase Functions
firebase functions:secrets:set STRIPE_SECRET_KEY
```

### 3. Autenticación Reforzada

```typescript
// Configurar Firebase Auth
const authConfig = {
  // Requerir email verificado
  emailVerification: true,
  
  // Política de contraseñas fuertes
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  
  // MFA (Multi-Factor Authentication)
  mfa: {
    enabled: true,
    factors: ['phone', 'totp'],
  },
};
```

### 4. Rate Limiting en Cloud Functions

```typescript
// functions/src/index.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: 'Too many requests from this IP',
});

export const api = onRequest({ region: 'us-central1' }, async (req, res) => {
  limiter(req, res, () => {
    // Manejar request
  });
});
```

### 5. Logging y Monitoreo

```typescript
// Auditoría de acciones importantes
const logUserAction = async (
  userId: string,
  action: string,
  details: string
) => {
  await db.collection('auditLogs').add({
    userId,
    action,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ip: context.rawRequest?.ip,
    userAgent: context.rawRequest?.headers['user-agent'],
  });
};
```

## 📋 Checklist de Seguridad

### Antes de Producción:

- [ ] SSL certificado activo y válido
- [ ] Headers de seguridad configurados
- [ ] Firebase Security Rules implementadas
- [ ] Variables de entorno sensibles configuradas
- [ ] CORS configurado correctamente
- [ ] Rate limiting activado
- [ ] Logging de auditoría implementado
- [ ] Backups automáticos configurados

### Monitoreo Continuo:

- [ ] Revisar logs de Firebase Auth semanalmente
- [ ] Monitorear intentos fallidos de login
- [ ] Verificar uso de API inusual
- [ ] Revisar Firestore usage y costos
- [ ] Actualizar dependencias mensualmente

## 🔍 Solución de Problemas

### Error: Mixed Content

**Problema**: Recursos HTTP en página HTTPS

**Solución**:
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['firebasestorage.googleapis.com'], // Solo HTTPS
  },
}
```

### Error: Certificate Not Trusted

**Problema**: Certificado SSL no reconocido

**Solución**:
- Esperar 5-30 minutos después de configurar DNS
- Verificar que DNS estén propagados
- Limpiar caché del navegador
- Verificar en [SSL Labs](https://www.ssllabs.com/ssltest/)

### Error: CORS Blocked

**Problema**: Requests bloqueados por CORS

**Solución**:
```javascript
// next.config.js
async headers() {
  return [{
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: 'https://tu-dominio.com' },
    ],
  }];
}
```

## 📚 Recursos Adicionales

- [Firebase Hosting SSL](https://firebase.google.com/docs/hosting/custom-domain#ssl)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Stripe Security](https://stripe.com/docs/security)

## 🎯 Resumen

Firebase Hosting maneja SSL automáticamente:
- ✅ Certificado SSL gratuito
- ✅ HTTPS forzoso
- ✅ Renovación automática
- ✅ Soporte para dominios personalizados

Los headers de seguridad en `next.config.js` proporcionan protección adicional contra ataques comunes.
