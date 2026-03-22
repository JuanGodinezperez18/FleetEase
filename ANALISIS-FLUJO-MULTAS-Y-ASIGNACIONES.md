# Análisis del Flujo de Multas y Asignaciones de Vehículos

## 📋 Estado Actual del Sistema

### 1. Flujo de Registro de Multas

#### Cómo funciona actualmente:

1. **Formulario de Multa** (`src/app/dashboard/multas/components/multa-form.tsx`)
   - Usuario selecciona vehículo
   - Usuario ingresa fecha de infracción
   - Sistema busca automáticamente al cliente responsable usando 2 métodos:
     - **Método 1**: Busca en `vehicleAssignmentLogs` (historial de asignaciones)
     - **Método 2**: Busca directamente en `clients` por `assignedVehicleId` y `vehicleAssignedAt`

2. **Asignación Automática de Cliente**
   - Compara `fechaInfraccion` con `vehicleAssignedAt`
   - Valida que la fecha de asignación sea **anterior o igual** a la fecha de la multa
   - Si hay múltiples asignaciones, selecciona la más reciente

3. **Guardar Multa**
   ```typescript
   const multaData = {
     vehicleId,
     clientId,  // ← Cliente encontrado automáticamente
     fechaInfraccion,
     importe,
     recargos,
     total,
     status: 'pendiente',  // ← Siempre inicia como pendiente
     asignadoAutomaticamente: true
   }
   ```

#### ⚠️ PROBLEMAS ACTUALES:

1. **NO se agrega al balance del cliente automáticamente**
   - La multa se registra pero NO afecta el balance
   - No hay integración con el sistema de finanzas

2. **NO hay forma de marcar como pagada desde ingresos**
   - Solo se puede cambiar el estado desde el formulario de multas
   - No existe categoría "Pago de Multas"

3. **NO hay relación entre multa pagada y registro financiero**
   - Si se marca como pagada, no se crea un registro de ingreso

---

### 2. Flujo de Asignación de Vehículos

#### Cómo funciona actualmente:

**Formulario de Cliente** (`src/app/dashboard/clients/components/client-form.tsx`):
```typescript
// Línea ~150
<Select onValueChange={(value) => setValue('assignedVehicleId', value)}>
  {selectableVehicles.map(vehicle => (
    <SelectItem value={vehicle.id}>{vehicle.alias}</SelectItem>
  ))}
</Select>

// Campo de fecha (línea ~200)
<Input
  type="date"
  {...register('vehicleAssignedAt')}
  disabled={!watch('assignedVehicleId') || !!initialData}
/>
```

**Formulario de Vehículo** (ubicación a verificar):
- Presumiblemente también tiene selector de cliente
- ¿Crea registro en `vehicleAssignmentLogs`?

#### ⚠️ PROBLEMAS ACTUALES:

1. **Campo de fecha manual sin inteligencia**
   - Campo `vehicleAssignedAt` se habilita manualmente
   - NO busca si ya existe una fecha previa
   - NO valida si es una reasignación del mismo vehículo

2. **Posible duplicación de lógica**
   - Dos formularios pueden asignar vehículos
   - ¿Ambos crean registros en `vehicleAssignmentLogs`?
   - Riesgo de inconsistencias

3. **Historial incompleto**
   - Si la asignación se hace desde el formulario de cliente pero NO se crea un log
   - El sistema de multas puede no encontrar al cliente responsable

---

## 🎯 Mejoras Propuestas

### MEJORA 1: Sistema de Balance Automático para Multas

#### Implementación:

