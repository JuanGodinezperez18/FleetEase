# Módulo de Reportes Mejorado

## Descripción General

El módulo de reportes permite generar análisis completos del negocio con exportación profesional a **PDF y Excel**, incluyendo métricas financieras, análisis de vehículos, clientes y socios.

## Características Principales

### 1. Tipos de Reportes

#### Reporte Financiero
- Análisis de ingresos y gastos
- Desglose por categorías
- Margen de beneficio
- Comparación con período anterior
- Detalle completo de transacciones

#### Reporte de Vehículos
- Rentabilidad por vehículo
- Ingresos y gastos por unidad
- Tasa de utilización
- Ranking de vehículos más rentables
- Análisis de rendimiento individual

#### Reporte de Clientes
- Comportamiento de pago
- Balance y adeudos
- Historial de pagos
- Clasificación de clientes
- Análisis de riesgo

#### Reporte de Socios
- Rendimiento por socio
- Vehículos activos
- Balance neto
- Ingresos y gastos por socio
- Comparativa de rentabilidad

### 2. Formatos de Exportación

#### PDF Profesional
- Diseño limpio y profesional
- Tablas formateadas con jsPDF-autotable
- Encabezados con branding
- Múltiples páginas automáticas
- Pie de página con numeración
- Colores corporativos
- Logo y nombre de empresa

#### Excel Completo
- Múltiples hojas de trabajo
- Datos estructurados y formateados
- Anchos de columna optimizados
- Resumen del reporte en primera hoja
- Fácil de analizar y manipular
- Compatible con Excel/LibreOffice/Google Sheets

### 3. Análisis y Visualizaciones

#### Gráficos Interactivos
- Gráficos de barras
- Gráficos circulares (pie charts)
- Gráficos de líneas temporales
- Gráficos combinados (área + línea)
- Tendencias mensuales (6 meses)

#### Métricas en Tiempo Real
- Comparación con período anterior
- Indicadores de cambio porcentual
- Tendencias (subida/bajada)
- Códigos de color intuitivos
- Alertas visuales

## Arquitectura

### Servicios (`src/lib/reports/`)

#### 1. `pdf-generator.ts`
Generador profesional de PDFs usando jsPDF.

**Características**:
- Clase `PDFReportGenerator`
- Encabezados personalizados
- Resumen del reporte
- Tablas con autoTable
- Paginación automática
- Pie de página
- Formato de moneda
- Colores corporativos

**Uso**:
```typescript
import { generatePDFReport, downloadPDF } from '@/lib/reports/pdf-generator';

const reportData: ReportData = {
  type: 'financial',
  title: 'Reporte Financiero Mensual',
  dateRange: { from: startDate, to: endDate },
  income: 50000,
  expenses: 30000,
  // ... más datos
};

const pdfBlob = await generatePDFReport(reportData);
downloadPDF(pdfBlob, 'reporte-financiero.pdf');
```

#### 2. `excel-generator.ts`
Generador de archivos Excel usando XLSX.

**Características**:
- Clase `ExcelReportGenerator`
- Múltiples hojas de trabajo
- Formato de celdas
- Anchos de columna automáticos
- Fórmulas y totales
- Datos estructurados

**Uso**:
```typescript
import { generateExcelReport, downloadExcel } from '@/lib/reports/excel-generator';

const excelBlob = await generateExcelReport(reportData);
downloadExcel(excelBlob, 'reporte-financiero.xlsx');
```

#### 3. `analytics-service.ts`
Servicio de análisis y cálculo de métricas.

**Métodos Principales**:

- `calculateVehicleMetrics(vehicles, records, dateRange)`
  - Calcula rentabilidad por vehículo
  - Ingresos, gastos, beneficio neto
  - Tasa de utilización
  - Profitabilidad

- `calculateClientMetrics(clients, records, dateRange)`
  - Pagos totales
  - Balance actual
  - Días desde último pago
  - Comportamiento de pago

- `calculatePartnerMetrics(partners, vehicles, records, dateRange)`
  - Ingresos y gastos por socio
  - Vehículos activos
  - Balance neto

- `calculateFinancialSummary(records, dateRange, previousPeriod)`
  - Resumen financiero completo
  - Comparación con período anterior
  - Desglose por categorías
  - Cambios porcentuales

