# 🚨 SOLUCIÓN DEFINITIVA - Error de Permisos en Dashboard

## 🔍 DIAGNÓSTICO FINAL

El problema **NO es de permisos de Firestore**. Las reglas ya están correctas.

**El problema real es:** El usuario admin probablemente **NO tiene el campo `companyId`** en su documento de usuario en Firestore, O el `localStorage` no tiene el `selectedCompanyId` correcto.

---

## ✅ SOLUCIÓN RÁPIDA (5 minutos)

### Paso 1: Verificar el Problema

1. Abre la aplicación en el navegador
2. Inicia sesión como admin
3. Abre la consola de desarrollador (F12)
4. Copia y pega el contenido de: `scripts/verificar-admin-companyid.js`
5. Presiona Enter

El script te dirá exactamente qué está mal.

---

### Paso 2A: Si NO Hay companyId en Firestore

**Problema:** El usuario admin no tiene el campo `companyId` en su documento.

**Solución:**

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto: `fleetease-manager`
3. Ve a **Firestore Database**
4. Busca la colección: `users`
5. Encuentra el documento del admin: `{uid-del-admin}`
6. Agrega un nuevo campo:
   - **Nombre:** `companyId`
   - **Tipo:** `string`
   - **Valor:** El ID de tu empresa (ej: `company123`)
7. Guarda el cambio
8. **Cierra sesión y vuelve a iniciar**
9. Prueba crear un registro de ingreso

---

### Paso 2B: Si SÍ Hay companyId en Firestore

**Problema:** El `localStorage` no tiene el valor correcto.

**Solución rápida desde la consola:**

```javascript
// Obtener companyId del usuario
const user = firebase.auth().currentUser;
const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
const companyId = userDoc.data().companyId;

// Guardar en localStorage
localStorage.setItem('selectedCompanyId', companyId);
console.log('✅ companyId guardado:', companyId);

// Recargar página
window.location.reload();
```

---

## 🧪 Verificación Final

Después de aplicar la solución:

1. **Recarga la página** (Ctrl+F5)
2. **Abre el botón flotante** de acciones rápidas
3. **Selecciona "Ingreso"**
4. **Verifica que la lista de clientes se despliegue**

Si la lista muestra clientes, ¡el problema está resuelto!

---

## 🔍 Explicación Técnica

### ¿Por qué pasa esto?

El sistema usa `selectedCompanyId` para filtrar datos:

```typescript
// En ClientsProvider
if (!companyId) return [];  // ← Retorna array vacío si no hay companyId
```

**Para usuarios admin (no superAdmin):**
- `selectedCompanyId` se obtiene de `currentUser.companyId`
- Si `currentUser.companyId` es `null`, los providers retornan `[]`
- Los formularios no muestran clientes porque la lista está vacía

### ¿Por qué en la página de clientes sí funciona?

Porque esa página tiene su propia lógica de carga de datos que **no depende** del `ClientsProvider` del dashboard. Usa consultas directas a Firestore.

---

## 📋 Comandos Útiles

### Verificar estado actual (en consola del navegador):

```javascript
// Ver usuario actual
const user = firebase.auth().currentUser;
console.log('UID:', user.uid);
console.log('Email:', user.email);

// Ver claims del token
const token = await user.getIdTokenResult();
console.log('Role:', token.claims.role);
console.log('Company ID:', token.claims.companyId);

// Ver documento en Firestore
const doc = await firebase.firestore().collection('users').doc(user.uid).get();
console.log('Firestore companyId:', doc.data().companyId);

// Ver localStorage
console.log('localStorage companyId:', localStorage.getItem('selectedCompanyId'));
```

### Arreglar manualmente (si hay companyId en Firestore):

```javascript
const user = firebase.auth().currentUser;
const doc = await firebase.firestore().collection('users').doc(user.uid).get();
const companyId = doc.data().companyId;

localStorage.setItem('selectedCompanyId', companyId);
window.location.reload();
```

---

## 🆘 Si el Problema Persiste

1. **Verifica que el companyId sea válido:**
   ```javascript
   const companyId = localStorage.getItem('selectedCompanyId');
   const companyDoc = await firebase.firestore()
     .collection('companies')
     .doc(companyId)
     .get();
   console.log('Empresa existe:', companyDoc.exists);
   ```

2. **Verifica que haya clientes para esa empresa:**
   ```javascript
   const companyId = localStorage.getItem('selectedCompanyId');
   const clientsSnap = await firebase.firestore()
     .collection('clients')
     .where('companyId', '==', companyId)
     .get();
   console.log('Clientes encontrados:', clientsSnap.size);
   ```

3. **Revisa los logs de la consola** mientras abres el formulario de ingresos.

---

**Fecha:** 2026-03-18
**Problema:** `selectedCompanyId` es null para usuario admin
**Solución:** Asignar `companyId` en documento de usuario y/o localStorage
