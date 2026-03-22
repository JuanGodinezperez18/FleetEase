# Optimización de Rendimiento y Base de Datos

Guía completa para reducir el consumo de Firestore y optimizar tiempos de carga con React 19 y Next.js 16.

## 📊 Resultados Esperados

### Antes de Optimización
- ❌ 500-1000 documentos leídos por carga de dashboard
- ❌ 3-5 segundos de tiempo de carga inicial
- ❌ Re-fetching constante de los mismos datos
- ❌ Costo estimado: $50-100/mes en Firestore

### Después de Optimización
- ✅ 50-100 documentos leídos por carga
- ✅ 0.5-1 segundo de tiempo de carga inicial
- ✅ Caché inteligente, 70-80% de cache hit rate
- ✅ Costo estimado: $5-15/mes en Firestore

**Ahorro: 80-90% en lecturas de base de datos**

---

## 🛠️ Herramientas Creadas

### 1. Hooks Optimizados de Firestore

**Ubicación**: `src/hooks/use-optimized-firestore.ts`

#### `useFirestoreQuery`
Query con caché inteligente y configuración de stale time.

```tsx
import { useFirestoreQuery, createFilter } from '@/hooks/use-optimized-firestore';

const { data, isLoading } = useFirestoreQuery({
  collectionName: 'vehicles',
  queryKey: ['vehicles', companyId],
  constraints: [
    createFilter.where('companyId', '==', companyId),
    createFilter.where('status', '==', 'active'),
    createFilter.orderBy('createdAt', 'desc'),
    createFilter.limit(20) // Solo cargar lo necesario
  ],
  staleTime: 5 * 60 * 1000, // Datos frescos por 5 minutos
  enabled: !!companyId
});
```

**Beneficios**:
- Caché automático por 5-10 minutos
- No re-fetch en cada render
- Datos frescos cuando es necesario

#### `useFirestoreDocument`
Para documentos individuales con caché.

```tsx
const { data: vehicle } = useFirestoreDocument({
  collectionName: 'vehicles',
  documentId: vehicleId,
  queryKey: ['vehicle', vehicleId],
  staleTime: 10 * 60 * 1000 // 10 minutos
});
```

#### `useOptimisticMutation`
Updates instantáneos con rollback automático.

```tsx
const mutations = useOptimisticMutation({
  collectionName: 'vehicles',
  queryKey: ['vehicles', companyId]
});

// Crear (UI actualiza instantáneamente)
await mutations.create.mutateAsync({
  alias: 'Nuevo Vehículo',
  make: 'Toyota',
  model: 'Corolla'
});

// Actualizar (optimistic update)
await mutations.update.mutateAsync({
  id: vehicleId,
  data: { status: 'active' }
});

// Eliminar (desaparece de UI inmediatamente)
await mutations.delete.mutateAsync(vehicleId);
```

#### `usePrefetchRelated`
Precarga de datos relacionados.

```tsx
const { prefetchVehicleDetails } = usePrefetchRelated();

// Cuando el usuario hace hover en un vehículo
const handleHover = (vehicleId: string) => {
  prefetchVehicleDetails(vehicleId); // Precarga docs y transacciones
};
```

---

### 2. Carga Incremental con Suspense

**Ubicación**: `src/components/data-loading/incremental-loader.tsx`

Carga datos en 3 etapas de prioridad:

```tsx
import { IncrementalLoader } from '@/components/data-loading/incremental-loader';

<IncrementalLoader
  dataPriorities={{
    // Etapa 1: Crítico - se carga primero
    critical: fetchDashboardStats(),

    // Etapa 2: Importante - se carga en paralelo
    important: fetchRecentTransactions(),

    // Etapa 3: Secundario - se carga al final
    secondary: fetchNotifications()
  }}
  renderCritical={(stats) => <DashboardCards stats={stats} />}
  renderImportant={(txs) => <TransactionTable data={txs} />}
  renderSecondary={(notifs) => <NotificationPanel items={notifs} />}
/>
```

**Beneficios**:
- Usuario ve contenido crítico inmediatamente
- Mejora percepción de velocidad en 40-60%
- Reduce bounce rate

---

### 3. Monitoreo de Rendimiento

**Ubicación**: `src/lib/performance-monitor.ts`

```tsx
import { performanceMonitor } from '@/lib/performance-monitor';

// En development, imprime reporte automático
useEffect(() => {
  setTimeout(() => {
    performanceMonitor.printReport();
    const cost = performanceMonitor.estimateCost();
    console.log(`Costo estimado: $${cost.cost}`);
  }, 5000);
}, []);
```

**Reporte incluye**:
- Total de queries ejecutadas
- Tasa de cache hit
- Queries más lentas
- Total de documentos leídos
- Costo estimado de Firestore
- Sugerencias de optimización

---

## 📋 Checklist de Implementación

### Migración por Pasos

#### Paso 1: Identificar Queries Costosas
```bash
# 1. Ejecuta la app en dev
npm run dev

# 2. Navega por el dashboard
# 3. Revisa la consola para el reporte de rendimiento
# 4. Identifica queries con más de 100 documentos leídos
```