```typescript
// En addMulta() dentro de data-provider.tsx
async function addMulta(multaData) {
  const transaction = runTransaction(db, async (transaction) => {
    // 1. Crear la multa
    const multaRef = doc(collection(db, 'multas'));
    transaction.set(multaRef, multaData);

    // 2. Actualizar balance del cliente (suma el total de la multa)
    const clientRef = doc(db, 'clients', multaData.clientId);
    const clientSnap = await transaction.get(clientRef);
    const currentBalance = clientSnap.data()?.balance || 0;

    transaction.update(clientRef, {
      balance: currentBalance + multaData.total
    });

    // 3. Crear registro financiero (income) automático
    const finRecordRef = doc(collection(db, 'financialRecords'));
    transaction.set(finRecordRef, {
      clientId: multaData.clientId,
      vehicleId: multaData.vehicleId,
      categoryId: MULTA_CATEGORY_ID,  // ← Nueva categoría
      category: 'Multa',
      type: 'income',
      amount: multaData.total,
      description: `Multa: ${multaData.descripcion}`,
      date: multaData.fechaInfraccion,
      multaId: multaRef.id,  // ← Relación con la multa
      isPending: true,  // ← Marca como pendiente hasta que se pague
      isDeleted: false,
      createdAt: new Date().toISOString(),
      companyId: multaData.companyId
    });
  });
}
```

**Beneficios:**
- ✅ Balance del cliente se actualiza automáticamente
- ✅ Se crea registro financiero vinculado
- ✅ Trazabilidad completa
- ✅ Evita errores manuales

---

### MEJORA 2: Categoría "Pago de Multas" en Sistema Financiero

#### 1. Crear categoría del sistema:

```typescript
// En data-provider.tsx, función ensureSystemCategories()
const multaCategorias = [
  {
    name: 'Multa',
    type: 'income',
    affects: 'client_balance',
    isDefault: true,
    description: 'Registro automático de multas de tránsito'
  },
  {
    name: 'Pago de Multa',
    type: 'payment',
    affects: 'client_balance',
    isDefault: true,
    description: 'Pago de multas de tránsito por parte del cliente'
  }
];
```

#### 2. Modificar formulario de ingresos:

```typescript
// En el formulario de pagos/ingresos

// Cuando se selecciona categoría "Pago de Multa"
if (selectedCategory === 'Pago de Multa') {
  // Filtrar solo clientes con multas pendientes
  const clientsWithPendingMultas = clients.filter(client => {
    const hasPendingMultas = multas.some(m =>
      m.clientId === client.id &&
      m.status === 'pendiente' &&
      !m.isDeleted
    );
    return hasPendingMultas;
  });

  // Mostrar selector de clientes filtrado
  <Select onValueChange={setSelectedClient}>
    {clientsWithPendingMultas.map(client => (
      <SelectItem value={client.id}>
        {client.firstname} {client.lastname} - {getMultasCount(client.id)} multa(s)
      </SelectItem>
    ))}
  </Select>

  // Si el cliente tiene múltiples multas, mostrar selector
  if (clientMultas.length > 1) {
    <Select onValueChange={setSelectedMulta}>
      {clientMultas.map(multa => (
        <SelectItem value={multa.id}>
          Folio: {multa.folio} - ${multa.total} - {multa.fechaInfraccion}
        </SelectItem>
      ))}
    </Select>
  } else {
    // Auto-seleccionar la única multa
    setSelectedMulta(clientMultas[0].id);
  }
}
```

#### 3. Lógica al guardar pago de multa:

```typescript
async function savePagoMulta(data) {
  const transaction = runTransaction(db, async (transaction) => {
    // 1. Crear registro de pago
    const paymentRef = doc(collection(db, 'financialRecords'));
    transaction.set(paymentRef, {
      ...data,
      multaId: selectedMultaId,
      type: 'payment',
      isPending: false
    });

    // 2. Actualizar estado de la multa
    const multaRef = doc(db, 'multas', selectedMultaId);
    transaction.update(multaRef, {
      status: 'pagada',
      fechaPago: data.date
    });

    // 3. Actualizar el registro financiero original (marcar como pagado)
    const finRecordSnapshot = await getDocs(
      query(collection(db, 'financialRecords'),
        where('multaId', '==', selectedMultaId),
        where('type', '==', 'income')
      )
    );

    if (!finRecordSnapshot.empty) {
      const finRecordRef = finRecordSnapshot.docs[0].ref;
      transaction.update(finRecordRef, {
        isPending: false,
        paidAt: data.date
      });
    }

    // 4. Balance del cliente se ajusta automáticamente por el sistema de pagos
  });
}
```

