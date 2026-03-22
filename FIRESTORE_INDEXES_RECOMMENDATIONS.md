# 📑 ÍNDICES FIRESTORE RECOMENDADOS - FleetEase Manager

**Última actualización:** 2025-12-03

---

## ¿Por qué necesitamos índices compuestos?

Los índices compuestos son necesarios cuando una consulta Firestore incluye:
- Múltiples cláusulas `where()`
- Combinación de `where()` + `orderBy()`
- Múltiples `orderBy()`

Sin el índice correcto, Firestore rechazará la consulta con un error que incluye un enlace para crear el índice automáticamente.

---

## 🔴 ÍNDICES CRÍTICOS (Implementar inmediatamente)

### 1. Financial Records - Query principal
**Consulta actual en `data-provider.tsx:489-494`:**
```typescript
query(
  collection(db, 'financialRecords'),
  where('companyId', '==', companyId),
  orderBy('date', 'desc'),
  limit(3000)
)
```

**Índice requerido:**
```
Collection: financialRecords
Fields:
  - companyId (Ascending)
  - date (Descending)
```

**Impacto:** Esta es una de las consultas más frecuentes. Sin índice, puede ser lenta o fallar.

---

### 2. Clients - Listado activos por empresa
**Consulta común:**
```typescript
query(
  collection(db, 'clients'),
  where('companyId', '==', companyId),
  where('isDeleted', '==', false),
  orderBy('createdAt', 'desc')
)
```

**Índice requerido:**
```
Collection: clients
Fields:
  - companyId (Ascending)
  - isDeleted (Ascending)
  - createdAt (Descending)
```

---

### 3. Vehicles - Filtros avanzados
**Consultas comunes:**
```typescript
// Por empresa, estado y socio
query(
  collection(db, 'vehicles'),
  where('companyId', '==', companyId),
  where('status', '==', 'active'),
  where('partnerId', '==', partnerId)
)

// Por empresa, ordenados por creación
query(
  collection(db, 'vehicles'),
  where('companyId', '==', companyId),
  orderBy('createdAt', 'desc')
)
```

**Índices requeridos:**
```
Índice 1:
Collection: vehicles
Fields:
  - companyId (Ascending)
  - status (Ascending)
  - partnerId (Ascending)

Índice 2:
Collection: vehicles
Fields:
  - companyId (Ascending)
  - createdAt (Descending)
```

---

### 4. Credits - Por empresa y estado
**Consultas comunes:**
```typescript
query(
  collection(db, 'credits'),
  where('companyId', '==', companyId),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc')
)
```

**Índice requerido:**
```
Collection: credits
Fields:
  - companyId (Ascending)
  - status (Ascending)
  - createdAt (Descending)
```

---

## 🟡 ÍNDICES SECUNDARIOS (Implementar en medio plazo)

### 5. Notifications - Por usuario y leídas/no leídas
```
Collection: notifications
Fields:
  - userId (Ascending)
  - isRead (Ascending)
  - createdAt (Descending)
```

---

### 6. Mileage Logs - Por vehículo y fecha
```
Collection: mileageLogs
Fields:
  - vehicleId (Ascending)
  - date (Descending)
```

---

### 7. Company Change Logs - Historial ordenado
```
Collection: companyChangeLogs
Fields:
  - companyId (Ascending)
  - changedAt (Descending)
```

**Nota:** Ya optimizado con `limit(50)` en la consulta.

---

### 8. Client Change Logs - Historial ordenado
```
Collection: clientChangeLogs
Fields:
  - clientId (Ascending)
  - changedAt (Descending)
```

**Nota:** Ya optimizado con `limit(50)` en la consulta.

---

### 9. Generated Reports - Por empresa
```
Collection: generatedReports
Fields:
  - companyId (Ascending)
  - createdAt (Descending)
```

**Nota:** Ya optimizado con `limit(50)` en la consulta.

---

## 🟢 ÍNDICES OPCIONALES (Para optimizaciones futuras)

### 10. Partners - Por empresa y activos
```
Collection: partners
Fields:
  - companyId (Ascending)
  - isDeleted (Ascending)
  - name (Ascending)
```

