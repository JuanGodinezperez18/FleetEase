# 🔔 Instrucciones de Configuración de Firebase Cloud Messaging (FCM)

## ✅ **Estado Actual:**
- ✅ Service Worker creado (`/public/firebase-messaging-sw.js`)
- ✅ Servicio FCM implementado (`/src/lib/fcm-service.ts`)
- ✅ Hook `useFCM` creado
- ✅ Registro automático de tokens en AuthProvider
- ✅ Badge counter en header
- ✅ APIs de notificaciones actualizadas con FCM
- ⚠️ **FALTA:** Agregar VAPID Key en `.env.local`

---

## 📋 **Pasos para Completar la Configuración:**

### **1. Obtener VAPID Key de Firebase Console**

1. Ve a **Firebase Console**: https://console.firebase.google.com/project/fleetease-manager
2. Click en el ícono de **⚙️ (Configuración)** en el menú lateral
3. Selecciona **"Configuración del proyecto"**
4. Ve a la pestaña **"Cloud Messaging"**
5. Busca la sección **"Certificados de clave de servidor web" (Web Push certificates)**
6. Si no existe una clave, haz click en **"Generar par de claves"**
7. Copia la clave que aparece (empieza con algo como `BM...` o `BP...`)

---

### **2. Agregar VAPID Key al proyecto**

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Busca la línea: `NEXT_PUBLIC_FIREBASE_VAPID_KEY=TU_VAPID_KEY_AQUI`
3. Reemplaza `TU_VAPID_KEY_AQUI` con la clave que copiaste
4. Ejemplo:
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=BM1234567890abcdefghijklmnopqrstuvwxyz...
   ```

---

### **3. Reiniciar el servidor de desarrollo**

```bash
# Detener el servidor actual (Ctrl + C)
# Luego reiniciar:
npm run dev
```

---

### **4. Probar las notificaciones push**

#### **Método 1: Habilitar automáticamente al hacer login**

1. Si ya iniciaste sesión, cierra sesión
2. Vuelve a iniciar sesión
3. El navegador debería solicitar permisos para notificaciones
4. Acepta los permisos
5. El token FCM se registrará automáticamente

#### **Método 2: Usar el hook `useFCM` en un componente**

```typescript
import { useFCM } from '@/hooks/use-fcm';

function MyComponent() {
  const { requestPermission, isPermissionGranted } = useFCM();

  return (
    <div>
      {!isPermissionGranted && (
        <button onClick={requestPermission}>
          Habilitar Notificaciones
        </button>
      )}
    </div>
  );
}
```

#### **Método 3: Enviar notificación de prueba desde backend**

```typescript
// Usar la API desde el servidor o un admin dashboard
await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'USER_ID_AQUI',
    title: '¡Notificación de Prueba!',
    body: 'Esta es una notificación push de prueba',
    type: 'general',
    priority: 'normal'
  })
});
```

---

## 🔍 **Verificar que todo funciona:**

### **1. Verificar registro del Service Worker**

Abre DevTools (F12) → **Application** → **Service Workers**

Deberías ver: `firebase-messaging-sw.js` con estado **Activated and running**

### **2. Verificar token FCM guardado**

Abre DevTools (F12) → **Console**

Busca logs que digan:
```
📱 Token FCM obtenido: BM1234...
✅ Token FCM guardado en Firestore
```

### **3. Verificar en Firestore**

1. Ve a Firebase Console → **Firestore Database**
2. Busca la colección `fcmTokens`
3. Deberías ver documentos con:
   - `userId`: ID del usuario
   - `token`: Token FCM
   - `createdAt`: Timestamp
   - `updatedAt`: Timestamp

---

## 📱 **Cómo Funcionan las Notificaciones:**

### **Escenario 1: App Abierta (Foreground)**
- La notificación llega al listener `onMessage` en el cliente
- Se muestra un toast (usando sonner) con el título y mensaje
- **NO** se muestra notificación nativa del navegador

### **Escenario 2: App Cerrada o Minimizada (Background)**
- La notificación llega al Service Worker
- Se muestra una notificación nativa del navegador
- Al hacer click en la notificación, se abre/enfoca la aplicación

### **Escenario 3: App Completamente Cerrada**
- La notificación llega al Service Worker (si está registrado)
- Se muestra notificación nativa
- Al hacer click, se abre la aplicación

---

## 🔔 **APIs de Notificaciones Disponibles:**

### **1. Enviar notificación a un usuario**

```typescript
POST /api/notifications/send