---

### MEJORA 3: Campo Inteligente de Fecha de Asignación

#### Implementación en ClientForm:

```typescript
// Hook para manejar la lógica del campo de fecha
const useIntelligentVehicleAssignmentDate = (clientId, selectedVehicleId) => {
  const [assignmentDate, setAssignmentDate] = useState<string | null>(null);
  const [isDateLocked, setIsDateLocked] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState<VehicleAssignmentLog[]>([]);

  useEffect(() => {
    if (!selectedVehicleId || !clientId) {
      setAssignmentDate(null);
      setIsDateLocked(false);
      return;
    }

    // Buscar historial de asignaciones de ESTE cliente con ESTE vehículo
    const history = vehicleAssignmentLogs.filter(log =>
      log.vehicleId === selectedVehicleId &&
      log.clientId === clientId
    ).sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    setAssignmentHistory(history);

    if (history.length > 0) {
      // YA existe historial de este cliente con este vehículo

      // Si es la asignación actual (última sin unassignedAt)
      const currentAssignment = history.find(h => !h.unassignedAt);

      if (currentAssignment) {
        // Es la asignación actual, usar esa fecha
        setAssignmentDate(currentAssignment.assignedAt);
        setIsDateLocked(true);  // ← BLOQUEAR para evitar confusión
      } else {
        // Es una REASIGNACIÓN (ya estuvo asignado antes)
        // Permitir nueva fecha pero advertir al usuario
        setAssignmentDate(null);
        setIsDateLocked(false);
        toast.info('Reasignación detectada', {
          description: `Este vehículo ya fue asignado a este cliente ${history.length} vez/veces anteriormente.`
        });
      }
    } else {
      // Primera vez que se asigna este vehículo a este cliente
      setAssignmentDate(null);
      setIsDateLocked(false);
    }
  }, [clientId, selectedVehicleId, vehicleAssignmentLogs]);

  return { assignmentDate, isDateLocked, assignmentHistory };
};

// Uso en el formulario:
const { assignmentDate, isDateLocked, assignmentHistory } = useIntelligentVehicleAssignmentDate(
  initialData?.id,
  watch('assignedVehicleId')
);

// Renderizado del campo:
<div className="space-y-2">
  <Label>Fecha de Asignación del Vehículo</Label>

  {assignmentHistory.length > 0 && (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        Este vehículo ha sido asignado a este cliente {assignmentHistory.length} vez/veces.
        {isDateLocked && ' Fecha bloqueada (asignación actual).'}
      </AlertDescription>
    </Alert>
  )}

  <Input
    type="date"
    value={assignmentDate || watch('vehicleAssignedAt') || ''}
    onChange={(e) => setValue('vehicleAssignedAt', e.target.value)}
    disabled={!watch('assignedVehicleId') || isDateLocked}
    className={isDateLocked ? 'bg-muted cursor-not-allowed' : ''}
  />

  {isDateLocked && (
    <p className="text-xs text-muted-foreground">
      Esta fecha está bloqueada porque corresponde a la asignación actual.
    </p>
  )}
</div>
```

**Beneficios:**
- ✅ Detecta si ya existe una fecha previa
- ✅ Bloquea el campo si es asignación actual
- ✅ Alerta al usuario en caso de reasignación
- ✅ Previene confusiones con múltiples asignaciones

---

### MEJORA 4: Sincronización de Asignaciones entre Formularios

#### Problema:
- Formulario de Cliente puede asignar vehículo
- Formulario de Vehículo puede asignar cliente
- Puede haber inconsistencias en `vehicleAssignmentLogs`

#### Solución: Función Centralizada

