# 📖 Referencia: Firebase vs Supabase

## Comparación Rápida

| Característica | Firebase (Firestore) | Supabase (PostgreSQL) |
|----------------|---------------------|----------------------|
| **Tipo de BD** | NoSQL (Documentos) | SQL (Relacional) |
| **Modelo** | Colecciones/Documentos | Tablas/Registros |
| **Consultas** | Limitadas | SQL completo |
| **Joins** | Manuales (múltiples queries) | Nativos (JOIN) |
| **Transacciones** | Sí | Sí |
| **Offline** | Sí | No (por defecto) |
| **Tiempo real** | Sí (websockets) | Sí (subscriptions) |
| **Auth** | Firebase Auth | Supabase Auth |
| **Storage** | Firebase Storage | Supabase Storage |
| **Precio** | Por lectura/escritura | Por uso de BD |

---

## Mapeo de Conceptos

### Estructura de Datos

| Firebase | Supabase | Ejemplo |
|----------|----------|---------|
| Colección | Tabla | `clients` → `clients` |
| Documento | Registro (Row) | `{ id: "1", name: "John" }` |
| Campo | Columna | `name` → `name` |
| Subcolección | Tabla con FK | `clients/{id}/credits` → `credits` con `client_id` |

---

## Migración de Consultas

### Lectura Básica

**Firebase:**
```typescript
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const snapshot = await getDocs(collection(db, 'clients'));
const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Supabase:**
```typescript
import { clientService } from '@/lib/supabase-services';

const clients = await clientService.getAll();
```

### Consulta con Filtros

**Firebase:**
```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';

const q = query(
  collection(db, 'clients'),
  where('company_id', '==', companyId),
  where('is_deleted', '==', false)
);
const snapshot = await getDocs(q);
```

**Supabase:**
```typescript
import { supabase } from '@/lib/supabase';

const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_deleted', false);
```

### Consulta con Ordenamiento y Límite

**Firebase:**
```typescript
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const q = query(
  collection(db, 'clients'),
  orderBy('lastname', 'asc'),
  limit(20)
);
const snapshot = await getDocs(q);
```

**Supabase:**
```typescript
import { supabase } from '@/lib/supabase';

const { data } = await supabase
  .from('clients')
  .select('*')
  .order('lastname', { ascending: true })
  .limit(20);
```

### Consulta con Join

**Firebase:** (requiere múltiples queries)
```typescript
// 1. Obtener clientes
const clientsSnapshot = await getDocs(collection(db, 'clients'));
const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// 2. Para cada cliente, obtener su vehículo
const clientsWithVehicles = await Promise.all(
  clients.map(async (client) => {
    if (client.assigned_vehicle_id) {
      const vehicleDoc = await getDoc(doc(db, 'vehicles', client.assigned_vehicle_id));
      return {
        ...client,
        vehicle: vehicleDoc.exists() ? { id: vehicleDoc.id, ...vehicleDoc.data() } : null
      };
    }
    return { ...client, vehicle: null };
  })
);
```

**Supabase:** (single query)
```typescript
const { data } = await supabase
  .from('clients')
  .select(`
    *,
    vehicle:assigned_vehicle_id (
      id,
      alias,
      plate,
      make,
      model
    )
  `)
  .eq('company_id', companyId);
```

### Conteo de Registros

**Firebase:**
```typescript
import { collection, getCountFromServer } from 'firebase/firestore';

const snapshot = await getCountFromServer(collection(db, 'clients'));
const count = snapshot.data().count;
```

**Supabase:**
```typescript
// Opción 1: Usando el servicio
const count = await clientService.count();

// Opción 2: Query directa
const { count } = await supabase
  .from('clients')
  .select('*', { count: 'exact', head: true });
```

---

## Migración de Operaciones CRUD

### Crear (Create)

**Firebase:**
```typescript
import { collection, addDoc } from 'firebase/firestore';

