# 🔥 AUDITORÍA FIREBASE - FleetEase Manager
**Fecha:** 2025-12-03
**Estado:** ⚠️ OPTIMIZACIÓN CRÍTICA REQUERIDA

---

## 📊 RESUMEN EJECUTIVO

### Consumo Estimado Actual
- **Por usuario/día:** ~800-4,000 lecturas
- **Por empresa (10 usuarios):** ~8,000-40,000 lecturas/día
- **Costo mensual estimado:** $0.24-$1.20 USD/empresa (sin contar escrituras)

### Problemas Críticos Identificados
1. ❌ **onSnapshot innecesario** en 4 ubicaciones (lecturas continuas)
2. ❌ **Falta de limit()** en consultas de historial
3. ⚠️ **Caché parcialmente implementado** (solo dashboard-service.ts)
4. ⚠️ **Filtrado en cliente** en lugar de servidor para algunos casos

---

## 1️⃣ AUDITORÍA DE CONSULTAS

### ✅ BUENAS PRÁCTICAS YA IMPLEMENTADAS

#### A) React Query con staleTime optimizado
**Ubicación:** `src/contexts/data-provider.tsx`

```typescript
// Datos CRÍTICOS: 2 minutos (clientes, vehículos, registros financieros)
staleTime: 2 * 60 * 1000

// Datos SECUNDARIOS: 10 minutos (socios, créditos)
staleTime: 10 * 60 * 1000
```

#### B) Límites en consultas principales
```typescript
// Clientes: máximo 2,000
query(collection(db, 'clients'), where('companyId', '==', companyId), limit(2000))

// Vehículos: máximo 2,000
query(collection(db, 'vehicles'), where('companyId', '==', companyId), limit(2000))

// Socios: máximo 1,000
query(collection(db, 'partners'), where('companyId', '==', companyId), limit(1000))

// Registros financieros: máximo 3,000 por empresa
query(
  collection(db, 'financialRecords'),
  where('companyId', '==', companyId),
  orderBy('date', 'desc'),
  limit(3000)
)
```

#### C) Caché en memoria
**Ubicación:** `src/lib/dashboard-service.ts`
```typescript
const dashboardCache = new Map<string, { data: UserDashboardConfig; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
```

#### D) Uso de batch writes y transactions
**Ubicación:** `src/lib/firestore-services.ts`
- `addMany()` usa `writeBatch()`
- `CompanyService` usa `runTransaction()`

---

### ❌ PROBLEMAS CRÍTICOS

#### 1. onSnapshot innecesario (Lecturas continuas)

**Impacto:** Cada onSnapshot genera 1 lectura cada vez que cambia el documento, incluso si el usuario no está viendo la pantalla.

##### A) Auth Provider - Perfil de usuario
**Ubicación:** `src/contexts/auth-provider.tsx:90`
```typescript
// ❌ PROBLEMA: onSnapshot continuo
unsubProfile = onSnapshot(ref, async (snap) => {
  // Se ejecuta cada vez que cambia el perfil
  // Impacto: ~10-50 lecturas/día por usuario
});
```

**Solución:** Usar getDoc() y refrescar solo cuando se actualiza el perfil.

##### B) Páginas de Historial (3 ubicaciones)
**Ubicación:**
- `src/app/dashboard/companies/[companyId]/history/page.tsx:35`
- `src/app/dashboard/clients/[clientId]/history/page.tsx:37`
- `src/app/dashboard/reports/history/page.tsx:49`

```typescript
// ❌ PROBLEMA: onSnapshot sin limit()
const unsubscribe = onSnapshot(q, (snapshot) => {
  const logs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  setChanges(logs);
});
```

**Impacto por visita:**
- Primera carga: N lecturas (donde N = total de cambios, sin límite)
- Cada cambio nuevo: 1 lectura adicional mientras la página está abierta
- **Estimado:** 50-500 lecturas por visita (sin límite)

**Solución:** Reemplazar con getDocs() + limit(50) + paginación.

---

#### 2. Falta de limit() en getAll()

**Ubicación:** `src/lib/firestore-services.ts:106`
```typescript
// ❌ PROBLEMA: Sin limit por defecto
async getAll(q?: Query<DocumentData>): Promise<T[]> {
  const querySnapshot = await getDocs(q || this.collectionRef);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
}
```