---

### 11. Vehicle Assignment Logs - Historial de asignaciones
```
Collection: vehicleAssignmentLogs
Fields:
  - vehicleId (Ascending)
  - assignedAt (Descending)
```

---

### 12. Message Logs - Por empresa y usuario
```
Collection: messageLogs
Fields:
  - companyId (Ascending)
  - userId (Ascending)
  - sentAt (Descending)
```

---

## 📝 CÓMO CREAR ÍNDICES

### Opción 1: Desde Firebase Console (Recomendado)

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar proyecto **FleetEase Manager**
3. Ir a **Firestore Database** > **Indexes**
4. Hacer clic en **Create Index**
5. Ingresar:
   - Collection ID
   - Fields (con orden Ascending/Descending)
   - Query scope: **Collection**
6. Hacer clic en **Create**

---

### Opción 2: Usando CLI de Firebase

Crear archivo `firestore.indexes.json` en la raíz del proyecto:

```json
{
  "indexes": [
    {
      "collectionGroup": "financialRecords",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "clients",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "vehicles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "partnerId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "vehicles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "credits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isRead", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "mileageLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "vehicleId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "companyChangeLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "changedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "clientChangeLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "changedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "generatedReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Luego ejecutar:
```bash
firebase deploy --only firestore:indexes
```

---

### Opción 3: Automático desde error

Cuando ejecutas una consulta que requiere un índice, Firestore genera un error con un enlace directo para crear el índice. Simplemente:

1. Copiar el enlace del error
2. Abrirlo en el navegador
3. Hacer clic en "Create Index"
4. Esperar 2-5 minutos para que se construya

---

## ⏱️ TIEMPO DE CONSTRUCCIÓN

- **Índices simples**: 2-5 minutos
- **Índices complejos**: 5-15 minutos
- **Colecciones grandes (>100K docs)**: 30-60 minutos

**Nota:** Los índices se construyen en background. La aplicación seguirá funcionando, pero las consultas que requieren el índice fallarán hasta que termine.

---

## 🔍 MONITOREAR RENDIMIENTO

Después de crear los índices, monitorear en Firebase Console:

1. **Firestore** > **Usage**
   - Ver estadísticas de lecturas/escrituras
   - Identificar picos de uso

2. **Firestore** > **Indexes**
   - Ver estado de índices (Building/Enabled)
   - Identificar índices no utilizados

3. **Performance Monitoring**
   - Habilitar Firebase Performance
   - Monitorear tiempos de carga

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Críticos (Esta semana)
- [ ] Crear índice: `financialRecords` (companyId + date)
- [ ] Crear índice: `clients` (companyId + isDeleted + createdAt)
- [ ] Crear índice: `vehicles` (companyId + status + partnerId)
- [ ] Crear índice: `vehicles` (companyId + createdAt)
- [ ] Crear índice: `credits` (companyId + status + createdAt)

### Fase 2: Secundarios (Próximas 2 semanas)
- [ ] Crear índice: `notifications` (userId + isRead + createdAt)
- [ ] Crear índice: `mileageLogs` (vehicleId + date)
- [ ] Crear índice: `companyChangeLogs` (companyId + changedAt)
- [ ] Crear índice: `clientChangeLogs` (clientId + changedAt)
- [ ] Crear índice: `generatedReports` (companyId + createdAt)

### Fase 3: Opcionales (Cuando sea necesario)
- [ ] Crear índices adicionales según necesidades
- [ ] Revisar índices no utilizados y eliminar

---

## 💡 TIPS PARA OPTIMIZACIÓN

1. **No crear índices innecesarios**: Cada índice aumenta el costo de escrituras
2. **Usar `limit()` siempre**: Reduce lecturas incluso con índices
3. **Monitorear uso**: Firebase Console > Usage para detectar queries costosas
4. **Paginación**: Implementar para listados grandes con `startAfter()`
5. **Caché**: Combinar índices con React Query para reducir lecturas

---

*Generado por Claude Code - Optimización Firestore*