const docRef = await addDoc(collection(db, 'clients'), {
  firstname: 'John',
  lastname: 'Doe',
  email: 'john@example.com',
  created_at: new Date().toISOString()
});

console.log('Document written with ID:', docRef.id);
```

**Supabase:**
```typescript
import { clientService } from '@/lib/supabase-services';

const client = await clientService.add({
  firstname: 'John',
  lastname: 'Doe',
  email: 'john@example.com',
  phone: '1234567890',
  license_number: 'ABC123',
  license_expiry: '2025-12-31',
  license_status: 'active',
  initial_balance: 0,
  balance: 0,
  security_deposit: 0,
  status: 'active',
  is_deleted: false,
  company_id: 'xxx'
});

console.log('Client created with ID:', client.id);
```

### Leer (Read)

**Firebase:**
```typescript
import { doc, getDoc } from 'firebase/firestore';

const docRef = doc(db, 'clients', clientId);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  const client = { id: docSnap.id, ...docSnap.data() };
  console.log('Client:', client);
} else {
  console.log('No such client!');
}
```

**Supabase:**
```typescript
import { clientService } from '@/lib/supabase-services';

const client = await clientService.get(clientId);

if (client) {
  console.log('Client:', client);
} else {
  console.log('Client not found!');
}
```

### Actualizar (Update)

**Firebase:**
```typescript
import { doc, updateDoc } from 'firebase/firestore';

await updateDoc(doc(db, 'clients', clientId), {
  balance: newBalance,
  updated_at: new Date().toISOString()
});
```

**Supabase:**
```typescript
import { clientService } from '@/lib/supabase-services';

await clientService.update(clientId, {
  balance: newBalance
});
// updated_at se actualiza automáticamente con trigger
```

### Eliminar (Delete)

**Firebase:**
```typescript
// Soft delete
import { doc, updateDoc } from 'firebase/firestore';

await updateDoc(doc(db, 'clients', clientId), {
  is_deleted: true
});

// Hard delete
import { doc, deleteDoc } from 'firebase/firestore';

await deleteDoc(doc(db, 'clients', clientId));
```

**Supabase:**
```typescript
// Soft delete
import { clientService } from '@/lib/supabase-services';

await clientService.softDelete(clientId);

// Hard delete
await clientService.hardDelete(clientId);
```

---

## Migración de Autenticación

### Registro de Usuario

**Firebase:**
```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const userCredential = await createUserWithEmailAndPassword(
  auth,
  'user@example.com',
  'password123'
);

console.log('User created:', userCredential.user.uid);
```

**Supabase:**
```typescript
import { signUp } from '@/lib/auth';

