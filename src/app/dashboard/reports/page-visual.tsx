/**
 * Reportes Mejorados con Visualizaciones Avanzadas
 * FleetEase Manager 2026
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Car,
  Users,
  FileSpreadsheet,
  FileText,
  Eye,
  RefreshCcw,
  Calendar,
  Filter,
  Share2,
  Zap,
  Activity,
  Target,
  Award,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  CartesianGrid,
} from 'recharts';
import { ReportAnalyticsService } from '@/lib/reports/analytics-service';
import { generatePDFReport, downloadPDF } from '@/lib/reports/pdf-generator';
import { generateExcelReport, downloadExcel } from '@/lib/reports/excel-generator';

type ReportType = 'financial' | 'vehicle' | 'client' | 'partner' | 'executive';

// Colores para gráficos
const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
];

const VARIANTS = {
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  },
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};

export default function ReportsPageVisual() {
  const { financialRecords, vehicles, clients, partners } = useData();
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [isLoading, setIsLoading] = useState(false);

  // Datos financieros
  const financialData = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return null;
    return ReportAnalyticsService.calculateFinancialSummary(
      financialRecords,
      { from: dateRange.from, to: dateRange.to }
    );
  }, [financialRecords, dateRange]);

  // Generar reporte PDF
  const handleGeneratePDF = async () => {
    setIsLoading(true);
    try {
      const data = generatePDFReport(financialData);
      await downloadPDF(data);
      toast.success('Reporte PDF generado exitosamente');
    } catch (error) {
      toast.error('Error generando reporte PDF');
    } finally {
      setIsLoading(false);
    }
  };

  // Generar reporte Excel
  const handleGenerateExcel = async () => {
    setIsLoading(true);
    try {
      await generateExcelReport(financialRecords, dateRange);
      toast.success('Reporte Excel generado exitosamente');
    } catch (error) {
      toast.error('Error generando reporte Excel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={VARIANTS.stagger}
    >
      {/* Header con animación */}
      <motion.div variants={VARIANTS.fadeIn} className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
            Reportes y Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualiza el rendimiento de tu flota en tiempo real
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={isLoading}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateExcel}
            disabled={isLoading}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </motion.div>

      {/* Tabs de Reportes */}
      <motion.div variants={VARIANTS.fadeIn}>
        <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="executive" className="gap-2">
              <Target className="h-4 w-4" />
              Ejecutivo
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Finanzas
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="gap-2">
              <Car className="h-4 w-4" />
              Vehículos
            </TabsTrigger>
            <TabsTrigger value="client" className="gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="partner" className="gap-2">
              <Award className="h-4 w-4" />
              Socios
            </TabsTrigger>
          </TabsList>

          {/* Reporte Ejecutivo */}
          <TabsContent value="executive">
            <ExecutiveDashboard
              financialData={financialData}
              vehicles={vehicles}
              clients={clients}
              partners={partners}
              dateRange={dateRange}
            />
          </TabsContent>

          {/* Reporte Financiero */}
          <TabsContent value="financial">
            <FinancialReport
              financialRecords={financialRecords}
              financialData={financialData}
              dateRange={dateRange}
            />
          </TabsContent>

          {/* Reporte de Vehículos */}
          <TabsContent value="vehicle">
            <VehicleReport vehicles={vehicles} financialRecords={financialRecords} />
          </TabsContent>

          {/* Reporte de Clientes */}
          <TabsContent value="client">
            <ClientReport clients={clients} financialRecords={financialRecords} />
          </TabsContent>

          {/* Reporte de Socios */}
          <TabsContent value="partner">
            <PartnerReport partners={partners} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// DASHBOARD EJECUTIVO
// ============================================

interface ExecutiveDashboardProps {
  financialData: any;
  vehicles: any[];
  clients: any[];
  partners: any[];
  dateRange: DateRange;
}