```typescript
// En data-provider.tsx

async function assignVehicleToClient(
  clientId: string,
  vehicleId: string,
  assignedBy: string,
  assignedAt?: string,
  reason?: string
) {
  return runTransaction(db, async (transaction) => {
    const clientRef = doc(db, 'clients', clientId);
    const vehicleRef = doc(db, 'vehicles', vehicleId);

    // 1. Obtener datos actuales
    const clientSnap = await transaction.get(clientRef);
    const vehicleSnap = await transaction.get(vehicleRef);

    const client = clientSnap.data();
    const vehicle = vehicleSnap.data();

    if (!client || !vehicle) {
      throw new Error('Cliente o vehículo no encontrado');
    }

    // 2. Desasignar vehículo anterior del cliente (si existe)
    if (client.assignedVehicleId && client.assignedVehicleId !== vehicleId) {
      const oldVehicleRef = doc(db, 'vehicles', client.assignedVehicleId);
      transaction.update(oldVehicleRef, {
        clientId: null,
        status: 'active',
        updatedAt: new Date().toISOString()
      });

      // Cerrar el log anterior
      const oldLogs = await getDocs(
        query(
          collection(db, 'vehicleAssignmentLogs'),
          where('clientId', '==', clientId),
          where('vehicleId', '==', client.assignedVehicleId),
          where('unassignedAt', '==', null)
        )
      );

      oldLogs.forEach(logDoc => {
        transaction.update(logDoc.ref, {
          unassignedAt: new Date().toISOString()
        });
      });
    }

    // 3. Desasignar cliente anterior del vehículo (si existe)
    if (vehicle.clientId && vehicle.clientId !== clientId) {
      const oldClientRef = doc(db, 'clients', vehicle.clientId);
      transaction.update(oldClientRef, {
        assignedVehicleId: null,
        vehicleAssignedAt: null,
        updatedAt: new Date().toISOString()
      });

      // Cerrar el log del cliente anterior
      const oldClientLogs = await getDocs(
        query(
          collection(db, 'vehicleAssignmentLogs'),
          where('clientId', '==', vehicle.clientId),
          where('vehicleId', '==', vehicleId),
          where('unassignedAt', '==', null)
        )
      );

      oldClientLogs.forEach(logDoc => {
        transaction.update(logDoc.ref, {
          unassignedAt: new Date().toISOString()
        });
      });
    }

    // 4. Crear nueva asignación
    const assignmentDate = assignedAt || new Date().toISOString().split('T')[0];

    // Actualizar cliente
    transaction.update(clientRef, {
      assignedVehicleId: vehicleId,
      vehicleAssignedAt: assignmentDate,
      updatedAt: new Date().toISOString()
    });

    // Actualizar vehículo
    transaction.update(vehicleRef, {
      clientId: clientId,
      status: 'rented',
      updatedAt: new Date().toISOString()
    });

    // Crear log de asignación
    const logRef = doc(collection(db, 'vehicleAssignmentLogs'));
    transaction.set(logRef, {
      vehicleId,
      clientId,
      partnerId: vehicle.partnerId,
      companyId: client.companyId || vehicle.companyId,
      assignedAt: assignmentDate,
      unassignedAt: null,
      assignedBy,
      reason: reason || 'Asignación manual',
      createdAt: new Date().toISOString()
    });

    // Log de cambio del cliente
    await logClientChange(
      transaction,
      clientId,
      'vehicle_assigned',
      assignedBy,
      'Sistema',
      `Vehículo ${vehicle.alias} (${vehicle.plate}) asignado al cliente`,
      'assignedVehicleId',
      client.assignedVehicleId,
      vehicleId
    );
  });
}

// Función para desasignar
async function unassignVehicleFromClient(
  clientId: string,
  vehicleId: string,
  unassignedBy: string,
  reason?: string
) {
  return runTransaction(db, async (transaction) => {
    // Similar lógica pero para desasignar...
  });
}
```

#### Uso en formularios:

```typescript
// En ClientForm:
const handleVehicleAssignment = async (vehicleId: string) => {
  if (!vehicleId || vehicleId === NONE_SELECT_VALUE) {
    // Desasignar
    if (initialData?.assignedVehicleId) {
      await unassignVehicleFromClient(
        initialData.id,
        initialData.assignedVehicleId,
        currentUser.uid,
        'Desasignado desde formulario de cliente'
      );
    }
  } else {
    // Asignar
    await assignVehicleToClient(
      initialData.id,
      vehicleId,
      currentUser.uid,
      watch('vehicleAssignedAt'),
      'Asignado desde formulario de cliente'
    );
  }
};

// En VehicleForm:
const handleClientAssignment = async (clientId: string) => {
  if (clientId) {
    await assignVehicleToClient(
      clientId,
      vehicleId,
      currentUser.uid,
      undefined,  // ← Toma fecha automática
      'Asignado desde formulario de vehículo'
    );
  }
};
```

