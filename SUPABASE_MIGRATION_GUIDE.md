# Guía de Migración a Supabase

Esta guía te ayudará a migrar FleetEase Manager desde Firebase/Firestore a Supabase/PostgreSQL.

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Crear Proyecto en Supabase](#crear-proyecto-en-supabase)
3. [Ejecutar Script SQL](#ejecutar-script-sql)
4. [Configurar Variables de Entorno](#configurar-variables-de-entorno)
5. [Migrar Datos](#migrar-datos)
6. [Actualizar Código](#actualizar-código)
7. [Testing](#testing)
8. [Deploy](#deploy)

---

## 🚀 Configuración Inicial

### Prerrequisitos

- Tener Node.js instalado (v18+)
- Tener una cuenta en [Supabase](https://supabase.com)
- Tener acceso al proyecto actual de Firebase

### Instalación de Dependencias

```bash
npm install @supabase/supabase-js --legacy-peer-deps
```

---

## 🗄️ Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Haz clic en **"New Project"**
3. Completa la información:
   - **Name**: `fleetease-manager`
   - **Database Password**: Elige una contraseña segura (guárdala en un gestor de contraseñas)
   - **Region**: Selecciona la región más cercana a tus usuarios
4. Haz clic en **"Create new project"**

El proyecto tardará unos minutos en crearse.

---

## 📝 Ejecutar Script SQL

Una vez creado el proyecto:

1. En el dashboard de Supabase, ve a **SQL Editor** (en el menú lateral)
2. Haz clic en **"New Query"**
3. Copia y pega el contenido del archivo `supabase-schema.sql`
4. Haz clic en **"Run"** o presiona `Ctrl+Enter`

### ¿Qué hace este script?

- ✅ Crea **22 tablas** para toda tu base de datos
- ✅ Define **índices** para optimizar consultas
- ✅ Configura **triggers** para actualizar timestamps automáticamente
- ✅ Establece **políticas de seguridad RLS** (Row Level Security)
- ✅ Crea **funciones utilitarias** para gestión de compañía y roles
- ✅ Inserta **datos iniciales** (categorías financieras por defecto)

### Tablas Creadas

| Tabla | Descripción |
|-------|-------------|
| `companies` | Empresas que usan el sistema |
| `users` | Perfiles de usuario (vinculado a auth.users) |
| `clients` | Clientes del sistema |
| `partners` | Socios/propietarios |
| `vehicles` | Vehículos |
| `mileage_logs` | Registros de kilometraje |
| `financial_categories` | Categorías de gastos/ingresos |
| `financial_records` | Registros financieros |
| `credits` | Créditos de clientes |
| `credit_payment_schedules` | Calendario de pagos |
| `notifications` | Notificaciones del sistema |
| `vehicle_assignment_logs` | Historial de asignaciones |
| `company_change_logs` | Auditoría de cambios en compañías |
| `client_change_logs` | Auditoría de cambios en clientes |
| `message_templates` | Plantillas de mensajes |
| `message_logs` | Historial de mensajes enviados |
| `multas` | Multas de tránsito |
| `fcm_tokens` | Tokens para notificaciones push |
| `audit_logs` | Logs de auditoría general |
| `documents` | Documentos adjuntos |
| `gps_configs` | Configuración de dispositivos GPS |
| `seguimientos` | Tracking GPS en tiempo real |

---

## 🔐 Configurar Variables de Entorno

### 1. Obtener Credenciales de Supabase

En el dashboard de Supabase:

1. Ve a **Settings** (engranaje en el menú lateral)
2. Haz clic en **API**
3. Copia los siguientes valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (clave larga)

### 2. Actualizar `.env.local`

Copia el archivo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local` y agrega tus credenciales:

```env
# ======================
# SUPABASE
# ======================
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# Mantén Firebase temporalmente para migración gradual
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# ... resto de variables de Firebase
```

⚠️ **Importante**: Nunca hagas commit de `.env.local` al repositorio.

---

## 📦 Migrar Datos

### Opción 1: Script de Migración Automática (Recomendado)

Estamos creando un script de migración que:

1. Exporta datos de Firebase
2. Transforma los datos al formato de PostgreSQL
3. Importa los datos a Supabase

El script estará disponible en `scripts/migrate-to-supabase.ts`

### Opción 2: Exportación Manual

#### Desde Firebase Console:

1. Ve a **Firestore Database**
2. Para cada colección:
   - Haz clic en los 3 puntos ⋮
   - Selecciona **"Download data"**
   - Elige formato JSON

#### Transformación de Datos

Los datos de Firestore necesitan ser transformados:

```javascript
// Ejemplo: Transformar Timestamp de Firestore a ISO String
const transformedData = {
  ...docData,
  created_at: docData.createdAt.toDate().toISOString(),
  updated_at: docData.updatedAt?.toDate().toISOString() || null,
};
```

#### Importar a Supabase

Usa el **Table Editor** de Supabase:

1. Ve a **Table Editor**
2. Selecciona la tabla
3. Haz clic en **"Insert"** > **"Import data"**
4. Sube tu archivo JSON transformado

---

## 💻 Actualizar Código

### 1. Actualizar Imports

**Antes (Firebase):**
```typescript
import { db, auth } from '@/lib/firebase';
import { clientService } from '@/lib/firestore-services';
```

**Después (Supabase):**
```typescript
import { supabase } from '@/lib/supabase';
import { clientService } from '@/lib/supabase-services';
import { signIn, signOut, getCurrentUser } from '@/lib/auth';
```

### 2. Actualizar Consultas

**Antes (Firestore):**
```typescript
const clients = await collection(db, 'clients')
  .where('company_id', '==', companyId)
  .where('is_deleted', '==', false)
  .get();
```

**Después (Supabase):**
```typescript
const clients = await clientService.getByCompany(companyId);
// O consulta personalizada:
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_deleted', false);
```

### 3. Actualizar Autenticación

**Antes (Firebase Auth):**
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

await signInWithEmailAndPassword(auth, email, password);
```

**Después (Supabase Auth):**
```typescript
import { signIn } from '@/lib/auth';

const { user, error } = await signIn({ email, password });
```

### 4. Actualizar Tipos

Los tipos ahora están en `@/types/supabase.ts` y usan convenciones de PostgreSQL:

- `camelCase` → `snake_case` para columnas de BD
- `Timestamp` → `string` (ISO 8601)
- `null` explícito en campos opcionales

---

## 🧪 Testing

### 1. Test de Conexión

Crea un archivo `test-supabase-connection.ts`:

```typescript
import { supabase } from '@/lib/supabase';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Connection failed:', error);
  } else {
    console.log('✅ Connection successful!');
    console.log('Sample data:', data);
  }
}

testConnection();
```

Ejecuta:
```bash
npx tsx test-supabase-connection.ts
```

### 2. Test de Autenticación

```typescript
import { signIn, getCurrentUser, signOut } from '@/lib/auth';

async function testAuth() {
  // Test login
  const { user, error } = await signIn({
    email: 'test@example.com',
    password: 'password123'
  });
  
  if (error) {
    console.error('Login failed:', error);
    return;
  }
  
  console.log('✅ Login successful:', user);
  
  // Test get current user
  const currentUser = await getCurrentUser();
  console.log('Current user:', currentUser);
  
  // Test logout
  await signOut();
  console.log('✅ Logout successful');
}

testAuth();
```

### 3. Test de Servicios

```typescript
import { clientService, vehicleService } from '@/lib/supabase-services';

async function testServices() {
  // Test clients
  const clients = await clientService.getAll();
  console.log('Clients:', clients);
  
  // Test vehicles
  const vehicles = await vehicleService.getAll();
  console.log('Vehicles:', vehicles);
}

testServices();
```

---

## 🚀 Deploy

### 1. Variables de Entorno en Producción

Configura las variables de entorno en tu plataforma de hosting:

**Vercel:**
- Ve a **Settings** > **Environment Variables**
- Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Otros hosts:**
- Sigue la documentación específica de cada plataforma

### 2. Políticas de Seguridad (RLS)

Las políticas RLS ya están configuradas en el script SQL, pero verifica:

1. En Supabase, ve a **Authentication** > **Policies**
2. Revisa que cada tabla tenga las políticas correctas
3. Asegúrate de que los usuarios autenticados puedan acceder solo a sus datos

### 3. Backup Automático

Configura backups automáticos:

1. Ve a **Settings** > **Database**
2. En **Backups**, habilita backups diarios
3. Configura la retención (recomendado: 7 días)

---

## 🔧 Troubleshooting

### Error: "Invalid API key"

**Causa**: Las credenciales de Supabase están incorrectas

**Solución**:
1. Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctas
2. Reinicia el servidor de desarrollo
3. Limpia la caché del navegador

### Error: "permission denied for table"

**Causa**: Las políticas RLS están bloqueando el acceso

**Solución**:
1. Verifica que el usuario esté autenticado
2. Revisa las políticas en **Authentication** > **Policies**
3. Asegúrate de que el usuario tenga el rol correcto

### Error: "relation does not exist"

**Causa**: Las tablas no se crearon correctamente

**Solución**:
1. Ejecuta nuevamente el script SQL
2. Verifica en **Table Editor** que las tablas existan
3. Revisa los logs de error en el SQL Editor

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Discord Community](https://discord.supabase.com)

---

## ✅ Checklist de Migración

- [ ] Crear proyecto en Supabase
- [ ] Ejecutar script SQL
- [ ] Configurar variables de entorno
- [ ] Instalar @supabase/supabase-js
- [ ] Crear archivo de configuración
- [ ] Migrar datos de Firebase
- [ ] Actualizar servicios de datos
- [ ] Actualizar autenticación
- [ ] Actualizar componentes UI
- [ ] Ejecutar tests de conexión
- [ ] Ejecutar tests de autenticación
- [ ] Ejecutar tests de servicios
- [ ] Deploy a producción
- [ ] Verificar políticas RLS
- [ ] Configurar backups
- [ ] Monitorear errores

---

## 🎯 Próximos Pasos

Después de completar la migración:

1. **Migración gradual**: Mantén Firebase activo mientras migras módulo por módulo
2. **Optimización**: Ajusta índices según el uso real
3. **Monitoreo**: Configura alertas en Supabase
4. **Documentación**: Actualiza la documentación del proyecto

---

**¿Preguntas o problemas?** Revisa la [documentación oficial](https://supabase.com/docs) o únete a la comunidad de Supabase en Discord.
