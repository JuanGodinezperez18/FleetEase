"use client";

import React, { useState, useMemo } from 'react';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  FileSpreadsheet,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown,
  Car,
  Users,
  Briefcase,
  Target,
  Loader2,
  Eye
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
  CartesianGrid,
  ComposedChart,
  Area
} from 'recharts';
import { ReportAnalyticsService } from '@/lib/reports/analytics-service';
import { generatePDFReport, downloadPDF } from '@/lib/reports/pdf-generator';
import { generateExcelReport, downloadExcel } from '@/lib/reports/excel-generator';
import type { ReportData } from '@/lib/reports/pdf-generator';
import { useAuth } from '@/contexts/auth-provider';
import { supabase } from '@/lib/supabase';

type ReportType = 'financial' | 'vehicle' | 'client' | 'partner' | 'executive';

export default function ReportsPageImproved() {
  const { financialRecords, vehicles, clients, partners, selectedCompanyId, clientBalances } = useData();
  const { currentUser } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [reportType, setReportType] = useState<ReportType>('financial');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [selectedChart, setSelectedChart] = useState<'bar' | 'pie' | 'line'>('bar');

  // Calcular período anterior para comparación
  const previousPeriod = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return undefined;

    const daysInPeriod = differenceInDays(dateRange.to, dateRange.from) + 1;
    return {
      from: subDays(dateRange.from, daysInPeriod),
      to: subDays(dateRange.from, 1),
    };
  }, [dateRange]);

  // Calcular resumen financiero
  const financialSummary = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return null;

    return ReportAnalyticsService.calculateFinancialSummary(
      financialRecords,
      { from: dateRange.from, to: dateRange.to },
      previousPeriod
    );
  }, [financialRecords, dateRange, previousPeriod]);

  // Calcular métricas de vehículos
  const vehicleMetrics = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return [];

    return ReportAnalyticsService.calculateVehicleMetrics(
      vehicles,
      financialRecords,
      { from: dateRange.from, to: dateRange.to }
    );
  }, [vehicles, financialRecords, dateRange]);

  // Combinar clientes con sus balances reales calculados
  const clientsWithBalances = useMemo(() => {
    const balanceMap = new Map(clientBalances.map(cb => [cb.id, cb.balance]));
    return clients.map(client => ({
      ...client,
      balance: balanceMap.get(client.id) ?? client.balance ?? 0
    }));
  }, [clients, clientBalances]);

  // Calcular métricas de clientes
  const clientMetrics = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return [];

    return ReportAnalyticsService.calculateClientMetrics(
      clientsWithBalances,
      financialRecords,
      { from: dateRange.from, to: dateRange.to }
    );
  }, [clientsWithBalances, financialRecords, dateRange]);

  // Calcular métricas de socios
  const partnerMetrics = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return [];

    return ReportAnalyticsService.calculatePartnerMetrics(
      partners,
      vehicles,
      financialRecords,
      { from: dateRange.from, to: dateRange.to }
    );
  }, [partners, vehicles, financialRecords, dateRange]);

  // Calcular tendencias mensuales
  const monthlyTrends = useMemo(() => {
    return ReportAnalyticsService.calculateMonthlyTrends(financialRecords, 6);
  }, [financialRecords]);

  // Datos para gráficos
  const chartData = useMemo(() => {
    if (!financialSummary) return [];

    return [
      { name: 'Ingresos', value: financialSummary.income, color: '#10b981' },
      { name: 'Gastos', value: financialSummary.expenses, color: '#ef4444' },
    ];
  }, [financialSummary]);

  const categoryChartData = useMemo(() => {
    if (!financialSummary) return [];

    return Object.entries(financialSummary.expensesByCategory)
      .map(([category, amount]) => ({
        name: category,
        value: amount
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [financialSummary]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  // Preparar datos del reporte
  const prepareReportData = (): ReportData | null => {
    if (!dateRange?.from || !dateRange.to || !financialSummary) return null;

    const filteredRecords = ReportAnalyticsService.filterRecordsByDateRange(
      financialRecords,
      { from: dateRange.from, to: dateRange.to }
    );

    const baseData: ReportData = {
      type: reportType,
      title: getReportTitle(),
      subtitle: getReportSubtitle(),
      dateRange: { from: dateRange.from, to: dateRange.to },
      companyName: 'FleetEase Manager',
      generatedBy: currentUser?.name || undefined,
      income: financialSummary.income,
      expenses: financialSummary.expenses,
      netProfit: financialSummary.netProfit,
      profitMargin: financialSummary.profitMargin,
      transactionsCount: financialSummary.transactionsCount,
      expensesByCategory: financialSummary.expensesByCategory,
      incomeByCategory: financialSummary.incomeByCategory,
      records: filteredRecords,
    };

    switch (reportType) {
      case 'vehicle':
        return {
          ...baseData,
          vehicleMetrics,
        };
      case 'client':
        return {
          ...baseData,
          clientMetrics,
        };
      case 'partner':
        return {
          ...baseData,
          partnerMetrics,
        };
      case 'executive':
        return {
          ...baseData,
          vehicleMetrics,
          clientMetrics,
          partnerMetrics,
        };
      default:
        return baseData;
    }
  };

  const getReportTitle = (): string => {
    switch (reportType) {
      case 'financial':
        return 'Reporte Financiero';
      case 'vehicle':
        return 'Reporte de Rentabilidad por Vehículo';
      case 'client':
        return 'Reporte de Análisis de Clientes';
      case 'partner':
        return 'Reporte de Análisis de Socios';
      case 'executive':
        return 'Reporte Ejecutivo Integral';
      default:
        return 'Reporte';
    }
  };

  const getReportSubtitle = (): string => {
    switch (reportType) {
      case 'financial':
        return 'Análisis de ingresos, gastos y rentabilidad';
      case 'vehicle':
        return 'Análisis de rendimiento y rentabilidad de la flota';
      case 'client':
        return 'Análisis de comportamiento de pago y balances';
      case 'partner':
        return 'Análisis de rendimiento y balance de socios';
      case 'executive':
        return 'Resumen ejecutivo de todas las métricas clave';
      default:
        return '';
    }
  };

  // Guardar reporte en Supabase
  const saveReportToSupabase = async (type: 'pdf' | 'excel', filename: string) => {
    if (!selectedCompanyId || !currentUser) return;

    try {
      await supabase.from('generated_reports').insert({
        company_id: selectedCompanyId,
        type: reportType,
        format: type,
        filename,
        date_range: dateRange ? {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString(),
        } : null,
        created_by: currentUser.uid,
        created_by_name: currentUser.name,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving report to Supabase:', error);
    }
  };

  // Exportar a PDF
  const handleExportPDF = async () => {
    const reportData = prepareReportData();
    if (!reportData) {
      toast.error('No hay datos para generar el reporte');
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const pdfBlob = await generatePDFReport(reportData);
      const filename = `${reportType}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
      downloadPDF(pdfBlob, filename);

      await saveReportToSupabase('pdf', filename);

      toast.success('Reporte PDF generado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    const reportData = prepareReportData();
    if (!reportData) {
      toast.error('No hay datos para generar el reporte');
      return;
    }

    setIsGeneratingExcel(true);

    try {
      const excelBlob = await generateExcelReport(reportData);
      const filename = `${reportType}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
      downloadExcel(excelBlob, filename);

      await saveReportToSupabase('excel', filename);

      toast.success('Reporte Excel generado exitosamente');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Error al generar el Excel');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  if (!financialSummary) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes Avanzados</h1>
          <p className="text-muted-foreground mt-1">
            Análisis completo con exportación a PDF y Excel
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="financial">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Financiero</span>
                </div>
              </SelectItem>
              <SelectItem value="vehicle">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  <span>Vehículos</span>
                </div>
              </SelectItem>
              <SelectItem value="client">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Clientes</span>
                </div>
              </SelectItem>
              <SelectItem value="partner">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>Socios</span>
                </div>
              </SelectItem>
              <SelectItem value="executive">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>Ejecutivo</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="date-from" className="text-xs">Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined;
                  setDateRange(prev => ({
                    from: newDate,
                    to: prev?.to
                  }));
                }}
                className="w-[150px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="date-to" className="text-xs">Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined;
                  setDateRange(prev => ({
                    from: prev?.from,
                    to: newDate
                  }));
                }}
                className="w-[150px]"
              />
            </div>
          </div>

          <Button
            onClick={handleExportPDF}
            variant="outline"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            PDF
          </Button>

          <Button
            onClick={handleExportExcel}
            variant="outline"
            disabled={isGeneratingExcel}
          >
            {isGeneratingExcel ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            Excel
          </Button>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Ingresos Totales"
          value={formatCurrency(financialSummary.income)}
          change={financialSummary.incomeChange}
          trend={financialSummary.incomeChange && financialSummary.incomeChange >= 0 ? 'up' : 'down'}
          subtitle="vs período anterior"
        />
        <MetricCard
          icon={TrendingDown}
          label="Gastos Totales"
          value={formatCurrency(financialSummary.expenses)}
          change={financialSummary.expensesChange}
          trend={financialSummary.expensesChange && financialSummary.expensesChange <= 0 ? 'up' : 'down'}
          subtitle="vs período anterior"
        />
        <MetricCard
          icon={TrendingUp}
          label="Beneficio Neto"
          value={formatCurrency(financialSummary.netProfit)}
          change={financialSummary.profitChange}
          trend={financialSummary.profitChange && financialSummary.profitChange >= 0 ? 'up' : 'down'}
          subtitle="vs período anterior"
          valueColor={financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <MetricCard
          icon={PieChartIcon}
          label="Margen de Beneficio"
          value={`${financialSummary.profitMargin.toFixed(1)}%`}
          subtitle={`${financialSummary.transactionsCount} transacciones`}
        />
      </div>

      {/* Content based on report type */}
      {renderReportContent()}
    </div>
  );

  function renderReportContent() {
    return (
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="analysis">Análisis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Income vs Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Ingresos vs Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Categorías de Gasto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias Mensuales (Últimos 6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    fill="#10b981"
                    stroke="#10b981"
                    fillOpacity={0.3}
                    name="Beneficio"
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Ingresos"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Gastos"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {reportType === 'vehicle' || reportType === 'executive' ? (
            <VehicleMetricsTable metrics={vehicleMetrics} />
          ) : null}

          {reportType === 'client' || reportType === 'executive' ? (
            <ClientMetricsTable metrics={clientMetrics} />
          ) : null}

          {reportType === 'partner' || reportType === 'executive' ? (
            <PartnerMetricsTable metrics={partnerMetrics} />
          ) : null}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportType === 'vehicle' || reportType === 'executive' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Vehículos Más Rentables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ReportAnalyticsService.getTopVehicles(vehicleMetrics, 5).map((metric, index) => (
                      <div key={metric.vehicle.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{metric.vehicle.alias}</p>
                            <p className="text-sm text-muted-foreground">{metric.vehicle.plate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(metric.netProfit)}</p>
                          <p className="text-xs text-muted-foreground">{metric.profitability.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {reportType === 'client' || reportType === 'executive' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Clientes por Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ReportAnalyticsService.getTopClients(clientMetrics, 5).map((metric, index) => (
                      <div key={metric.client.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{metric.client.firstname} {metric.client.lastname}</p>
                            <Badge variant={metric.balance > 1000 ? 'destructive' : 'default'}>
                              {metric.paymentBehavior}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(metric.totalPayments)}</p>
                          <p className="text-xs text-muted-foreground">Balance: {formatCurrency(metric.balance)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    );
  }
}

// Componente MetricCard mejorado
interface MetricCardProps {
  icon: any;
  label: string;
  value: string;
  change?: number;
  trend?: 'up' | 'down';
  subtitle: string;
  valueColor?: string;
}

const MetricCard = ({ icon: Icon, label, value, change, trend, subtitle, valueColor }: MetricCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="w-4 h-4" />
                {label}
              </div>
              <div className={cn("text-2xl font-bold", valueColor)}>
                {value}
              </div>
              {change !== undefined && (
                <div className="flex items-center gap-1 text-sm">
                  {trend === 'up' ? (
                    <ArrowUp className={cn(
                      "w-4 h-4",
                      change >= 0 ? "text-green-500" : "text-red-500"
                    )} />
                  ) : (
                    <ArrowDown className={cn(
                      "w-4 h-4",
                      change <= 0 ? "text-green-500" : "text-red-500"
                    )} />
                  )}
                  <span className={cn(
                    "font-medium",
                    (trend === 'up' ? change >= 0 : change <= 0)
                      ? "text-green-600"
                      : "text-red-600"
                  )}>
                    {Math.abs(change).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">{subtitle}</span>
                </div>
              )}
              {change === undefined && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Vehicle Metrics Table
function VehicleMetricsTable({ metrics }: { metrics: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rentabilidad por Vehículo</CardTitle>
        <CardDescription>Análisis detallado de rendimiento de cada vehículo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.slice(0, 10).map(metric => (
            <div key={metric.vehicle.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{metric.vehicle.alias || `${metric.vehicle.make} ${metric.vehicle.model}`}</p>
                <p className="text-sm text-muted-foreground">{metric.vehicle.plate}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">Ingresos</p>
                  <p className="font-medium text-green-600">{formatCurrency(metric.totalIncome)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Gastos</p>
                  <p className="font-medium text-red-600">{formatCurrency(metric.totalExpenses)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Beneficio</p>
                  <p className={cn("font-bold", metric.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(metric.netProfit)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Client Metrics Table
function ClientMetricsTable({ metrics }: { metrics: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Clientes</CardTitle>
        <CardDescription>Comportamiento de pago y balances</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.slice(0, 10).map(metric => (
            <div key={metric.client.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{metric.client.firstname} {metric.client.lastname}</p>
                <Badge variant={metric.balance > 1000 ? 'destructive' : 'default'}>
                  {metric.paymentBehavior}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">Pagos Totales</p>
                  <p className="font-medium text-green-600">{formatCurrency(metric.totalPayments)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Balance</p>
                  <p className={cn("font-bold", metric.balance > 0 ? "text-red-600" : "text-green-600")}>
                    {formatCurrency(metric.balance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Partner Metrics Table
function PartnerMetricsTable({ metrics }: { metrics: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Socios</CardTitle>
        <CardDescription>Rendimiento y balance de socios</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map(metric => (
            <div key={metric.partner.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{metric.partner.firstname} {metric.partner.lastname}</p>
                <p className="text-sm text-muted-foreground">{metric.activeVehicles} vehículos activos</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">Ingresos</p>
                  <p className="font-medium text-green-600">{formatCurrency(metric.totalIncome)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Gastos</p>
                  <p className="font-medium text-red-600">{formatCurrency(metric.totalExpenses)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Balance</p>
                  <p className={cn("font-bold", metric.netBalance >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(metric.netBalance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