Body:
{
  "userId": "abc123",
  "title": "Título",
  "body": "Mensaje",
  "type": "general" | "maintenance" | "payment" | "credit",
  "priority": "normal" | "high",
  "url": "/dashboard/clients" (opcional),
  "data": { key: "value" } (opcional),
  "companyId": "company_id"
}

Response:
{
  "success": true,
  "notificationSaved": true,
  "pushSent": true,
  "tokensAttempted": 1,
  "tokensSucceeded": 1,
  "tokensFailed": 0,
  "notificationId": "notif_123"
}
```

### **2. Enviar notificación masiva (Broadcast)**

```typescript
POST /api/notifications/broadcast

Body:
{
  "title": "Título",
  "message": "Mensaje",
  "recipientType": "all" | "admins" | "editors" | "partners" | "clients" | "specific",
  "selectedUsers": ["user1", "user2"], // Solo si recipientType = "specific"
  "sendPush": true,
  "priority": "normal" | "high",
  "senderName": "Admin",
  "companyId": "company_id"
}

Response:
{
  "success": true,
  "recipientCount": 50,
  "pushSent": 45
}
```

---

## 🎯 **Filtrado de Notificaciones por Rol:**

Las notificaciones ya están filtradas por rol en el header:

- **Admin:** Ve todas las notificaciones de la empresa
- **Editor:** Ve notificaciones asignadas a editores
- **Socio:** Ve notificaciones de sus vehículos
- **Cliente:** Ve notificaciones de su vehículo asignado

El filtrado se hace en:
- `src/components/layout/header.tsx` (líneas 32-37)
- `src/hooks/use-notifications-analytics.ts` (filtros personalizados)

---

## 🚨 **Troubleshooting:**

### **Problema: No se solicitan permisos de notificaciones**

**Solución:**
- Verifica que `NEXT_PUBLIC_FIREBASE_VAPID_KEY` esté configurada
- Verifica que el navegador soporte notificaciones (no funciona en HTTP, solo HTTPS o localhost)
- Revisa la consola para errores

### **Problema: El Service Worker no se registra**

**Solución:**
- Verifica que el archivo `/public/firebase-messaging-sw.js` exista
- Limpia el cache del navegador (Ctrl + Shift + Delete)
- Desregistra service workers antiguos en DevTools → Application → Service Workers

### **Problema: Token FCM no se guarda**

**Solución:**
- Verifica que el usuario esté autenticado
- Revisa los logs en consola
- Verifica permisos de Firestore (colección `fcmTokens`)

### **Problema: Las notificaciones no llegan**

**Solución:**
- Verifica que el token FCM esté guardado en Firestore
- Verifica que Firebase Cloud Messaging esté habilitado en Firebase Console
- Revisa los logs del servidor (backend logs)
- Verifica que el token no esté expirado o inválido

---

## ✅ **Checklist Final:**

- [ ] VAPID Key agregada en `.env.local`
- [ ] Servidor de desarrollo reiniciado
- [ ] Service Worker registrado en el navegador
- [ ] Permisos de notificaciones aceptados
- [ ] Token FCM guardado en Firestore
- [ ] Notificación de prueba enviada y recibida
- [ ] Badge counter muestra notificaciones no leídas
- [ ] Click en notificación abre/enfoca la app

---

## 📚 **Recursos Adicionales:**

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

¡Listo! Firebase Cloud Messaging está completamente configurado. Solo falta agregar la VAPID key. 🎉
