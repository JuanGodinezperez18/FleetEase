# Solución de Errores de Permisos en Firebase

## Problema: "Missing or insufficient permissions" en Dashboard

Cuando un usuario con rol **admin** ve el error "Missing or insufficient permissions" al cargar el dashboard, sigue estos pasos:

### Causas Comunes

1. **El usuario admin no tiene `companyId` asignado** en su documento de usuario
2. **Los custom claims no están actualizados** en el token de autenticación
3. **Las reglas de Firestore no están desplegadas** correctamente

### Pasos de Diagnóstico

#### 1. Verificar el documento del usuario

Revisa en Firestore (`users/{userId}`) que el usuario tenga:
- `role: "admin"`
- `companyId: "<id-de-empresa>"` (NO null o undefined)

#### 2. Verificar los custom claims del token

Ejecuta esto en la consola del navegador (mientras estás logueado):

```javascript
firebase.auth().currentUser.getIdTokenResult().then(result => {
  console.log('Claims:', result.claims);
});
```

Deberías ver:
```json
{
  "role": "admin",
  "companyId": "<id-de-empresa>",
  "partnerAccess": []
}
```

#### 3. Verificar reglas de Firestore

Asegúrate de que las reglas en `firestore.rules` estén actualizadas y desplegadas:

```bash
firebase deploy --only firestore:rules
```

### Soluciones

#### Solución Rápida: Refrescar Claims

1. **Desde la aplicación**: Usa el botón "Refrescar Permisos" que aparece en la alerta de error
2. **Manual desde consola**:
   ```javascript
   // Forzar refresco del token
   await firebase.auth().currentUser.getIdTokenResult(true);
   window.location.reload();
   ```

#### Solución Permanente: Asignar companyId

Si el usuario no tiene `companyId`:

1. **Desde Firestore Console**:
   - Ve a `users/{userId}`
   - Agrega el campo `companyId` con el ID de la empresa correspondiente
   - Guarda los cambios

2. **Ejecutar sync de claims**:
   ```bash
   # Desde Firebase Console > Functions
   # O llama a la función syncUserClaims desde la app
   ```

#### Solución: Deploy de Reglas

```bash
cd /home/user/studio
firebase deploy --only firestore:rules
```

### Cambios Realizados

#### 1. Reglas de Seguridad Actualizadas

**Archivo**: `firestore.rules`

```javascript
// ========== DASHBOARD PERSONALIZADO ==========
match /userDashboards/{userId} {
  // El dueño puede leer/escribir su propio dashboard
  allow read, write: if isOwner(userId);
  // SuperAdmin puede leer todos los dashboards
  allow read: if isSuperAdmin();
  // Admin y Editor pueden leer dashboards de usuarios de su misma compañía
  allow read: if request.auth.token.role in ['admin', 'editor'] &&
                 request.auth.token.companyId != null;
}
```

#### 2. Nueva Función Cloud: `refreshMyClaims`

**Archivo**: `functions/src/index.ts`

Permite que los usuarios refresquen sus propios claims cuando hay errores de permisos.

#### 3. Hook Frontend: `useRefreshClaims`

**Archivo**: `src/hooks/use-refresh-claims.ts`

Hook de React para llamar a la función `refreshMyClaims` desde la UI.

#### 4. Componente de Alerta

**Archivo**: `src/app/dashboard/components/firebase-permission-error-alert.tsx`

Muestra una alerta con botón para refrescar permisos cuando hay errores.

### Verificación Final

Después de aplicar las soluciones:

1. **Logout y Login** del usuario admin
2. **Cargar el dashboard** - debería funcionar sin errores
3. **Verificar consola** - no debería haber errores de permisos

### Comandos Útiles

```bash
# Deploy de reglas actualizadas
firebase deploy --only firestore:rules

# Deploy de funciones (si agregaste refreshMyClaims)
firebase deploy --only functions:refreshMyClaims,syncUserClaims

# Ver logs en tiempo real
firebase functions:log

# Verificar reglas desplegadas
firebase firestore:rules:list
```

### Soporte

Si el problema persiste después de seguir estos pasos:

1. Revisa los logs de Functions: `firebase functions:log`
2. Verifica que el usuario exista en Auth Console
3. Confirma que las reglas se desplegaron correctamente
4. Revisa que el `companyId` en el usuario coincida con un documento en `companies/`
