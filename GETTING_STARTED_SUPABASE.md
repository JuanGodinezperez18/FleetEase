# 🎯 Comenzar con Supabase - Pasos a Seguir

## ✅ Lo que ya está listo

Todo el trabajo de configuración inicial está **COMPLETADO**:

- ✅ SDK de Supabase instalado
- ✅ Configuración creada
- ✅ Esquema de base de datos diseñado (22 tablas)
- ✅ Servicios de datos implementados
- ✅ Sistema de autenticación listo
- ✅ Script de migración creado
- ✅ Documentación completa

---

## 🚀 PASOS PARA COMENZAR

### Paso 1: Crear Proyecto en Supabase (10 minutos)

1. **Ve a**: [https://app.supabase.com](https://app.supabase.com)
2. **Inicia sesión** o crea una cuenta gratuita
3. **Haz clic en**: "New Project"
4. **Completa el formulario**:
   ```
   Name: fleetease-manager
   Database Password: [Elige una contraseña segura - GUÁRDALA]
   Region: US East (N. Virginia) - o la más cercana a ti
   ```
5. **Haz clic en**: "Create new project"
6. **Espera**: 2-5 minutos mientras se crea el proyecto

---

### Paso 2: Ejecutar Script SQL (5 minutos)

1. **En el dashboard de Supabase**:
   - Menú lateral → **SQL Editor**
   - Haz clic en **"New Query"**

2. **Copia el archivo** `supabase-schema.sql` de este proyecto

3. **Pega el contenido** en el editor SQL de Supabase

4. **Haz clic en**: "Run" o presiona `Ctrl+Enter`

5. **Verifica**:
   - Deberías ver "Success. No rows returned"
   - Menú lateral → **Table Editor** → Deberías ver 22 tablas

---

### Paso 3: Obtener Credenciales (2 minutos)

1. **En Supabase**:
   - Menú lateral → **Settings** (engranaje)
   - Haz clic en **API**

2. **Copia estos valores**:
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

### Paso 4: Configurar Variables de Entorno (3 minutos)

1. **Crea o edita** el archivo `.env.local` en la raíz del proyecto:

```env
# ======================
# SUPABASE
# ======================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ======================
# FIREBASE (TEMPORAL - Para migración gradual)
# ======================
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fleetease-manager
# ... resto de variables de Firebase
```

2. **Guarda el archivo**

---

### Paso 5: Probar Conexión (2 minutos)

Ejecuta en tu terminal:

```bash
npm run test:supabase-connection
```

**Resultado esperado**:
```
🔍 Testing connections...

============================================================
✅ Firebase connection: OK
✅ Supabase connection: OK
============================================================
```

---

### Paso 6: Crear Usuario Admin (5 minutos)

**Opción A: Desde Supabase Dashboard**

1. Menú lateral → **Authentication** → **Users**
2. Haz clic en **"Add user"**
3. Completa:
   ```
   Email: tu-email@empresa.com
   Password: tu-contraseña-segura
   ```
4. Haz clic en **"Create user"**
5. Copia el **User ID** que se genera

6. Ve a **SQL Editor** y ejecuta:
   ```sql
   -- Actualizar perfil del usuario como admin
   UPDATE users 
   SET 
     name = 'Tu Nombre',
     role = 'admin',
     company_id = (SELECT id FROM companies LIMIT 1)
   WHERE id = 'USER_ID_QUE_COPIASTE';
   ```

**Opción B: Desde la Aplicación**

1. Inicia la aplicación: `npm run dev`
2. Ve a `/dashboard/signup`
3. Registra un nuevo usuario
4. En Supabase, ve a **Authentication** → **Users** y copia el ID
5. Ejecuta el SQL de arriba para hacerlo admin

---

### Paso 7: Migrar Datos (Opcional - 30 minutos)

**Si tienes datos en Firebase que quieres migrar**:

1. **Asegúrate** de tener las credenciales de Firebase Admin en `.env.local`:
   ```env
   FIREBASE_ADMIN_PROJECT_ID=...
   FIREBASE_ADMIN_CLIENT_EMAIL=...
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

2. **Exporta un backup** (recomendado):
   ```bash
   npm run migrate:supabase:export
   ```

3. **Ejecuta la migración**:
   ```bash
   npm run migrate:supabase
   ```

4. **Verifica** en Supabase → **Table Editor** que los datos se migraron

---

## 📁 Archivos Importantes

| Archivo | ¿Qué hacer? |
|---------|-------------|
| `.env.local` | Agregar credenciales de Supabase |
| `supabase-schema.sql` | Ejecutar en Supabase SQL Editor |
| `SUPABASE_QUICKSTART.md` | Leer para guía rápida |
| `SUPABASE_REFERENCE.md` | Consultar dudas sobre migración |
| `src/lib/supabase.ts` | Ya está listo, no modificar |
| `src/lib/supabase-services.ts` | Usar en lugar de firestore-services.ts |
| `src/lib/auth.ts` | Usar para autenticación |

---

## 🎯 Siguientes Pasos (Después de Configurar)

### 1. Actualizar Autenticación

**Archivo a modificar**: `src/contexts/auth-context.tsx` (o similar)

```typescript
// ANTES (Firebase)
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// DESPUÉS (Supabase)
import { onAuthStateChange, getCurrentUser } from '@/lib/auth';
```

### 2. Actualizar Servicios

**Archivo a modificar**: Donde uses `firestore-services.ts`

```typescript
// ANTES (Firebase)
import { clientService } from '@/lib/firestore-services';

// DESPUÉS (Supabase)
import { clientService } from '@/lib/supabase-services';
```

### 3. Actualizar Consultas

```typescript
// ANTES (Firebase)
const clients = await clientService.getAll();

// DESPUÉS (Supabase) - ¡Es lo mismo! La API es compatible
const clients = await clientService.getAll();
```

---

## 🧪 Testing

### Test de Servicios

Crea un archivo `test-services.ts`:

```typescript
import { clientService, companyService } from '@/lib/supabase-services';

async function testServices() {
  console.log('🔍 Testing Supabase services...');
  
  // Test companies
  const companies = await companyService.getAll();
  console.log('Companies:', companies);
  
  // Test clients
  const clients = await clientService.getAll();
  console.log('Clients:', clients);
}

testServices();
```

Ejecuta:
```bash
npx tsx test-services.ts
```

---

## ❌ Solución de Problemas

### Error: "Invalid API key"

**Causa**: Credenciales incorrectas en `.env.local`

**Solución**:
1. Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctas
2. Reinicia el servidor de desarrollo: `Ctrl+C` → `npm run dev`
3. Limpia caché del navegador

### Error: "relation does not exist"

**Causa**: Las tablas no se crearon

**Solución**:
1. Ve a Supabase → **SQL Editor**
2. Ejecuta nuevamente `supabase-schema.sql`
3. Verifica en **Table Editor** que existan las tablas

### Error: "permission denied for table"

**Causa**: Políticas RLS bloqueando acceso

**Solución**:
1. Verifica que el usuario esté autenticado
2. Revisa las políticas en **Authentication** → **Policies**
3. Para testing, puedes deshabilitar RLS temporalmente:
   ```sql
   ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
   ```

### Error: "Failed to fetch"

**Causa**: URL de Supabase incorrecta o servidor caído

**Solución**:
1. Verifica que la URL en `.env.local` sea correcta
2. Verifica tu conexión a internet
3. Prueba abrir la URL en el navegador

---

## 📞 Recursos de Ayuda

### Documentación del Proyecto
- [Inicio Rápido](./SUPABASE_QUICKSTART.md)
- [Guía Completa](./SUPABASE_MIGRATION_GUIDE.md)
- [Referencia](./SUPABASE_REFERENCE.md)
- [Resumen](./SUMMARY-SUPABASE-MIGRATION.md)

### Recursos Externos
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase Discord](https://discord.supabase.com)

---

## ✅ Checklist de Configuración

- [ ] Crear cuenta en Supabase
- [ ] Crear proyecto
- [ ] Ejecutar script SQL
- [ ] Copiar credenciales (URL y anon key)
- [ ] Agregar credenciales a `.env.local`
- [ ] Ejecutar `npm run test:supabase-connection`
- [ ] Crear usuario admin
- [ ] Verificar conexión desde la aplicación
- [ ] (Opcional) Migrar datos desde Firebase

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tendrás:

✅ Base de datos PostgreSQL con 22 tablas  
✅ 50+ índices para optimización  
✅ 40+ políticas de seguridad RLS  
✅ Sistema de autenticación funcional  
✅ Servicios de datos listos para usar  
✅ Script de migración automático  

**Tiempo total estimado**: 30-60 minutos

---

**¿Listo para comenzar?** Sigue los pasos arriba y cualquier duda consulta la [documentación completa](./SUPABASE_MIGRATION_GUIDE.md).
