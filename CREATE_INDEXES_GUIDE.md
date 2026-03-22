# 📑 GUÍA PASO A PASO: Crear Índices en Firebase Console

## 🎯 Índices Críticos (Crear HOY)

### 1️⃣ Índice: Financial Records (companyId + date)

**Por qué lo necesitas:** Query más frecuente - registros financieros por empresa ordenados por fecha

**Pasos:**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto **FleetEase Manager**
3. Click en **Firestore Database** (menú izquierdo)
4. Click en pestaña **Indexes**
5. Click en **Create Index** (botón azul)
6. Ingresa:
   ```
   Collection ID: financialRecords
   ```
7. En **Fields to index:**
   - Field: `companyId` → Order: **Ascending** → Click **Add**
   - Field: `date` → Order: **Descending** → Click **Add**
8. Query scope: **Collection** (ya seleccionado)
9. Click **Create**
10. ⏳ Espera 2-5 minutos (verás estado "Building...")

---

### 2️⃣ Índice: Clients (companyId + isDeleted + createdAt)

**Por qué lo necesitas:** Listar clientes activos por empresa

**Pasos:**
1. En **Firestore Database** > **Indexes** > **Create Index**
2. Ingresa:
   ```
   Collection ID: clients
   ```
3. En **Fields to index:**
   - Field: `companyId` → Order: **Ascending** → Click **Add**
   - Field: `isDeleted` → Order: **Ascending** → Click **Add**
   - Field: `createdAt` → Order: **Descending** → Click **Add**
4. Click **Create**
5. ⏳ Espera 2-5 minutos

---

### 3️⃣ Índice: Vehicles (companyId + status + partnerId)

**Por qué lo necesitas:** Filtros avanzados en listado de vehículos

**Pasos:**
1. En **Firestore Database** > **Indexes** > **Create Index**
2. Ingresa:
   ```
   Collection ID: vehicles
   ```
3. En **Fields to index:**
   - Field: `companyId` → Order: **Ascending** → Click **Add**
   - Field: `status` → Order: **Ascending** → Click **Add**
   - Field: `partnerId` → Order: **Ascending** → Click **Add**
4. Click **Create**
5. ⏳ Espera 2-5 minutos

---

### 4️⃣ Índice: Vehicles (companyId + createdAt)

**Por qué lo necesitas:** Listar vehículos por empresa ordenados por fecha

**Pasos:**
1. En **Firestore Database** > **Indexes** > **Create Index**
2. Ingresa:
   ```
   Collection ID: vehicles
   ```
3. En **Fields to index:**
   - Field: `companyId` → Order: **Ascending** → Click **Add**
   - Field: `createdAt` → Order: **Descending** → Click **Add**
4. Click **Create**
5. ⏳ Espera 2-5 minutos

---

### 5️⃣ Índice: Credits (companyId + status + createdAt)

**Por qué lo necesitas:** Filtrar créditos activos por empresa

**Pasos:**
1. En **Firestore Database** > **Indexes** > **Create Index**
2. Ingresa:
   ```
   Collection ID: credits
   ```
3. En **Fields to index:**
   - Field: `companyId` → Order: **Ascending** → Click **Add**
   - Field: `status` → Order: **Ascending** → Click **Add**
   - Field: `createdAt` → Order: **Descending** → Click **Add**
4. Click **Create**
5. ⏳ Espera 2-5 minutos

---

## ✅ Checklist de Índices Críticos

Copia y pega esto en tus notas para hacer seguimiento:

```
[ ] financialRecords (companyId ASC, date DESC)
[ ] clients (companyId ASC, isDeleted ASC, createdAt DESC)
[ ] vehicles (companyId ASC, status ASC, partnerId ASC)
[ ] vehicles (companyId ASC, createdAt DESC)
[ ] credits (companyId ASC, status ASC, createdAt DESC)
```

---

## ⏱️ Tiempos de Construcción

- **Colecciones pequeñas (<1,000 docs):** 2-5 minutos
- **Colecciones medianas (1,000-10,000 docs):** 5-15 minutos
- **Colecciones grandes (>10,000 docs):** 15-60 minutos

**Nota:** Puedes crear todos los índices en paralelo. No necesitas esperar a que termine uno para crear el siguiente.

---

## 🔍 Verificar que los Índices están listos

1. Ve a **Firestore Database** > **Indexes**
2. Verás una lista de todos los índices
3. Estado debe ser **Enabled** (verde)
4. Si dice **Building** (amarillo), espera unos minutos más

---

## 🎯 Índices Secundarios (Opcional - Crear próxima semana)

### 6️⃣ Notifications (userId + isRead + createdAt)
```
Collection: notifications
Fields:
  - userId: Ascending
  - isRead: Ascending
  - createdAt: Descending
```

### 7️⃣ Mileage Logs (vehicleId + date)
```
Collection: mileageLogs
Fields:
  - vehicleId: Ascending
  - date: Descending
```

### 8️⃣ Company Change Logs (companyId + changedAt)
```
Collection: companyChangeLogs
Fields:
  - companyId: Ascending
  - changedAt: Descending
```

### 9️⃣ Client Change Logs (clientId + changedAt)
```
Collection: clientChangeLogs
Fields:
  - clientId: Ascending
  - changedAt: Descending
```

### 🔟 Generated Reports (companyId + createdAt)
```
Collection: generatedReports
Fields:
  - companyId: Ascending
  - createdAt: Descending
```

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si me equivoco al crear un índice?
Puedes eliminarlo desde la misma página de **Indexes** y crearlo de nuevo. No afecta tus datos.

### ¿Los índices cuestan dinero?
Sí, pero muy poco:
- Costo de almacenamiento de índices es mínimo (~$0.18/GB/mes)
- La mayoría de proyectos pequeños pagan <$0.01/mes por índices
- **El beneficio en performance supera ampliamente el costo**

### ¿Puedo crear índices mientras la app está en producción?
Sí, Firebase construye los índices en background. La app sigue funcionando normalmente.

### ¿Qué pasa si hago un query que necesita un índice que no existe?
Firebase te mostrará un error con un **enlace directo** para crear el índice automáticamente. Ejemplo:
```
The query requires an index. You can create it here:
https://console.firebase.google.com/project/.../indexes?create_composite=...
```
Solo haz clic en el enlace y el índice se creará automáticamente.

---

## 🎉 ¡Listo!

Una vez que los 5 índices críticos estén en estado **Enabled**, tu app tendrá:
- ✅ Queries 5-10x más rápidas
- ✅ Capacidad de escalar a más datos
- ✅ Mejores experiencia de usuario

**Tiempo total estimado:** 15 minutos de trabajo + 10-30 minutos de construcción automática

---

*Generado por Claude Code - Guía de Índices Firestore*
