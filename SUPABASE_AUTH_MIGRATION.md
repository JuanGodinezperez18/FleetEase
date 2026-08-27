# 🔄 Guía: Cambiar a Supabase Auth Provider

## ✅ Lo que ya está listo

- ✅ `src/contexts/auth-provider-supabase.tsx` - Provider de autenticación con Supabase
- ✅ `src/lib/auth.ts` - Funciones de autenticación con Supabase
- ✅ `src/types/index.ts` - Tipos actualizados para usar Supabase
- ✅ `src/lib/supabase-services.ts` - Servicios de datos

---

## 📍 PASO 1: Cambiar el Provider en la Aplicación

### Archivo: `src/app/layout.tsx` o `src/app/dashboard/layout.tsx`

**Antes (Firebase):**
```typescript
import { AuthProvider } from '@/contexts/auth-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Después (Supabase):**
```typescript
import { SupabaseAuthProvider } from '@/contexts/auth-provider-supabase';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SupabaseAuthProvider>
          {children}
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}
```

---

## 📍 PASO 2: Actualizar Hooks que Usan Firebase

### Hook: `use-user-profile.ts`

Si existe un hook que carga el perfil del usuario desde Firebase, actualizar para usar Supabase:

**Antes:**
```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useUserProfile(firebaseUser, options) {
  // ... lógica con Firestore
}
```

**Después:**
```typescript
import { userService } from '@/lib/supabase-services';

export function useUserProfile(supabaseUser, options) {
  // ... lógica con Supabase
}
```

---

## 📍 PASO 3: Actualizar Componentes que Usan Auth

### Componentes de Login

**Antes:**
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

await signInWithEmailAndPassword(auth, email, password);
```

**Después:**
```typescript
import { signIn } from '@/lib/auth';

const { user, error } = await signIn({ email, password });
```

---

## 📍 PASO 4: Actualizar Servicios de Datos

### Reemplazar imports

**Antes:**
```typescript
import { clientService } from '@/lib/firestore-services';
import { db } from '@/lib/firebase';
```

**Después:**
```typescript
import { clientService } from '@/lib/supabase-services';
import { supabase } from '@/lib/supabase';
```

### Las llamadas a la API son similares

```typescript
// Firebase
const clients = await clientService.getAll();

// Supabase - ¡Es lo mismo!
const clients = await clientService.getAll();
```

---

## 📍 PASO 5: Verificar Tipos

Los tipos ahora usan `snake_case` para campos de base de datos:

**Antes (Firebase):**
```typescript
interface Client {
  companyId: string;
  createdAt: string;
  assignedVehicleId?: string;
}
```

**Después (Supabase):**
```typescript
interface Client {
  company_id: string;
  created_at: string;
  assigned_vehicle_id?: string;
}
```

---

## 📍 PASO 6: Actualizar Componentes del Dashboard

### Archivos a verificar:

1. `src/app/dashboard/page.tsx` - Dashboard principal
2. `src/app/dashboard/clients/**` - Gestión de clientes
3. `src/app/dashboard/vehicles/**` - Gestión de vehículos
4. `src/app/dashboard/finance/**` - Gestión financiera

### Cambios comunes:

```typescript
// En componentes que usan useAuth
import { useAuth } from '@/contexts/auth-provider'; // ❌
import { useAuth } from '@/contexts/auth-provider-supabase'; // ✅
```

---

## 📍 PASO 7: Testing

### 1. Probar Login

```bash
npm run dev
```

- Ir a `/dashboard/login`
- Iniciar sesión con email y contraseña
- Verificar que redirige al dashboard

### 2. Probar Datos

- Verificar que los datos se cargan desde Supabase
- Revisar consola del navegador para errores

### 3. Probar Logout

- Cerrar sesión
- Verificar que redirige al login

---

## ⚠️ Problemas Comunes

### Error: "User profile not found"

**Causa**: El usuario existe en Supabase Auth pero no en la tabla `users`

**Solución**:
```sql
-- En Supabase SQL Editor
INSERT INTO users (id, email, name, role, is_deleted, created_at)
SELECT id, email, raw_user_meta_data->>'name', 'viewer', false, NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM users);
```

### Error: "Invalid API key"

**Causa**: Credenciales de Supabase incorrectas

**Solución**: Verificar `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://qettktslcbjjuyejcpqy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

### Error: "Column name does not exist"

**Causa**: Los tipos usan `snake_case` pero el código usa `camelCase`

**Solución**: Actualizar el código para usar `snake_case`:
```typescript
// ❌ Incorrecto
client.companyId

// ✅ Correcto
client.company_id
```

---

## 🎯 Checklist de Migración

### Auth Provider
- [ ] Cambiar `AuthProvider` por `SupabaseAuthProvider`
- [ ] Actualizar imports en `layout.tsx`
- [ ] Probar login/logout

### Hooks
- [ ] Actualizar `useAuth` imports
- [ ] Actualizar `useUserProfile` si existe
- [ ] Probar carga de perfil

### Componentes
- [ ] Actualizar componentes de login
- [ ] Actualizar dashboard
- [ ] Actualizar gestión de clientes
- [ ] Actualizar gestión de vehículos
- [ ] Actualizar gestión financiera

### Servicios
- [ ] Reemplazar `firestore-services` por `supabase-services`
- [ ] Actualizar consultas
- [ ] Probar CRUD completo

### Tipos
- [ ] Actualizar `camelCase` → `snake_case`
- [ ] Verificar tipos en componentes
- [ ] Probar TypeScript compilation

---

## 📚 Recursos

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Naming Conventions](https://www.postgresql.org/docs/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)

---

**¿Necesitas ayuda?** Revisa los archivos de ejemplo en `src/contexts/auth-provider-supabase.tsx`