- `calculateMonthlyTrends(records, months)`
  - Tendencias de los últimos N meses
  - Ingresos, gastos y beneficio mensual

- `getTopVehicles(metrics, limit)`
  - Top N vehículos más rentables

- `getTopClients(metrics, limit)`
  - Top N clientes por pagos

**Uso**:
```typescript
import { ReportAnalyticsService } from '@/lib/reports/analytics-service';

// Calcular métricas de vehículos
const vehicleMetrics = ReportAnalyticsService.calculateVehicleMetrics(
  vehicles,
  financialRecords,
  { from: startDate, to: endDate }
);

// Obtener top 5 vehículos
const topVehicles = ReportAnalyticsService.getTopVehicles(vehicleMetrics, 5);

// Calcular resumen financiero
const summary = ReportAnalyticsService.calculateFinancialSummary(
  financialRecords,
  { from: startDate, to: endDate },
  previousPeriod
);
```

### Frontend

#### Página Principal (`src/app/dashboard/reports/page.tsx`)

**Características**:
- Selector de tipo de reporte
- Filtro de rango de fechas
- Tarjetas de métricas con comparación
- Tabs de navegación (Resumen, Tendencias, Detalles, Análisis)
- Botones de exportación PDF/Excel
- Visualizaciones interactivas
- Tablas de métricas detalladas

**Estados Principales**:
```typescript
const [reportType, setReportType] = useState<ReportType>('financial');
const [dateRange, setDateRange] = useState<DateRange>();
const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
```

**Tabs Disponibles**:
1. **Resumen**: Vista general con gráficos principales
2. **Tendencias**: Gráficos de tendencias mensuales (6 meses)
3. **Detalles**: Tablas detalladas según el tipo de reporte
4. **Análisis**: Top rankings y análisis especiales

#### Historial (`src/app/dashboard/reports/history/page.tsx`)

- Lista de reportes generados anteriormente
- Filtros por compañía
- Información de creación (fecha, usuario, tipo)
- Descarga de reportes guardados

## Tipos de Datos

### ReportData
```typescript
interface ReportData {
  type: 'financial' | 'vehicle' | 'client' | 'partner' | 'partner';
  title: string;
  subtitle?: string;
  dateRange: { from: Date; to: Date };
  companyName?: string;
  generatedBy?: string;

  // Financial data
  income?: number;
  expenses?: number;
  netProfit?: number;
  profitMargin?: number;
  transactionsCount?: number;
  expensesByCategory?: Record<string, number>;
  incomeByCategory?: Record<string, number>;

  // Vehicle data
  vehicleMetrics?: VehicleMetric[];

  // Client data
  clientMetrics?: ClientMetric[];

  // Partner data
  partnerMetrics?: PartnerMetric[];

  // Detailed records
  records?: FinancialRecord[];
}
```

### VehicleMetric
```typescript
interface VehicleMetric {
  vehicle: Vehicle;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitability: number;
  utilizationRate: number;
  transactionsCount: number;
}
```

### ClientMetric
```typescript
interface ClientMetric {
  client: Client;
  totalPayments: number;
  balance: number;
  daysSinceLastPayment: number;
  paymentBehavior: string;
  transactionsCount: number;
}
```

### PartnerMetric
```typescript
interface PartnerMetric {
  partner: Partner;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  activeVehicles: number;
  transactionsCount: number;
}
```

## Persistencia del historial

### generatedReports (referencia histórica)
Almacena el historial de reportes generados.

**Estructura**:
```typescript
{
  id: string;
  companyId: string;
  type: 'financial' | 'vehicle' | 'client' | 'partner' | 'partner';
  format: 'pdf' | 'excel';
  filename: string;
  dateRange: {
    from: string;
    to: string;
  };
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  downloadUrl?: string; // Opcional: URL de descarga si se guarda en Storage
}
```

**Índices requeridos**:
- `companyId` + `createdAt` (desc)
- `companyId` + `type` + `createdAt` (desc)

## Uso Paso a Paso

### 1. Generar Reporte Financiero