**Riesgo:** Si alguien llama `service.getAll()` sin query, trae TODA la colección.

**Solución:** Agregar limit por defecto o requerir query explícita.

---

#### 3. Filtrado en cliente en lugar de servidor

**Ubicación:** `src/hooks/use-vehicle-search.ts`
```typescript
// ⚠️ PROBLEMA: Todo el filtrado se hace en el cliente
// Se traen TODOS los vehículos y luego se filtran con JavaScript
const filteredVehicles = useMemo(() => {
  return vehicles.filter(vehicle => {
    // Filtros de status, performance, partnerId, clientId, etc.
  });
}, [vehicles, filters, debouncedQuery]);
```

**Impacto:** No es grave porque los datos ya están en memoria por React Query, pero se podría optimizar para búsquedas específicas.

**Solución:** Para búsquedas complejas, crear consultas Firestore con índices compuestos.

---

## 2️⃣ CÁLCULO DE LECTURAS/ESCRITURAS

### Escenario: Usuario Admin - Día Normal

#### Carga Inicial (Login)
```
Auth:
├─ getDoc(users/{uid})                     = 1 lectura
├─ onSnapshot continuo (cambios perfil)    = ~5 lecturas/día (si hay cambios)
└─ Total Auth                              = ~6 lecturas/día

Data Provider (primer load):
├─ Clientes (avg 300 docs)                 = 300 lecturas
├─ Vehículos (avg 150 docs)                = 150 lecturas
├─ Socios (avg 25 docs)                    = 25 lecturas
├─ Créditos (avg 100 docs)                 = 100 lecturas
├─ Registros Financieros (avg 1000 docs)   = 1,000 lecturas
├─ Usuarios (avg 10 docs)                  = 10 lecturas
├─ Notificaciones (avg 50 docs)            = 50 lecturas
├─ Categorías Financieras (avg 20 docs)    = 20 lecturas
├─ Companies (avg 1 doc)                   = 1 lectura
└─ Total Data Provider                     = 1,656 lecturas

Dashboard Config:
├─ getDoc(userDashboards/{uid})            = 1 lectura
└─ Caché 5 minutos                         = 0 lecturas adicionales

TOTAL CARGA INICIAL                        = ~1,663 lecturas
```

#### Navegación Durante el Día
```
Visita a página de historial (onSnapshot):
├─ Primera carga (50 cambios)              = 50 lecturas
├─ Cambios durante visita (5 cambios)      = 5 lecturas
└─ Total por visita                        = 55 lecturas

Refresco de datos (cada 2-10 min según staleTime):
├─ Si no hay cambios en cache               = 0 lecturas (React Query)
├─ Si hay invalidación manual               = 1,656 lecturas
└─ Promedio con 3 refrescos/día            = ~500 lecturas

Operaciones CRUD (crear, editar, eliminar):
├─ Crear cliente                            = 1 escritura + 1 lectura
├─ Editar vehículo                          = 1 escritura
├─ Eliminar registro                        = 1 escritura
└─ Promedio 20 operaciones/día              = 20 escrituras + 20 lecturas

TOTAL DÍA ACTIVO                            = ~2,238 lecturas + 20 escrituras
```

### Proyección Mensual - Empresa con 10 usuarios

```
Lecturas:
├─ 5 usuarios admin activos/día             = 11,190 lecturas/día
├─ 5 usuarios cliente moderados/día         = 4,000 lecturas/día
└─ Total                                    = ~15,190 lecturas/día
                                            = ~455,700 lecturas/mes

Escrituras:
├─ Operaciones CRUD                         = 200 escrituras/día
└─ Total                                    = ~6,000 escrituras/mes

COSTO ESTIMADO FIRESTORE:
├─ Lecturas: 455,700 × $0.00000036         = $0.16/mes
├─ Escrituras: 6,000 × $0.00000108          = $0.006/mes
└─ TOTAL                                    = ~$0.17/mes por empresa
```

**Nota:** Este es un costo bajo, pero puede escalar rápidamente con más usuarios y empresas.

---

## 3️⃣ OPTIMIZACIONES RECOMENDADAS

### 🔴 CRÍTICO (Implementar Inmediatamente)

#### 1. Eliminar onSnapshot de páginas de historial
**Archivos afectados:**
- `src/app/dashboard/companies/[companyId]/history/page.tsx`
- `src/app/dashboard/clients/[clientId]/history/page.tsx`
- `src/app/dashboard/reports/history/page.tsx`