function ExecutiveDashboard({ financialData, vehicles, clients, partners, dateRange }: ExecutiveDashboardProps) {
  const kpis = [
    {
      title: 'Ingresos Totales',
      value: financialData?.totalIncome || 0,
      change: financialData?.incomeGrowth || 0,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Gastos Totales',
      value: financialData?.totalExpenses || 0,
      change: financialData?.expenseGrowth || 0,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      title: 'Utilidad Neta',
      value: financialData?.netProfit || 0,
      change: financialData?.profitGrowth || 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Vehículos Activos',
      value: vehicles.filter(v => v.status === 'active').length,
      change: 5,
      icon: Car,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* KPIs con animación */}
      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={VARIANTS.stagger}
      >
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            variants={VARIANTS.fadeIn}
            custom={index}
          >
            <KPICard {...kpi} />
          </motion.div>
        ))}
      </motion.div>

      {/* Gráficos principales */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Ingresos vs Gastos */}
        <Card className="glow-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Rendimiento Financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={financialData?.monthlyTrend || []}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name="Ingresos"
                  stroke="#10B981" 
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  className="chart-animate"
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  name="Gastos"
                  stroke="#EF4444" 
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  className="chart-animate"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Distribución */}
        <Card className="glow-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
              Distribución de Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={financialData?.categoryDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  className="chart-animate"
                >
                  {(financialData?.categoryDistribution || []).map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      className="transition-transform hover:scale-110"
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Estado de la flota */}
      <Card className="glow-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            Estado de la Flota
          </CardTitle>
          <CardDescription>
            Vista general del estado de tus vehículos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <VehicleStatusCard 
              status="En Ruta" 
              count={vehicles.filter(v => v.status === 'rented').length} 
              total={vehicles.length}
              color="bg-green-500"
              icon="🚗"
            />
            <VehicleStatusCard 
              status="Disponible" 
              count={vehicles.filter(v => v.status === 'active').length} 
              total={vehicles.length}
              color="bg-blue-500"
              icon="✅"
            />
            <VehicleStatusCard 
              status="Mantenimiento" 
              count={vehicles.filter(v => v.status === 'maintenance').length} 
              total={vehicles.length}
              color="bg-yellow-500"
              icon="🔧"
            />
            <VehicleStatusCard 
              status="Fuera de Servicio" 
              count={vehicles.filter(v => v.status === 'inactive').length} 
              total={vehicles.length}
              color="bg-red-500"
              icon="❌"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function KPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color, 
  bgColor 
}: any) {
  const isPositive = change >= 0;
  
  return (
    <Card className="glow-hover hover-scale-shadow transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
        <div className="flex items-end justify-between mt-4">
          <div>
            <div className="text-2xl font-bold number-animate">
              {typeof value === 'number' && value > 1000 
                ? `$${(value / 1000).toFixed(1)}K` 
                : value}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{change}%
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground badge-pop">
            vs mes anterior
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleStatusCard({ status, count, total, color, icon }: any) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <motion.div 
      className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-all"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium">{status}</span>
      </div>
      <div className="text-2xl font-bold mb-2">{count}</div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${color} progress-animate`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {percentage.toFixed(1)}% del total
      </div>
    </motion.div>
  );
}

// ============================================
// REPORTES INDIVIDUALES (Placeholders)
// ============================================

function FinancialReport({ financialRecords, financialData, dateRange }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte Financiero Detallado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Vista detallada de ingresos, gastos y utilidades por categoría
        </p>
        {/* Aquí irían tablas detalladas y más gráficos */}
      </CardContent>
    </Card>
  );
}

function VehicleReport({ vehicles, financialRecords }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de Vehículos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Rendimiento, mantenimiento y utilización de cada vehículo
        </p>
      </CardContent>
    </Card>
  );
}

function ClientReport({ clients, financialRecords }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Comportamiento, pagos y historial de cada cliente
        </p>
      </CardContent>
    </Card>
  );
}

function PartnerReport({ partners }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de Socios</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Balance, transacciones y rendimiento por socio
        </p>
      </CardContent>
    </Card>
  );
}
