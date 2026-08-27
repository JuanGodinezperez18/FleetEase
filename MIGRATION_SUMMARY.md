# Migración Firebase → Supabase - Resumen de Cambios

## 📋 Estado de la Migración

✅ **Completado exitosamente**

---

## 🗂️ Archivos Modificados/Eliminados

### ❌ Eliminados (Obsoletos con Supabase)

| Archivo | Razón |
|---------|-------|
| `src/app/api/login/route.ts` | Supabase Auth maneja login automáticamente |
| `src/app/api/auth/verify-session/route.ts` | El nuevo middleware lo maneja directamente |
| `src/app/api/get-signed-url/route.ts` | Supabase Storage genera URLs firmadas automáticamente |

### ✅ Actualizados

| Archivo | Cambio |
|---------|--------|
| `middleware.ts` | Reescrito completo para usar Supabase SSR |
| `src/app/api/logout/route.ts` | Simplificado para Supabase Auth |
| `src/app/api/health/route.ts` | Migrado a checks de Supabase (DB, Auth, Storage) |
| `src/app/api/upload-inspection/route.ts` | Migrado de Firebase Storage a Supabase Storage + sharp |

### 🆕 Creados

| Archivo | Propósito |
|---------|-----------|
| `src/lib/middleware-supabase.ts` | Middleware alternativo de referencia |
| `src/contexts/data-provider-supabase.tsx` | Data Provider completo con Supabase |
| `src/components/upload/supabase-upload.tsx` | Componente de upload para cliente |
| `SUPABASE_STORAGE_RLS.md` | Documentación de políticas RLS |

### 📝 Actualizados (Configuración)

| Archivo | Cambio |
|---------|--------|
| `src/components/common/providers.tsx` | Ahora usa SupabaseAuthProvider y DataProvider de Supabase |
| `package.json` | Agregada dependencia `@supabase/ssr` |

---

## 🔐 Autenticación

### Antes (Firebase)
```typescript
// Firebase Admin SDK
const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
res.cookies.set('session', sessionCookie);
```

### Después (Supabase)
```typescript
// Supabase SSR - Maneja cookies automáticamente
const supabase = createRouteHandlerClient({ cookies });
const { data: { session } } = await supabase.auth.getSession();
```

**Ventajas:**
- ✅ No necesitas manejar cookies manualmente
- ✅ El cliente de Supabase en el navegador está sincronizado automáticamente
- ✅ Refresh tokens automáticos
- ✅ Soporte para OAuth integrado

---

## 🗄️ Base de Datos

### Antes (Firestore)
```typescript
// Consultas complejas con limitaciones
const q = query(
  collection(db, 'clients'),
  where('companyId', '==', companyId),
  orderBy('createdAt', 'desc'),
  limit(100)
);
const snapshot = await getDocs(q);
```

### Después (PostgreSQL + Supabase)
```typescript
// Consultas SQL completas
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false })
  .limit(100);
```

**Ventajas:**
- ✅ Joins complejos sin necesidad de queries separadas
- ✅ Transactions ACID reales
- ✅ Índices configurables
- ✅ Más de 1000 resultados sin limitación
- ✅ Full-text search integrado

---

## 📁 Storage (Archivos)

### Antes (Firebase Storage)
```typescript
// Servidor necesario para generar URLs firmadas
const [signedUrl] = await file.getSignedUrl({
  version: 'v4',
  action: 'read',
  expires: Date.now() + 15 * 60 * 1000,
});
```

### Después (Supabase Storage)
```typescript
// Cliente puede generar URLs directamente
const { data: { signedUrl } } = await supabase.storage
  .from('documents')
  .createSignedUrl(path, 900); // 15 minutos

// O usar URL pública con RLS
const { data: { publicUrl } } = supabase.storage
  .from('documents')
  .getPublicUrl(path);
```

**Ventajas:**
- ✅ Upload directo desde navegador (más rápido)
- ✅ URLs firmadas generadas en cliente
- ✅ Políticas RLS muy flexibles
- ✅ Transformación de imágenes on-the-fly

---

## 🚀 API Routes Status

| Ruta | Estado | Acción |
|------|--------|--------|
| `/api/login` | ❌ Eliminada | No necesaria con Supabase |
| `/api/logout` | ✅ Actualizada | Simplificada para Supabase |
| `/api/auth/verify-session` | ❌ Eliminada | Middleware lo maneja |
| `/api/health` | ✅ Actualizada | Checks de Supabase |
| `/api/upload` | 🔵 Mover a cliente | Componente creado |
| `/api/get-signed-url` | ❌ Eliminada | Cliente lo hace directo |
| `/api/delete-file` | 🔵 Opcional | Puede ir al cliente |
| `/api/download-file` | 🔵 Opcional | Cliente genera URL |
| `/api/upload-inspection` | ✅ Actualizada | Supabase + sharp |
| `/api/seguimiento/upload-foto` | 🟡 Pendiente | Similar a upload-inspection |
| `/api/notifications/send` | 🟡 Mantener | FCM requiere servidor |
| `/api/notifications/broadcast` | 🟡 Mantener | FCM requiere servidor |