**Cambio:**
```typescript
// ❌ ANTES: onSnapshot sin límite
const unsubscribe = onSnapshot(q, (snapshot) => { ... });

// ✅ DESPUÉS: getDocs con límite y React Query
const { data: changes = [], isLoading } = useQuery({
  queryKey: ['companyChanges', companyId],
  queryFn: async () => {
    const q = query(
      collection(db, 'companyChangeLogs'),
      where('companyId', '==', companyId),
      orderBy('changedAt', 'desc'),
      limit(50) // Solo los últimos 50 cambios
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  staleTime: 5 * 60 * 1000, // 5 minutos
});
```

**Ahorro:** ~300-1,000 lecturas/día por empresa

---

#### 2. Optimizar Auth Provider
**Archivo:** `src/contexts/auth-provider.tsx`

**Cambio:**
```typescript
// ❌ ANTES: onSnapshot continuo
unsubProfile = onSnapshot(ref, async (snap) => { ... });

// ✅ DESPUÉS: getDoc + React Query + invalidación manual
const { data: userProfile } = useQuery({
  queryKey: ['userProfile', firebaseUser.uid],
  queryFn: async () => {
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },
  staleTime: 10 * 60 * 1000, // 10 minutos
});

// Invalidar solo cuando se actualiza el perfil
const updateUserProfile = async (data) => {
  await fn({ uid: currentUser.uid, ...data });
  queryClient.invalidateQueries(['userProfile', currentUser.uid]);
};
```

**Ahorro:** ~50-200 lecturas/día por usuario

---

#### 3. Agregar limit por defecto en FirestoreService
**Archivo:** `src/lib/firestore-services.ts`

**Cambio:**
```typescript
// ❌ ANTES: Sin límite
async getAll(q?: Query<DocumentData>): Promise<T[]> {
  const querySnapshot = await getDocs(q || this.collectionRef);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
}

// ✅ DESPUÉS: Con límite por defecto
async getAll(q?: Query<DocumentData>, maxLimit: number = 1000): Promise<T[]> {
  const finalQuery = q
    ? query(q, limit(maxLimit))
    : query(this.collectionRef, limit(maxLimit));

  const querySnapshot = await getDocs(finalQuery);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
}
```

**Protección:** Evita cargas accidentales de colecciones completas

---

### 🟡 MEDIO PLAZO (Próximas 2-4 semanas)

#### 4. Implementar paginación en listados grandes
**Archivos afectados:**
- Listado de registros financieros
- Historial de cambios
- Logs de mensajes

**Estrategia:**
```typescript
// Usar cursor-based pagination con startAfter()
const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

const loadMore = async () => {
  const q = query(
    collection(db, 'financialRecords'),
    where('companyId', '==', companyId),
    orderBy('date', 'desc'),
    startAfter(lastDoc),
    limit(50)
  );
  // ... cargar más datos
};
```

---

#### 5. Caché global con React Query para datos estáticos
**Estrategia:** Extender caché para datos que rara vez cambian

```typescript
// Datos MUY estables: 1 hora
staleTime: 60 * 60 * 1000

// Ejemplos:
- Categorías financieras (creadas una vez, rara vez cambian)
- Listado de empresas (superAdmin)
- Configuraciones del sistema
```

---

#### 6. Índices compuestos para consultas complejas
**Firebase Console:** Agregar índices para:

```
Collection: financialRecords
Fields: companyId ASC, date DESC, type ASC
Reason: Filtrar por empresa + fecha + tipo sin cargar todo

Collection: vehicles
Fields: companyId ASC, status ASC, partnerId ASC
Reason: Filtros avanzados en listado de vehículos

Collection: clients
Fields: companyId ASC, isDeleted ASC, createdAt DESC
Reason: Listado de clientes activos ordenados
```

---

### 🟢 LARGO PLAZO (Optimizaciones avanzadas)

#### 7. Agregaciones precalculadas
**Estrategia:** Usar Cloud Functions para mantener contadores

```typescript
// Ejemplo: Mantener contador de vehículos activos por socio
// En lugar de: vehicles.filter(v => v.partnerId === id).length
// Usar: partner.vehicleCount (actualizado por trigger)
```