const { user, error } = await signUp({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('User created:', user.id);
}
```

### Login

**Firebase:**
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const userCredential = await signInWithEmailAndPassword(
  auth,
  'user@example.com',
  'password123'
);

console.log('User logged in:', userCredential.user.uid);
```

**Supabase:**
```typescript
import { signIn } from '@/lib/auth';

const { user, error } = await signIn({
  email: 'user@example.com',
  password: 'password123'
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('User logged in:', user.id);
}
```

### Logout

**Firebase:**
```typescript
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

await signOut(auth);
```

**Supabase:**
```typescript
import { signOut } from '@/lib/auth';

await signOut();
```

### Escuchar Cambios de Auth

**Firebase:**
```typescript
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User is signed in:', user.uid);
  } else {
    console.log('User is signed out');
  }
});
```

**Supabase:**
```typescript
import { onAuthStateChange } from '@/lib/auth';

const { subscription } = onAuthStateChange((user) => {
  if (user) {
    console.log('User is signed in:', user.id);
  } else {
    console.log('User is signed out');
  }
});

// Para cancelar la suscripción:
// subscription.unsubscribe();
```

---

## Migración de Tipos

### Tipos de Firestore

**Antes:**
```typescript
import { Timestamp, DocumentReference } from 'firebase/firestore';

interface Client {
  id: string;
  name: string;
  createdAt: Timestamp;
  companyRef: DocumentReference;
}
```

**Después:**
```typescript
interface Client {
  id: string;
  name: string;
  created_at: string; // ISO 8601
  company_id: string | null; // UUID
}
```

### Convenciones de Nombres

| Firebase | Supabase |
|----------|----------|
| `camelCase` | `snake_case` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `companyId` | `company_id` |
| `assignedVehicleId` | `assigned_vehicle_id` |

---

## Manejo de Fechas

**Firebase:**
```typescript
import { Timestamp } from 'firebase/firestore';

// Crear
const doc = {
  created_at: Timestamp.now(),
  birth_date: Timestamp.fromDate(new Date('1990-01-01'))
};

// Leer
const data = doc.data();
const createdAt = data.created_at.toDate();
```

**Supabase:**
```typescript
// Crear
const doc = {
  created_at: new Date().toISOString(),
  birth_date: '1990-01-01'
};

// Leer
const { data } = await supabase.from('clients').select('*').single();
const createdAt = new Date(data.created_at);
```

---

## Storage (Almacenamiento de Archivos)

### Subir Archivo

**Firebase:**
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const storageRef = ref(storage, `clients/${clientId}/photo.jpg`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

**Supabase:**
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.storage
  .from('clients')
  .upload(`${clientId}/photo.jpg`, file);

if (error) throw error;

const { data: { publicUrl } } = supabase.storage
  .from('clients')
  .getPublicUrl(`${clientId}/photo.jpg`);
```

### Descargar Archivo

**Firebase:**
```typescript
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const url = await getDownloadURL(ref(storage, `clients/${clientId}/photo.jpg`));
```

**Supabase:**
```typescript
import { supabase } from '@/lib/supabase';

const { data } = await supabase.storage
  .from('clients')
  .download(`${clientId}/photo.jpg`);
```

---

## Errores Comunes y Soluciones

### Error 1: "permission denied for table"

**Causa**: Políticas RLS bloqueando acceso

**Solución**:
```sql
-- Verificar políticas en Supabase Dashboard
-- Authentication > Policies

-- O crear política temporal para testing (NO USAR EN PRODUCCIÓN)
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
```

### Error 2: "relation does not exist"

**Causa**: Tabla no existe

**Solución**:
```bash
# Ejecutar script SQL en Supabase SQL Editor
# Copiar contenido de supabase-schema.sql
```

### Error 3: "Invalid API key"

**Causa**: Credenciales incorrectas

**Solución**:
```env
# Verificar .env.local
NEXT_PUBLIC_SUPABASE_URL=https://correcto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### Error 4: "duplicate key value violates unique constraint"

**Causa**: Intentando insertar ID duplicado

**Solución**:
```typescript
// Usar upsert en lugar de insert
const { data, error } = await supabase
  .from('clients')
  .upsert(data, { onConflict: 'id' });
```

---

## Mejores Prácticas

### 1. Usar Servicios

❌ **Mal:**
```typescript
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id', companyId);
```

✅ **Bien:**
```typescript
const clients = await clientService.getByCompany(companyId);
```

### 2. Manejar Errores

❌ **Mal:**
```typescript
const client = await clientService.get(id);
// Asumir que siempre existe
console.log(client.name);
```

✅ **Bien:**
```typescript
const client = await clientService.get(id);
if (!client) {
  throw new Error('Cliente no encontrado');
}
console.log(client.name);
```

### 3. Usar Tipos

❌ **Mal:**
```typescript
const { data } = await supabase.from('clients').select('*');
// data es any[]
```

✅ **Bien:**
```typescript
import type { Client } from '@/types/supabase';

const { data } = await supabase
  .from('clients')
  .select('*') as { data: Client[] | null };
```

### 4. Soft Delete

❌ **Mal:**
```typescript
await clientService.hardDelete(id);
```

✅ **Bien:**
```typescript
await clientService.softDelete(id);
// Mantiene historial y permite recuperación
```

---

## Recursos Adicionales

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
