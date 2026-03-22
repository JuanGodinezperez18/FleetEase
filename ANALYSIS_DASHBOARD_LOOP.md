# Análisis del Problema del Bucle en Dashboard Admin

## 🔍 Diagnóstico del Problema

### Síntomas Observados
- El login es exitoso (consola muestra "Inicio de sesión exitoso")
- La cookie de sesión se crea correctamente
- El dashboard NO se carga, se queda en un bucle

### Causas Potenciales Identificadas

#### 1. **Problema en el Middleware (CRÍTICO)**
**Archivo:** `src/middleware.ts:28-36`

El middleware hace un fetch interno a `/api/auth/verify-session` en cada request. Si esta API no responde correctamente o hay un problema de permisos, puede causar redirecciones infinitas.

**Evidencia:**
```typescript
// middleware.ts línea 28-36
const verifyUrl = new URL('/api/auth/verify-session', req.url);
const response = await fetch(verifyUrl.toString(), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionCookie }),
});
```

**Problema:** Si `/api/auth/verify-session` falla o retorna un error, el middleware redirige a `/login`, creando un bucle.

#### 2. **Custom Claims no Establecidos**
**Archivo:** `src/app/api/auth/verify-session/route.ts:15-20`

```typescript
const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);

return NextResponse.json({
  uid: decodedToken.uid,
  role: decodedToken.role,  // ⚠️ Puede no existir si no se estableció custom claim
  companyId: decodedToken.companyId,
});
```

**Problema:** Si el token no tiene `role` o `companyId` como custom claims, el middleware no puede validar correctamente.

#### 3. **Dashboard Config en Loading Perpetuo**
**Archivo:** `src/app/dashboard/page.tsx:181-188`

```typescript
if (isLoadingConfig || !customDateRange || !currentUser) {
  return <GlobalLoader />;
}
```

**Problema:** Si `useDashboardConfig` nunca termina de cargar, el dashboard se queda en GlobalLoader infinitamente.

#### 4. **useEffect con Dependencias Incorrectas**
**Archivo:** `src/app/(auth)/login/page.tsx:35-83`

```typescript
useEffect(() => {
  // ... código de redirección
}, [currentUser, loading]); // ⚠️ Faltan dependencias: callbackUrl, isRedirecting, router
```

**Problema:** Las dependencias faltantes pueden causar que el efecto no se ejecute correctamente o que cause re-renders infinitos.

## ✅ Soluciones Propuestas

### Solución 1: Agregar Logs de Debug (INMEDIATO)

Agregar console.logs estratégicos para identificar dónde se detiene el flujo:

```typescript
// En middleware.ts
console.log('🔐 [Middleware] Verificando sesión para:', pathname);
console.log('🔐 [Middleware] Session cookie:', sessionCookie ? 'exists' : 'missing');

// En dashboard/page.tsx
console.log('🔵 [Dashboard] Estado:', {
  isLoadingConfig,
  hasCustomDateRange: !!customDateRange,
  hasCurrentUser: !!currentUser
});

// En auth-provider.tsx
console.log('👤 [Auth] Estado del usuario:', {
  hasUser: !!firebaseUser,
  uid: firebaseUser?.uid
});
```

### Solución 2: Verificar API de Verificación de Sesión (CRÍTICO)

Asegurarse de que `/api/auth/verify-session` funcione correctamente:

```typescript
// Agregar en src/app/api/auth/verify-session/route.ts
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 [Verify Session] Request recibido');

    const { sessionCookie } = await req.json();

    if (!sessionCookie) {
      console.error('❌ [Verify Session] No session cookie');
      return NextResponse.json(
        { error: 'No session cookie provided' },
        { status: 401 }
      );
    }

    console.log('🔍 [Verify Session] Verificando cookie...');
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);

    console.log('✅ [Verify Session] Token verificado:', {
      uid: decodedToken.uid,
      role: decodedToken.role || 'NO_ROLE',
      companyId: decodedToken.companyId || 'NO_COMPANY'
    });

    return NextResponse.json({
      uid: decodedToken.uid,
      role: decodedToken.role,
      companyId: decodedToken.companyId,
    });
  } catch (error) {
    console.error('❌ [Verify Session] Error:', error);
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }
}
```