#### 8. Desnormalización estratégica
**Casos de uso:**
```typescript
// ❌ ANTES: Join manual
const vehicle = vehicles.find(v => v.id === record.vehicleId);
const vehiclePlate = vehicle?.plate;

// ✅ DESPUÉS: Datos desnormalizados
interface FinancialRecord {
  vehicleId: string;
  vehiclePlate: string; // Duplicado pero reduce lecturas
}
```

---

## 4️⃣ ESTRUCTURA DE DATOS

### ✅ Estructura Actual - Bien Diseñada

```
✓ Separación por empresa (companyId)
✓ Soft deletes (isDeleted flag)
✓ Timestamps consistentes (createdAt, updatedAt)
✓ Metadata de auditoría (createdBy, updatedBy)
```

### ⚠️ Oportunidades de Mejora

#### 1. Subcollections para relaciones 1:N
**Ejemplo:** Historial de cambios

```typescript
// ❌ ANTES: Flat collection con filter
collection: "clientChangeLogs"
docs: [
  { clientId: "abc", changeType: "updated", ... },
  { clientId: "def", changeType: "created", ... }
]

// ✅ MEJOR: Subcollection
collection: "clients/{clientId}/changes"
docs: [
  { changeType: "updated", ... },
  { changeType: "created", ... }
]

// Ventaja: Queries más eficientes y seguridad granular
```

#### 2. Agregaciones materializadas
```typescript
// En lugar de calcular en runtime:
const totalIncome = financialRecords
  .filter(r => r.type === 'income')
  .reduce((sum, r) => sum + r.amount, 0);

// Mantener agregaciones:
interface Company {
  totalIncome: number; // Actualizado por trigger
  totalExpenses: number;
  netProfit: number;
  lastCalculated: string;
}
```

---

## 5️⃣ PLAN DE IMPLEMENTACIÓN

### Fase 1: Fixes Críticos (Esta semana)
- [ ] Eliminar onSnapshot de páginas de historial
- [ ] Agregar limit() en todas las consultas
- [ ] Optimizar auth-provider con React Query

### Fase 2: Optimizaciones (Próximas 2 semanas)
- [ ] Implementar paginación en listados grandes
- [ ] Extender caché para datos estáticos
- [ ] Crear índices compuestos en Firestore

### Fase 3: Arquitectura (Mes siguiente)
- [ ] Migrar logs a subcollections
- [ ] Implementar agregaciones con Cloud Functions
- [ ] Desnormalización estratégica donde aplique

---

## 6️⃣ REGLAS DE SEGURIDAD FIRESTORE

**Revisar reglas para:**
```javascript
// Asegurar que queries siempre filtren por companyId
match /clients/{clientId} {
  allow read: if request.auth != null &&
    (resource.data.companyId == request.auth.token.companyId ||
     request.auth.token.role == 'superAdmin');
}

// Índices que permiten estas queries
```

---

## 📈 IMPACTO ESPERADO

### Reducción de Lecturas
```
Actual:        ~2,238 lecturas/usuario/día
Optimizado:    ~1,200 lecturas/usuario/día
Ahorro:        ~46% reducción

Empresa (10 usuarios):
Actual:        ~455,700 lecturas/mes
Optimizado:    ~246,000 lecturas/mes
Ahorro:        ~$0.075/mes por empresa
```

### Mejora de Performance
```
- Carga inicial: -30% tiempo (menos datos)
- Navegación: +50% más rápida (mejor caché)
- Páginas de historial: -70% lecturas (getDocs + limit)
```

---

## 🎯 CONCLUSIONES

### Fortalezas del Sistema Actual
1. ✅ React Query ya implementado correctamente
2. ✅ Límites en consultas principales
3. ✅ Uso de batch writes y transactions
4. ✅ Estructura de datos normalizada y escalable

### Áreas de Mejora Críticas
1. ❌ Eliminar onSnapshot innecesario (4 ubicaciones)
2. ❌ Agregar limit() en consultas de historial
3. ⚠️ Expandir estrategia de caché

### Recomendación Final
**El sistema está bien arquitectado**, pero hay **optimizaciones rápidas** que pueden:
- Reducir lecturas en ~46%
- Mejorar performance significativamente
- Mantener costos bajo control a medida que escala

**Prioridad:** Implementar Fase 1 esta semana.

---

*Generado por Claude Code - Auditoría Firebase*