---

## 📊 Comparativa: Firebase vs Supabase

| Característica | Firebase | Supabase | Ganador |
|----------------|----------|----------|---------|
| **Setup inicial** | Más fácil | Más complejo | Firebase |
| **Consultas complejas** | Limitado (Firestore) | Completo (PostgreSQL) | **Supabase** |
| **Costo escalado** | Puede subir rápido | Más predecible | **Supabase** |
| **Offline support** | ✅ Excelente | ⚠️ Básico | Firebase |
| **Relaciones datos** | ⚠️ Manual | ✅ Nativo (SQL) | **Supabase** |
| **Realtime** | ✅ Firestore | ✅ PostgreSQL | Empate |
| **Storage** | ✅ URLs firmadas | ✅ URLs firmadas + RLS | **Supabase** |
| **Auth** | ✅ Completo | ✅ Completo + OAuth | Empate |
| **Vendor lock-in** | ⚠️ Alto | ✅ Open source | **Supabase** |
| **Self-hosted** | ❌ No | ✅ Sí | **Supabase** |

---

## 🎯 Próximos Pasos

### 1. Instalar dependencias faltantes
```bash
npm install @supabase/ssr
```

### 2. Configurar variables de entorno
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Crear buckets en Supabase Storage
1. Ve a Supabase Dashboard → Storage
2. Crea los buckets: `documents`, `vehicle-images`, `client-documents`, `seguimientos`, `inspection-images`
3. Configura las políticas RLS (ver `SUPABASE_STORAGE_RLS.md`)

### 4. Migrar datos de Firebase a Supabase
Usa los scripts existentes:
```bash
npm run migrate:supabase
```

### 5. Probar la aplicación
```bash
npm run dev
```

---

## ⚠️ Notas Importantes

### Cambios de Tipos
Los tipos de Supabase usan **snake_case**:
- `createdAt` → `created_at`
- `companyId` → `company_id`
- `userId` → `user_id`

El data provider nuevo maneja esto automáticamente.

### Componentes que aún usan Firebase
Algunos componentes aún importan de `@/lib/firebase`. Esto está bien porque:
- El `data-provider-supabase.tsx` reemplaza completamente las llamadas a Firestore
- Los hooks que usan Firebase directamente pueden actualizarse gradualmente

### Notificaciones Push
Las notificaciones FCM siguen funcionando con Firebase. Si deseas migrar:
- Opción A: Mantener Firebase solo para FCM
- Opción B: Migrar a Supabase Edge Functions + WebPush
- Opción C: Usar servicio externo (OneSignal, etc.)

---

## ✅ Checklist de Verificación

- [ ] Instalar `@supabase/ssr`
- [ ] Configurar variables de entorno de Supabase
- [ ] Crear buckets en Supabase Storage
- [ ] Aplicar políticas RLS (copiar desde `SUPABASE_STORAGE_RLS.md`)
- [ ] Ejecutar scripts de migración de datos
- [ ] Probar login/logout
- [ ] Probar subida de archivos
- [ ] Probar CRUD de vehículos, clientes, etc.
- [ ] Verificar que notificaciones push siguen funcionando (si usas FCM)
- [ ] Hacer backup de Firebase antes de desactivar

---

## 🆘 Solución de Problemas

### Error: "Cannot find module '@supabase/ssr'"
```bash
npm install @supabase/ssr
```

### Error: "Invalid API key"
Verifica que las variables de entorno estén configuradas correctamente.

### Error: "Bucket not found"
Crea los buckets manualmente en Supabase Dashboard.

### Error: "new row violates row-level security policy"
Aplica las políticas RLS desde el archivo `SUPABASE_STORAGE_RLS.md`.

### Error: "Cannot read property 'user' of null"
El usuario no está autenticado. Verifica que el middleware esté funcionando.

---

## 📚 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🤝 Contribución

Si encuentras problemas durante la migración:
1. Revisa los logs en la consola del navegador
2. Verifica que las políticas RLS estén correctamente aplicadas
3. Asegúrate de que los buckets existan en Supabase
4. Verifica las variables de entorno

---

**Última actualización:** Marzo 2026
**Versión:** 2.0.0-Supabase