### Solución 3: Establecer Custom Claims al Crear Usuario (REQUERIDO)

Asegurarse de que al crear/actualizar usuarios, se establezcan los custom claims:

```typescript
// En functions/src/index.ts o donde se cree el usuario
import * as admin from 'firebase-admin';

// Al crear usuario
await admin.auth().setCustomUserClaims(userId, {
  role: userData.role,
  companyId: userData.companyId
});
```

### Solución 4: Mejorar Manejo de Errores en Dashboard Config

```typescript
// En src/hooks/use-dashboard-config.ts
export function useDashboardConfig(userId: string | undefined) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, userId],
    queryFn: async () => {
      console.log('📊 [Dashboard Config] Cargando para:', userId);

      if (!userId) {
        console.error('❌ [Dashboard Config] No userId');
        throw new Error('User ID requerido');
      }

      const config = await dashboardService.getUserDashboard(userId);
      console.log('✅ [Dashboard Config] Cargado:', config);

      if (config && Array.isArray(config.widgets)) {
        config.widgets.sort((a, b) => a.order - b.order);
      }
      return config;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### Solución 5: Timeout en Dashboard Loading

Agregar un timeout para evitar loading infinito:

```typescript
// En src/app/dashboard/page.tsx
const [loadingTimeout, setLoadingTimeout] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    if (isLoadingConfig) {
      console.error('⏱️ [Dashboard] Timeout cargando configuración');
      setLoadingTimeout(true);
      toast.error('Error cargando dashboard. Por favor recarga la página.');
    }
  }, 10000); // 10 segundos

  return () => clearTimeout(timer);
}, [isLoadingConfig]);

if (loadingTimeout) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <p className="text-xl font-semibold mb-2 text-red-600">Error al cargar el dashboard</p>
      <p className="text-muted-foreground mb-4">El dashboard tardó demasiado en cargar</p>
      <Button onClick={() => window.location.reload()}>Recargar Página</Button>
    </div>
  );
}
```

## 🧪 Plan de Pruebas

### Paso 1: Verificar Logs de Consola
1. Abrir DevTools (F12)
2. Ir a la pestaña Console
3. Intentar hacer login
4. Buscar los siguientes mensajes:
   - `✅ [Auth] Session cookie creada`
   - `🔐 [Middleware] Verificando sesión`
   - `✅ [Verify Session] Token verificado`
   - `📊 [Dashboard Config] Cargando`
   - `🔵 [Dashboard] Iniciando renderizado`

### Paso 2: Verificar Network
1. Ir a la pestaña Network en DevTools
2. Filtrar por "verify-session"
3. Verificar que la respuesta sea 200 OK
4. Verificar que el JSON tenga `role` y `companyId`

### Paso 3: Verificar Firestore
1. Ir a Firebase Console > Firestore
2. Verificar que exista la colección `dashboardConfigs`
3. Verificar que exista un documento con el `userId`

### Paso 4: Verificar Custom Claims
1. En Firebase Console > Authentication
2. Seleccionar el usuario
3. Verificar que tenga custom claims establecidos

## 🎯 Siguiente Paso INMEDIATO

1. **Agregar logs de debug en los archivos clave** (15 minutos)
2. **Ejecutar `npm run dev` y probar login** (5 minutos)
3. **Analizar logs de consola y network** (10 minutos)
4. **Identificar el punto exacto donde falla** (5 minutos)
5. **Aplicar la solución específica** (20 minutos)

## 📝 Notas Adicionales

- El problema NO es de compilación (ya se corrigieron esos errores)
- El problema es de RUNTIME, específicamente en el flujo de autenticación
- La cookie se crea correctamente, así que el problema está DESPUÉS del login
- Lo más probable es que sea el middleware o la verificación de sesión