**Beneficios:**
- ✅ Una sola fuente de verdad
- ✅ Siempre crea logs de asignación
- ✅ Previene inconsistencias
- ✅ Historial completo y preciso
- ✅ Funciona desde ambos formularios

---

## 📊 Resumen de Cambios Necesarios

### Archivos a Modificar:

1. **`src/contexts/data-provider.tsx`**
   - ✅ Agregar `addMulta()` con lógica de balance
   - ✅ Agregar categorías de sistema para multas
   - ✅ Implementar `assignVehicleToClient()` centralizada
   - ✅ Implementar `unassignVehicleFromClient()` centralizada

2. **`src/app/dashboard/multas/components/multa-form.tsx`**
   - ⚠️ Ya mejorado (búsqueda de cliente)
   - Llamar a `addMulta()` que maneja balance

3. **`src/app/dashboard/finanzas/income/page.tsx`** (o componente de pagos)
   - ✅ Agregar lógica para categoría "Pago de Multa"
   - ✅ Filtrar clientes con multas pendientes
   - ✅ Mostrar selector de multas si el cliente tiene múltiples
   - ✅ Vincular pago con multa y actualizar estado

4. **`src/app/dashboard/clients/components/client-form.tsx`**
   - ✅ Implementar hook `useIntelligentVehicleAssignmentDate`
   - ✅ Usar función centralizada `assignVehicleToClient()`
   - ✅ Agregar alertas de reasignación

5. **`src/app/dashboard/vehicles/components/vehicle-form.tsx`**
   - ✅ Usar función centralizada `assignVehicleToClient()`
   - ✅ Eliminar lógica duplicada de asignación

### Nuevos Componentes:

1. **`src/hooks/use-intelligent-vehicle-assignment.ts`**
   - Hook reutilizable para lógica de fecha inteligente

2. **`src/components/multas/multa-payment-selector.tsx`**
   - Componente para seleccionar multa a pagar

---

## 🚀 Plan de Implementación

### Fase 1: Sistema de Multas con Balance Automático
1. Modificar `addMulta()` para actualizar balance
2. Crear categorías de sistema para multas
3. Probar que el balance se actualice correctamente

### Fase 2: Pago de Multas desde Ingresos
1. Agregar categoría "Pago de Multa"
2. Implementar filtro de clientes con multas
3. Crear selector de multas
4. Implementar lógica de vinculación y actualización

### Fase 3: Campo Inteligente de Fecha de Asignación
1. Crear hook `useIntelligentVehicleAssignmentDate`
2. Integrar en ClientForm
3. Agregar alertas y validaciones

### Fase 4: Sincronización de Asignaciones
1. Implementar `assignVehicleToClient()` centralizada
2. Implementar `unassignVehicleFromClient()`
3. Migrar ambos formularios a usar funciones centralizadas
4. Probar flujo completo de asignación/desasignación

---

## ✅ Beneficios del Sistema Mejorado

1. **Trazabilidad Completa**
   - Cada multa tiene registro financiero
   - Cada pago está vinculado a la multa
   - Historial completo de asignaciones

2. **Balance Preciso**
   - Se actualiza automáticamente al registrar multa
   - Se ajusta automáticamente al pagar
   - Sin intervención manual

3. **UX Mejorada**
   - Campo de fecha inteligente previene errores
   - Filtros automáticos en pagos
   - Alertas contextuales

4. **Consistencia de Datos**
   - Una sola función para asignaciones
   - Siempre se crea log de historial
   - Previene duplicación y conflictos

5. **Mantenibilidad**
   - Lógica centralizada
   - Fácil de debuggear
   - Escalable para futuras mejoras