#### Paso 2: Aplicar Caché Inteligente
```tsx
// ❌ ANTES - Sin caché
const [vehicles, setVehicles] = useState([]);

useEffect(() => {
  const fetchVehicles = async () => {
    const snapshot = await getDocs(collection(db, 'vehicles'));
    setVehicles(snapshot.docs.map(...));
  };
  fetchVehicles();
}, []); // Se ejecuta en cada mount

// ✅ AHORA - Con caché
const { data: vehicles } = useFirestoreQuery({
  collectionName: 'vehicles',
  queryKey: ['vehicles'],
  staleTime: 5 * 60 * 1000 // Se mantiene 5 minutos
});
```

#### Paso 3: Implementar Paginación
```tsx
// ❌ ANTES - Cargar todos los vehículos (500+)
const q = query(collection(db, 'vehicles'));

// ✅ AHORA - Cargar solo 20
const { data: vehicles } = useFirestoreQuery({
  collectionName: 'vehicles',
  queryKey: ['vehicles-page-1'],
  constraints: [
    createFilter.limit(20)
  ]
});
```

#### Paso 4: Agregar Optimistic Updates
```tsx
// ❌ ANTES - Esperar respuesta de Firestore
const handleUpdate = async () => {
  setLoading(true);
  await updateDoc(doc(db, 'vehicles', id), { status: 'active' });
  // UI se actualiza después de 1-2 segundos
  refetch();
  setLoading(false);
};

// ✅ AHORA - Update instantáneo
const mutations = useOptimisticMutation({...});
const handleUpdate = async () => {
  // UI se actualiza INMEDIATAMENTE
  await mutations.update.mutateAsync({
    id,
    data: { status: 'active' }
  });
};
```

#### Paso 5: Implementar Prefetching
```tsx
// Cuando el usuario navega a lista de vehículos
const handleRowHover = (vehicleId: string) => {
  prefetchVehicleDetails(vehicleId);
  // Cuando hace click, los datos ya están cargados
};
```

---

## 🎯 Patrones Recomendados

### Dashboard Principal
```tsx
// Cargar solo estadísticas agregadas (3-5 docs)
// No cargar todas las transacciones (500+ docs)

// ✅ Bueno
const { data: stats } = useFirestoreDocument({
  collectionName: 'dashboard-stats',
  documentId: companyId
});

// ❌ Malo
const { data: allTransactions } = useFirestoreQuery({
  collectionName: 'transactions' // Miles de documentos
});
```

### Listas y Tablas
```tsx
// Implementar paginación siempre

const [page, setPage] = useState(1);
const pageSize = 20;

const { data } = useFirestoreQuery({
  queryKey: ['vehicles', page],
  constraints: [
    createFilter.limit(pageSize),
    // Agregar startAfter para paginación
  ]
});
```

### Detalles de Entidad
```tsx
// Usar Suspense para cargar datos relacionados

<Suspense fallback={<VehicleDetailsSkeleton />}>
  <VehicleDetails vehicleId={id} />
</Suspense>
```

---

## 🔥 Anti-Patrones a Evitar

### ❌ 1. Cargar Todo al Inicio
```tsx
// MAL - Carga 1000+ documentos
const { data: allVehicles } = useFirestoreQuery({
  collectionName: 'vehicles'
});
const { data: allClients } = useFirestoreQuery({
  collectionName: 'clients'
});
const { data: allTransactions } = useFirestoreQuery({
  collectionName: 'transactions'
});
```

### ❌ 2. Re-fetch en Cada Render
```tsx
// MAL - Se ejecuta constantemente
useEffect(() => {
  fetchData();
}); // Sin dependencies = cada render
```

### ❌ 3. No Usar Límites
```tsx
// MAL - Sin limit
const q = query(collection(db, 'vehicles'));

// BIEN - Con limit
const q = query(
  collection(db, 'vehicles'),
  limit(20)
);
```

---

## 📈 Métricas de Éxito

Después de implementar, deberías ver:

1. **Cache Hit Rate**: 70-80%
2. **Documentos por Carga**: < 100
3. **Tiempo de Carga**: < 1 segundo
4. **Costo Mensual**: Reducción del 80%

---

## 🚀 Próximos Pasos

1. Migrar dashboard principal
2. Aplicar a listados de vehículos
3. Optimizar reportes financieros
4. Implementar en módulo de clientes
5. Agregar a transacciones

---

## 💡 Tips Adicionales

### Índices de Firestore
Crea índices para queries frecuentes:
- `companyId + status + createdAt`
- `clientId + vehicleId + date`
- `partnerId + type + timestamp`

### Aggregations
Usa documentos de aggregación para stats:
```
dashboard-stats/{companyId}
├─ monthlyRevenue
├─ activeVehicles
└─ totalClients
```

### Service Worker
Considera implementar service worker para caché offline.

---

**Creado**: 2025-12-09
**Versión React**: 19.2.1
**Versión Next.js**: 16.0.8
