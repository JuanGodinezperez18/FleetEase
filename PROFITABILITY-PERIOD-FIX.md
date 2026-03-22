# ✅ Solución: Filtro de Período en Rentabilidad

## 🐛 Problema Detectado

La página de **Rentabilidad por Vehículo** mostraba:
- **Texto**: "últimos 30 días" (hardcodeado)
- **Filtros UI**: Semana, Mes, Año (pero no funcionaban)

Esto causaba confusión porque el usuario veía los filtros pero el cálculo siempre era sobre 30 días fijos.

---

## ✅ Solución Implementada

Se creó un **contexto compartido** para el filtro de fechas que sincroniza todas las páginas del dashboard.

### Archivos Creados/Modificados

| Archivo | Cambio |
|---------|--------|
| `src/contexts/dashboard-date-context.tsx` | **NUEVO** - Contexto para compartir filtro de fechas |
| `src/app/dashboard/layout.tsx` | Envuelve el dashboard con `DashboardDateProvider` |
| `src/components/dashboard/components/DashboardDateFilter.tsx` | Ahora usa el contexto compartido |
| `src/app/dashboard/profitability/page.tsx` | Lee el período del contexto y lo usa dinámicamente |

---

## 🔧 Cómo Funciona

### 1. Contexto Global (`dashboard-date-context.tsx`)
```tsx
interface DashboardDateContextType {
  dateRange: DateRange | undefined;
  dateFilterPreset: 'week' | 'month' | 'year';
  setDateRange: (range: DateRange | undefined) => void;
  setDateFilterPreset: (preset: DateFilterPreset) => void;
  periodDays: number; // Calculado automáticamente
}
```

### 2. Layout del Dashboard
El `layout.tsx` ahora envuelve todo con el proveedor:
```tsx
<DashboardDateProvider>
  <VehiclesProvider>...</VehiclesProvider>
</DashboardDateProvider>
```

### 3. Filtro de Fechas
El `DashboardDateFilter` ahora:
- Lee del contexto el estado actual
- Actualiza el contexto cuando el usuario cambia el filtro
- Sincroniza todos los componentes que usan `useDashboardDate()`

### 4. Página de Rentabilidad
Ahora usa el contexto:
```tsx
const { dateRange, periodDays } = useDashboardDate();

<VehicleProfitabilityDashboard
  vehicles={vehicles}
  financialRecords={financialRecords}
  periodDays={periodDays} // ← Dinámico, no fijo en 30
/>
```

---

## 📊 Comportamiento Actual

| Filtro | Período | Texto que se muestra |
|--------|---------|---------------------|
| **Semana** | Lunes a Domingo seleccionado | "7 días seleccionados" |
| **Mes** | 1ro al último día del mes | "mes actual" (si es el mes actual) |
| **Año** | 1 Ene - 31 Dic del año | "año actual" (si es el año actual) |

El cálculo de rentabilidad **ahora respeta el filtro seleccionado**.

---

## 🧪 Testing

Para verificar que funciona:

1. Ve a `/dashboard`
2. Cambia el filtro de fechas (Semana/Mes/Año)
3. Ve a `/dashboard/profitability`
4. Verifica que:
   - El texto refleja el período seleccionado
   - Los cálculos usan el período correcto
   - Al cambiar el filtro, se actualiza la rentabilidad

---

## 🎯 Beneficios

1. **Consistencia**: Todas las páginas usan el mismo filtro de fechas
2. **Transparencia**: El usuario ve exactamente qué período se está calculando
3. **Flexibilidad**: Puede analizar rentabilidad por semana, mes o año
4. **Mantenibilidad**: El contexto centraliza la lógica de fechas

---

## 📝 Notas Técnicas

### Cálculo de `periodDays`
```tsx
const periodDays = useMemo(() => {
  if (!dateRange?.from || !dateRange?.to) return 30;
  
  const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}, [dateRange]);
```

### Texto Dinámico
La función `getPeriodText()` determina qué mostrar:
- "mes actual" → Si es el mes en curso
- "año actual" → Si es el año en curso
- "X días seleccionados" → Para semanas o rangos personalizados

---

## 🔄 Próximos Pasos (Opcional)

Si quieres extender esta funcionalidad:

1. **Otras páginas**: Aplicar el mismo patrón a otras métricas (Finanzas, Clientes, etc.)
2. **Persistencia**: Guardar el filtro seleccionado en localStorage
3. **Rangos personalizados**: Agregar un date picker para rangos custom

---

**Fecha de implementación**: Marzo 2026
**Issue relacionado**: Inconsistencia en filtro de período de Rentabilidad
