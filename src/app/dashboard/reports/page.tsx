"use client";

import React, { useState, useMemo } from 'react';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Area,
} from 'recharts';
import { ReportAnalyticsService } from '@/lib/reports/analytics-service';
import { useFinancialAnalytics } from '@/hooks/use-financial-analytics';
import { generatePDFReport, downloadPDF } from '@/lib/reports/pdf-generator';
import { generateExcelReport, downloadExcel } from '@/lib/reports/excel-generator';
import type { ReportData } from '@/lib/reports/pdf-generator';
import { useAuth } from '@/contexts/auth-provider';
import { MetricCard } from '@/components/dashboard/components/MetricCard';

type ReportType = 'financial' | 'vehicle' | 'client' | 'partner';

const CHART_COLORS = ['#d7ff3f', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f'];
const TOOLTIP_STYLE = {
  backgroundColor: '#0e1117',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
};

export default function ReportsPageImproved() {
  const { financialRecords, vehicles, clients, partners, financialCategories, selectedCompanyId, clientBalances, vehicleAssignmentLogs } = useData();
  const { currentUser } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [reportType, setReportType] = useState<ReportType>('financial');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const financialAnalytics = useFinancialAnalytics(
    financialRecords,
    clients,
    vehicles,
    dateRange,
    financialCategories
  );

  const financialSummary = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return null;
    return {
      income: financialAnalytics.totalIncome,
      expenses: financialAnalytics.totalExpenses,
      netProfit: financialAnalytics.netProfit,
      profitMargin: financialAnalytics.profitMargin,
      transactionsCount: ReportAnalyticsService.filterRecordsByDateRange(financialRecords, { from: startOfDay(dateRange.from!), to: endOfDay(dateRange.to!) }).length,
      expensesByCategory: Object.fromEntries(financialAnalytics.expenseCategories.map(item => [item.name, item.value])),
      incomeByCategory: Object.fromEntries(financialAnalytics.incomeCategories.map(item => [item.name, item.value])),
      incomeChange: financialAnalytics.monthlyGrowth.income,
      expensesChange: financialAnalytics.monthlyGrowth.expenses,
      profitChange: financialAnalytics.monthlyGrowth.profit,
    };
  }, [financialAnalytics, financialRecords, dateRange]);

  const vehicleMetrics = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return [];
    return ReportAnalyticsService.calculateVehicleMetrics(
      vehicles,
      financialRecords,
      { from: dateRange.from, to: dateRange.to },
      vehicleAssignmentLogs
    );
  }, [vehicles, financialRecords, dateRange, vehicleAssignmentLogs]);

  const clientsWithBalances = useMemo(() => {
    const balanceMap = new Map(clientBalances.map(cb => [cb.id, cb.balance]));
    return clients.map(client => ({
      ...client,
      balance: balanceMap.get(client.id) ?? client.balance ?? 0,
    }));
  }, [clients, clientBalances]);

  const clientMetrics = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return [];
    return ReportAnalyticsService.calculateClientMetrics(
      clientsWithBalances,
      financialRecords,
      { from: dateRange.from, to: dateRange.to }
    );
  }, [clientsWithBalances, financialRecords, dateRange]);

  const partnerMetrics = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return [];
    return ReportAnalyticsService.calculatePartnerMetrics(
      partners,
      vehicles,
      financialRecords,
      { from: dateRange.from, to: dateRange.to }
    );
  }, [partners, vehicles, financialRecords, dateRange]);

  const monthlyTrends = useMemo(
    () => financialAnalytics.cashFlowAnalysis.slice(-6).map(month => ({
      month: month.period,
      income: month.income,
      expenses: month.expenses,
      netProfit: month.netFlow,
    })),
    [financialAnalytics.cashFlowAnalysis]
  );

  const chartData = useMemo(() => {
    if (!financialSummary) return [];
    return [
      { name: 'Ingresos', value: financialSummary.income, color: '#d7ff3f' },
      { name: 'Gastos', value: financialSummary.expenses, color: '#fb7185' },
    ];
  }, [financialSummary]);

  const categoryChartData = useMemo(() => {
    if (!financialSummary) return [];
    return Object.entries(financialSummary.expensesByCategory)
      .map(([category, amount]) => ({ name: category, value: amount }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [financialSummary]);

  const prepareReportData = (): ReportData | null => {
    if (!dateRange?.from || !dateRange.to || !financialSummary) return null;

    const baseData: ReportData = {
      type: reportType,
      title: getReportTitle(),
      subtitle: getReportSubtitle(),
      dateRange: { from: dateRange.from, to: dateRange.to },
      companyName: 'FleetEase Manager',
      generatedBy: currentUser?.name || undefined,
      ...(reportType === 'financial'
        ? {
            income: financialSummary.income,
            expenses: financialSummary.expenses,
            netProfit: financialSummary.netProfit,
            profitMargin: financialSummary.profitMargin,
            transactionsCount: financialSummary.transactionsCount,
            expensesByCategory: financialSummary.expensesByCategory,
            incomeByCategory: financialSummary.incomeByCategory,
            records: ReportAnalyticsService.filterRecordsByDateRange(
              financialRecords,
              { from: dateRange.from, to: dateRange.to }
            ),
          }
        : {}),
    };

    switch (reportType) {
      case 'vehicle':
        return {
          ...baseData,
          vehicleMetrics,
          kpis: [
            { label: 'Vehículos analizados', value: vehicleMetrics.length, format: 'number' },
            { label: 'Ingresos de flota', value: vehicleMetrics.reduce((sum, m) => sum + m.totalIncome, 0), format: 'currency' },
            { label: 'Gastos de flota', value: vehicleMetrics.reduce((sum, m) => sum + m.totalExpenses, 0), format: 'currency' },
            { label: 'Beneficio neto de flota', value: vehicleMetrics.reduce((sum, m) => sum + m.netProfit, 0), format: 'currency' },
          ],
        };
      case 'client':
        return {
          ...baseData,
          clientMetrics,
          kpis: [
            { label: 'Clientes analizados', value: clientMetrics.length, format: 'number' },
            { label: 'Pagos registrados en el periodo', value: clientMetrics.reduce((sum, m) => sum + m.totalPayments, 0), format: 'currency' },
            { label: 'Saldo pendiente vigente', value: clientMetrics.reduce((sum, m) => sum + Math.max(0, m.balance), 0), format: 'currency' },
            { label: 'Clientes con saldo crítico', value: clientMetrics.filter(m => m.balance > 5000).length, format: 'number' },
          ],
        };
      case 'partner':
        return {
          ...baseData,
          partnerMetrics,
          kpis: [
            { label: 'Socios analizados', value: partnerMetrics.length, format: 'number' },
            { label: 'Ingresos asociados', value: partnerMetrics.reduce((sum, m) => sum + m.totalIncome, 0), format: 'currency' },
            { label: 'Gastos asociados', value: partnerMetrics.reduce((sum, m) => sum + m.totalExpenses, 0), format: 'currency' },
            { label: 'Balance neto de socios', value: partnerMetrics.reduce((sum, m) => sum + m.netBalance, 0), format: 'currency' },
          ],
        };
      default:
        return {
          ...baseData,
          kpis: [
            { label: 'Ingresos', value: financialSummary.income, format: 'currency' },
            { label: 'Gastos', value: financialSummary.expenses, format: 'currency' },
            { label: 'Beneficio neto', value: financialSummary.netProfit, format: 'currency' },
            { label: 'Margen', value: financialSummary.profitMargin, format: 'percent' },
          ],
        };
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
      default:
        return '';
    }
  };

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
      toast.success('Reporte PDF generado');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
      toast.success('Reporte Excel generado');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Error al generar el Excel');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  if (!financialSummary) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[18px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="fe-module-header">
          <div>
            <div className="fe-module-eyebrow">Análisis</div>
            <h1 className="fe-module-title">Reportes</h1>
            <p className="fe-module-subtitle">Genera reportes a partir de los análisis financieros y operativos</p>
          </div>
          <div className="fe-module-actions flex flex-wrap items-end gap-2">
            <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
              <SelectTrigger className="w-[180px] border-white/10 bg-white/[0.03] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financial">Financiero</SelectItem>
                <SelectItem value="vehicle">Vehículos</SelectItem>
                <SelectItem value="client">Clientes</SelectItem>
                <SelectItem value="partner">Socios</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wide text-white/35">Desde</Label>
              <Input
                type="date"
                max={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined}
                value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                onChange={e => {
                  const newDate = e.target.value ? startOfDay(new Date(`${e.target.value}T00:00:00`)) : undefined;
                  setDateRange(prev => ({ from: newDate, to: prev?.to }));
                }}
                className="w-[150px] border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wide text-white/35">Hasta</Label>
              <Input
                type="date"
                min={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined}
                value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                onChange={e => {
                  const newDate = e.target.value ? endOfDay(new Date(`${e.target.value}T00:00:00`)) : undefined;
                  setDateRange(prev => ({ from: prev?.from, to: newDate }));
                }}
                className="w-[150px] border-white/10 bg-white/[0.03] text-white"
              />
            </div>

            <Button
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="h-11 rounded-xl bg-[#d7ff3f] px-3 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
            >
              {isGeneratingPDF ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              )}
              PDF
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={isGeneratingExcel}
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              {isGeneratingExcel ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <FileSpreadsheet className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              )}
              Excel
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportType === 'financial' && <>
            <MetricCard title="Ingresos" value={formatCurrency(financialSummary.income)} description="vs periodo anterior" icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />} variant="success" trend={financialSummary.incomeChange} />
            <MetricCard title="Gastos" value={formatCurrency(financialSummary.expenses)} description="vs periodo anterior" icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />} variant="danger" trend={financialSummary.expensesChange} />
            <MetricCard title="Beneficio neto" value={formatCurrency(financialSummary.netProfit)} description="vs periodo anterior" icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />} variant={financialSummary.netProfit >= 0 ? 'success' : 'danger'} trend={financialSummary.profitChange} />
            <MetricCard title="Margen" value={`${financialSummary.profitMargin.toFixed(1)}%`} description={`${financialSummary.transactionsCount} transacciones`} icon={<PieChartIcon className="h-5 w-5" strokeWidth={1.75} />} />
          </>}
          {reportType === 'vehicle' && <>
            <MetricCard title="Vehículos analizados" value={vehicleMetrics.length} description="Flota en el periodo" icon={<BarChart3 className="h-5 w-5" strokeWidth={1.75} />} />
            <MetricCard title="Ingresos de flota" value={formatCurrency(vehicleMetrics.reduce((sum, m) => sum + m.totalIncome, 0))} description="Ingresos asociados a vehículos" icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />} variant="success" />
            <MetricCard title="Gastos de flota" value={formatCurrency(vehicleMetrics.reduce((sum, m) => sum + m.totalExpenses, 0))} description="Gastos asociados a vehículos" icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />} variant="danger" />
            <MetricCard title="Beneficio de flota" value={formatCurrency(vehicleMetrics.reduce((sum, m) => sum + m.netProfit, 0))} description="Ingresos menos gastos" icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />} variant={vehicleMetrics.reduce((sum, m) => sum + m.netProfit, 0) >= 0 ? 'success' : 'danger'} />
          </>}
          {reportType === 'client' && <>
            <MetricCard title="Clientes analizados" value={clientMetrics.length} description="Clientes incluidos" icon={<BarChart3 className="h-5 w-5" strokeWidth={1.75} />} />
            <MetricCard title="Pagos registrados" value={formatCurrency(clientMetrics.reduce((sum, m) => sum + m.totalPayments, 0))} description="En el periodo seleccionado" icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />} variant="success" />
            <MetricCard title="Saldo pendiente" value={formatCurrency(clientMetrics.reduce((sum, m) => sum + Math.max(0, m.balance), 0))} description="Saldos vigentes de clientes" icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />} variant="danger" />
            <MetricCard title="Saldos críticos" value={clientMetrics.filter(m => m.balance > 5000).length} description="Más de $5,000 pendientes" icon={<PieChartIcon className="h-5 w-5" strokeWidth={1.75} />} />
          </>}
          {reportType === 'partner' && <>
            <MetricCard title="Socios analizados" value={partnerMetrics.length} description="Socios incluidos" icon={<BarChart3 className="h-5 w-5" strokeWidth={1.75} />} />
            <MetricCard title="Ingresos asociados" value={formatCurrency(partnerMetrics.reduce((sum, m) => sum + m.totalIncome, 0))} description="En el periodo seleccionado" icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />} variant="success" />
            <MetricCard title="Gastos asociados" value={formatCurrency(partnerMetrics.reduce((sum, m) => sum + m.totalExpenses, 0))} description="En el periodo seleccionado" icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />} variant="danger" />
            <MetricCard title="Balance neto de socios" value={formatCurrency(partnerMetrics.reduce((sum, m) => sum + m.netBalance, 0))} description="Resultado agregado" icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />} />
          </>}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-1 sm:grid-cols-4">
            {(['overview', 'trends', 'details', 'analysis'] as const).map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-xl text-xs text-white/50 data-[state=active]:bg-[#d7ff3f] data-[state=active]:text-[#080a0f]"
              >
                {tab === 'overview' && 'Resumen'}
                {tab === 'trends' && 'Tendencias'}
                {tab === 'details' && 'Detalles'}
                {tab === 'analysis' && 'Análisis'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {reportType === 'financial' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <ChartPanel title="Ingresos vs gastos del periodo">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 16, right: 16, left: 12, bottom: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <YAxis tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={82} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" name="Monto" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Top 5 categorías de gasto">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={categoryChartData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                    />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {categoryChartData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
            ) : reportType === 'vehicle' ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel title="Ingresos y gastos por vehículo">
                  {vehicleMetrics.length === 0 ? <EmptyChart message="No hay movimientos asociados a vehículos en este periodo." /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={vehicleMetrics.slice(0, 8).map(m => ({ name: m.vehicle.alias || m.vehicle.plate || m.vehicle.id, ingresos: m.totalIncome, gastos: m.totalExpenses }))} margin={{ top: 8, right: 8, left: 8, bottom: 36 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} angle={-18} textAnchor="end" interval={0} height={54} />
                        <YAxis tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={82} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                        <Bar dataKey="ingresos" name="Ingresos" fill="#a3e635" radius={[5, 5, 0, 0]} />
                        <Bar dataKey="gastos" name="Gastos" fill="#fb7185" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartPanel>
                <ChartPanel title="Beneficio neto por vehículo">
                  {vehicleMetrics.length === 0 ? <EmptyChart message="No hay vehículos para comparar." /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={vehicleMetrics.slice(0, 8).map(m => ({ name: m.vehicle.alias || m.vehicle.plate || m.vehicle.id, beneficio: m.netProfit }))} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={95} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="beneficio" name="Beneficio neto" radius={[0, 6, 6, 0]} fill="#d7ff3f" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartPanel>
              </div>
            ) : reportType === 'client' ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel title="Pagos registrados por cliente">
                  {clientMetrics.length === 0 ? <EmptyChart message="No hay clientes para el periodo seleccionado." /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={clientMetrics.slice(0, 8).map(m => ({ name: `${m.client.firstname} ${m.client.lastname}`.trim(), pagos: m.totalPayments }))} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="pagos" name="Pagos" fill="#a3e635" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartPanel>
                <ChartPanel title="Distribución de comportamiento de pago">
                  {clientMetrics.length === 0 ? <EmptyChart message="No hay datos de comportamiento para mostrar." /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={Object.entries(clientMetrics.reduce<Record<string, number>>((acc, m) => { acc[m.paymentBehavior] = (acc[m.paymentBehavior] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={58} outerRadius={92} paddingAngle={3}>
                          {Object.keys(clientMetrics.reduce<Record<string, number>>((acc, m) => { acc[m.paymentBehavior] = (acc[m.paymentBehavior] || 0) + 1; return acc; }, {})).map((name, index) => <Cell key={name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartPanel>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel title="Ingresos y gastos por socio">
                  {partnerMetrics.length === 0 ? <EmptyChart message="No hay socios con información disponible." /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={partnerMetrics.slice(0, 8).map(m => ({ name: m.partner.name || `${m.partner.firstname} ${m.partner.lastname}`.trim(), ingresos: m.totalIncome, gastos: m.totalExpenses }))} margin={{ top: 8, right: 8, left: 8, bottom: 36 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} angle={-18} textAnchor="end" interval={0} height={54} />
                        <YAxis tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={82} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="ingresos" name="Ingresos" fill="#a3e635" radius={[5, 5, 0, 0]} />
                        <Bar dataKey="gastos" name="Gastos" fill="#fb7185" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartPanel>
                <ChartPanel title="Vehículos activos por socio">
                  {partnerMetrics.length === 0 ? <EmptyChart message="No hay datos de socios para comparar." /> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={partnerMetrics.slice(0, 8).map(m => ({ name: m.partner.name || `${m.partner.firstname} ${m.partner.lastname}`.trim(), vehiculos: m.activeVehicles }))} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                        <Bar dataKey="vehiculos" name="Vehículos activos" fill="#38bdf8" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartPanel>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {reportType === 'financial' ? (
            <ChartPanel title="Tendencia mensual (6 meses)">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                  <Line type="monotone" dataKey="income" stroke="#d7ff3f" strokeWidth={2} name="Ingresos" />
                  <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2} name="Gastos" />
                  <Area type="monotone" dataKey="netProfit" fill="#d7ff3f20" stroke="#a3e635" name="Neto" />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
            ) : reportType === 'vehicle' ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel title="Rentabilidad comparada por vehículo">
                  {vehicleMetrics.length === 0 ? <EmptyChart message="No hay datos en el periodo." /> : <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vehicleMetrics.slice(0, 10).map(m => ({ name: m.vehicle.alias || m.vehicle.plate || m.vehicle.id, beneficio: m.netProfit, margen: m.profitability }))} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                      <Tooltip formatter={(v: number, name: string) => name === 'margen' ? `${v.toFixed(1)}%` : formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="beneficio" name="Beneficio neto" radius={[0, 6, 6, 0]} fill="#d7ff3f" />
                    </BarChart>
                  </ResponsiveContainer>}
                </ChartPanel>
                <ChartPanel title="Utilización por vehículo en el periodo">
                  {vehicleMetrics.length === 0 ? <EmptyChart message="No hay vehículos para calcular utilización." /> : <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vehicleMetrics.slice(0, 10).map(m => ({ name: m.vehicle.alias || m.vehicle.plate || m.vehicle.id, utilizacion: m.utilizationRate }))} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="utilizacion" name="Utilización del periodo" fill="#38bdf8" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>}
                </ChartPanel>
              </div>
            ) : reportType === 'client' ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel title="Saldos pendientes por cliente">
                  {clientMetrics.length === 0 ? <EmptyChart message="No hay clientes para comparar." /> : <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={clientMetrics.filter(m => m.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 10).map(m => ({ name: `${m.client.firstname} ${m.client.lastname}`.trim(), saldo: m.balance }))} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="saldo" name="Saldo vigente" fill="#fb7185" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>}
                </ChartPanel>
                <ChartPanel title="Pagos por cliente">
                  {clientMetrics.length === 0 ? <EmptyChart message="No hay pagos registrados." /> : <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={clientMetrics.slice(0, 10).map(m => ({ name: `${m.client.firstname} ${m.client.lastname}`.trim(), pagos: m.totalPayments }))} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="pagos" name="Pagos del periodo" fill="#38bdf8" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>}
                </ChartPanel>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel title="Balance neto por socio">
                  {partnerMetrics.length === 0 ? <EmptyChart message="No hay socios con movimientos en este periodo." /> : <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={partnerMetrics.slice(0, 10).map(m => ({ name: m.partner.name || `${m.partner.firstname} ${m.partner.lastname}`.trim(), balance: m.netBalance }))} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="balance" name="Balance neto" radius={[0, 6, 6, 0]} fill="#d7ff3f" />
                    </BarChart>
                  </ResponsiveContainer>}
                </ChartPanel>
                <ChartPanel title="Ingresos y gastos por socio">
                  {partnerMetrics.length === 0 ? <EmptyChart message="No hay datos en el periodo." /> : <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={partnerMetrics.slice(0, 8).map(m => ({ name: m.partner.name || `${m.partner.firstname} ${m.partner.lastname}`.trim(), ingresos: m.totalIncome, gastos: m.totalExpenses }))} margin={{ top: 8, right: 8, left: 8, bottom: 36 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} angle={-18} textAnchor="end" interval={0} height={54} />
                      <YAxis tickFormatter={formatChartCurrency} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={82} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                      <Bar dataKey="ingresos" name="Ingresos" fill="#a3e635" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="gastos" name="Gastos" fill="#fb7185" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>}
                </ChartPanel>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {reportType === 'vehicle' && (
              <MetricsList
                title="Rentabilidad por vehículo"
                empty="Sin datos de vehículos"
                items={vehicleMetrics.slice(0, 10).map((m: any) => ({
                  id: m.vehicle.id,
                  primary: m.vehicle.alias || m.vehicle.plate,
                  secondary: m.vehicle.plate,
                  value: formatCurrency(m.netProfit),
                  meta: `${m.profitability?.toFixed?.(1) ?? 0}%`,
                  positive: m.netProfit >= 0,
                }))}
              />
            )}
            {reportType === 'client' && (
              <MetricsList
                title="Análisis de clientes"
                empty="Sin datos de clientes"
                items={clientMetrics.slice(0, 10).map((m: any) => ({
                  id: m.client.id,
                  primary: `${m.client.firstname} ${m.client.lastname}`,
                  secondary: m.paymentBehavior,
                  value: formatCurrency(m.totalPayments),
                  meta: `Bal. ${formatCurrency(m.balance)}`,
                  positive: m.balance <= 0,
                }))}
              />
            )}
            {reportType === 'partner' && (
              <MetricsList
                title="Análisis de socios"
                empty="Sin datos de socios"
                items={partnerMetrics.map((m: any) => ({
                  id: m.partner.id,
                  primary: `${m.partner.firstname} ${m.partner.lastname}`,
                  secondary: `${m.activeVehicles} vehículos`,
                  value: formatCurrency(m.netBalance),
                  meta: `Ing. ${formatCurrency(m.totalIncome)}`,
                  positive: m.netBalance >= 0,
                }))}
              />
            )}
            {reportType === 'financial' && (
              <ChartPanel title="Resumen financiero del periodo">
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ['Ingresos', formatCurrency(financialSummary.income), 'text-emerald-300'],
                      ['Gastos', formatCurrency(financialSummary.expenses), 'text-rose-300'],
                      [
                        'Neto',
                        formatCurrency(financialSummary.netProfit),
                        financialSummary.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300',
                      ],
                    ] as const
                  ).map(([label, val, color]) => (
                    <div key={label} className="rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</p>
                      <p className={cn('mt-1 font-heading text-xl font-semibold tabular-nums', color)}>{val}</p>
                    </div>
                  ))}
                </div>
              </ChartPanel>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {reportType === 'vehicle' && (
                <MetricsList
                  title="Top vehículos por utilidad"
                  empty="Sin datos"
                  items={(
                    ReportAnalyticsService.getTopVehicles?.(vehicleMetrics, 5) || vehicleMetrics.slice(0, 5)
                  ).map((m: any, i: number) => ({
                    id: m.vehicle.id,
                    primary: m.vehicle.alias || m.vehicle.plate,
                    secondary: `#${i + 1}`,
                    value: formatCurrency(m.netProfit),
                    meta: `${m.profitability?.toFixed?.(1) ?? 0}%`,
                    positive: true,
                  }))}
                />
              )}
              {reportType === 'client' && (
                <MetricsList
                  title="Top clientes por pagos"
                  empty="Sin datos"
                  items={(
                    ReportAnalyticsService.getTopClients?.(clientMetrics, 5) || clientMetrics.slice(0, 5)
                  ).map((m: any) => ({
                    id: m.client.id,
                    primary: `${m.client.firstname} ${m.client.lastname}`,
                    secondary: m.paymentBehavior,
                    value: formatCurrency(m.totalPayments),
                    meta: `Bal. ${formatCurrency(m.balance)}`,
                    positive: m.balance <= 0,
                  }))}
                />
              )}
              {reportType === 'partner' && (
                <MetricsList
                  title="Socios por balance neto"
                  empty="Sin datos de socios"
                  items={partnerMetrics.slice(0, 10).map(m => ({
                    id: m.partner.id,
                    primary: m.partner.name || `${m.partner.firstname} ${m.partner.lastname}`.trim(),
                    secondary: `${m.activeVehicles} vehículos activos · ${m.transactionsCount} movimientos`,
                    value: formatCurrency(m.netBalance),
                    meta: `Ingresos ${formatCurrency(m.totalIncome)} · Gastos ${formatCurrency(m.totalExpenses)}`,
                    positive: m.netBalance >= 0,
                  }))}
                />
              )}
              {reportType === 'financial' && (
                <ChartPanel title="Indicadores clave del periodo">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {([
                      ['Ingresos', formatCurrency(financialSummary.income), 'text-emerald-300'],
                      ['Gastos', formatCurrency(financialSummary.expenses), 'text-rose-300'],
                      ['Beneficio neto', formatCurrency(financialSummary.netProfit), financialSummary.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'],
                    ] as const).map(([label, value, color]) => (
                      <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</p>
                        <p className={cn('mt-2 text-xl font-semibold tabular-nums', color)}>{value}</p>
                      </div>
                    ))}
                  </div>
                </ChartPanel>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function formatChartCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-5 text-center">
      <BarChart3 className="h-7 w-7 text-white/25" strokeWidth={1.5} />
      <p className="max-w-xs text-sm text-white/45">{message}</p>
      <p className="text-[11px] text-white/25">Prueba otro rango de fechas o revisa los movimientos asociados.</p>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="font-heading text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function MetricsList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; primary: string; secondary?: string; value: string; meta?: string; positive?: boolean }[];
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="font-heading text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="divide-y divide-white/[0.04] p-2 sm:p-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/35">{empty}</p>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white/90">{item.primary}</p>
                {item.secondary && <p className="truncate text-xs text-white/40">{item.secondary}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    'font-heading text-sm font-semibold tabular-nums',
                    item.positive === false ? 'text-rose-300' : 'text-emerald-300'
                  )}
                >
                  {item.value}
                </p>
                {item.meta && <p className="text-[11px] text-white/35">{item.meta}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