```typescript
// Desde un componente React
const handleGenerateReport = async () => {
  // 1. Seleccionar tipo de reporte
  setReportType('financial');

  // 2. Configurar rango de fechas
  setDateRange({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // 3. Exportar a PDF o Excel
  await handleExportPDF(); // o handleExportExcel();
};
```

### 2. Generar Reporte de Vehículos

```typescript
// 1. Calcular métricas
const vehicleMetrics = ReportAnalyticsService.calculateVehicleMetrics(
  vehicles,
  financialRecords,
  dateRange
);

// 2. Preparar datos del reporte
const reportData: ReportData = {
  type: 'vehicle',
  title: 'Reporte de Rentabilidad por Vehículo',
  dateRange,
  vehicleMetrics,
  income: totalIncome,
  expenses: totalExpenses,
  netProfit: netProfit,
  // ...
};

// 3. Generar y descargar
const pdfBlob = await generatePDFReport(reportData);
downloadPDF(pdfBlob, 'reporte-vehiculos.pdf');
```

### 3. Analizar Tendencias

```typescript
// Obtener tendencias mensuales
const trends = ReportAnalyticsService.calculateMonthlyTrends(
  financialRecords,
  6 // últimos 6 meses
);

// Visualizar en gráfico
<LineChart data={trends}>
  <Line dataKey="income" stroke="#3b82f6" />
  <Line dataKey="expenses" stroke="#ef4444" />
  <Line dataKey="profit" stroke="#10b981" />
</LineChart>
```

## Mejoras Implementadas

### Antes vs Después

#### Antes:
- ❌ Exportación PDF/Excel no funcional (placeholder)
- ❌ Solo reporte financiero básico
- ❌ Sin análisis de vehículos
- ❌ Sin análisis de clientes/socios
- ❌ Gráficos limitados
- ❌ Sin guardar historial de reportes
- ❌ Sin comparación con períodos anteriores
- ❌ Sin tendencias mensuales

#### Después:
- ✅ Exportación real a PDF profesional
- ✅ Exportación real a Excel con múltiples hojas
- ✅ 4 tipos de reportes
- ✅ Análisis completo de vehículos con rentabilidad
- ✅ Análisis de clientes con comportamiento de pago
- ✅ Análisis de socios con balance y rendimiento
- ✅ Gráficos avanzados (líneas, áreas, barras, pie)
- ✅ Tendencias mensuales (6 meses)
- ✅ Historial de reportes generados
- ✅ Comparación automática con período anterior
- ✅ Top rankings (vehículos, clientes)
- ✅ KPIs con indicadores visuales
- ✅ Sistema modular y extensible

## Próximas Mejoras Sugeridas

- [ ] Programación de reportes automáticos
- [ ] Envío por email de reportes
- [ ] Plantillas personalizables
- [ ] Más tipos de gráficos (heatmaps, scatter plots)
- [ ] Exportación a CSV
- [ ] Reportes comparativos entre compañías (SuperAdmin)
- [ ] Proyecciones y forecasting
- [ ] Alertas basadas en métricas
- [ ] Dashboard de reportes programados
- [ ] Filtros avanzados (por vehículo, cliente específico)

## Performance y Optimización

### Cálculos Eficientes
- Uso de `useMemo` para evitar recálculos innecesarios
- Filtrado eficiente de datos por fecha
- Ordenamiento optimizado de métricas

### Generación Asíncrona
- PDFs generados en background
- Indicadores de progreso durante generación
- No bloquea la UI

### Caché de Datos
- Métricas calculadas se almacenan en memoria
- Re-cálculo solo cuando cambian dependencias
- Optimización de consultas a Supabase

## Troubleshooting

### PDF no se genera
- Verificar que jsPDF está instalado: `npm list jspdf`
- Verificar que jspdf-autotable está instalado: `npm list jspdf-autotable`
- Revisar consola de browser para errores

### Excel vacío o corrupto
- Verificar que XLSX está instalado correctamente
- Asegurar que los datos tienen estructura válida
- Revisar formato de fechas y números

### Métricas incorrectas
- Verificar filtrado de registros eliminados (`isDeleted`)
- Confirmar rango de fechas correcto
- Revisar que `companyId` esté configurado

## Soporte

Para problemas o preguntas sobre el módulo de reportes, contactar al equipo de desarrollo.
