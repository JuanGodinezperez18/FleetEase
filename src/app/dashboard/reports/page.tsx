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
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
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
import { supabase } from '@/lib/supabase';
import { MetricCard } from '@/components/dashboard/components/MetricCard';
import Link from 'next/link';

type ReportType = 'financial' | 'vehicle' | 'client' | 'partner' | 'executive';

const CHART_COLORS = ['#d7ff3f', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f'];
const TOOLTIP_STYLE = {
  backgroundColor: '#0e1117',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
};

export default function ReportsPageImproved() {
  const { financialRecords, vehicles, clients, partners, financialCategories, selectedCompanyId, clientBalances } = useData();
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
    partners,
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
      transactionsCount: financialRecords.filter(r => !r.isDeleted && isWithinInterval(new Date(r.date), { start: dateRange.from!, end: dateRange.to! })).length,
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
      { from: dateRange.from, to: dateRange.to }
    );
  }, [vehicles, financialRecords, dateRange]);

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
        return { ...baseData, vehicleMetrics };
      case 'client':
        return { ...baseData, clientMetrics };
      case 'partner':
        return { ...baseData, partnerMetrics };
      case 'executive':
        return { ...baseData, vehicleMetrics, clientMetrics, partnerMetrics };
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

  const saveReportToSupabase = async (type: 'pdf' | 'excel', filename: string) => {
    if (!selectedCompanyId || !currentUser) return;
    try {
      await supabase.from('generated_reports').insert({
        company_id: selectedCompanyId,
        type: reportType,
        format: type,
        filename,
        date_range: dateRange
          ? {
              from: dateRange.from?.toISOString(),
              to: dateRange.to?.toISOString(),
            }
          : null,
        created_by: currentUser.uid,
        created_by_name: currentUser.name,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving report to Supabase:', error);
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
      await saveReportToSupabase('pdf', filename);
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
      await saveReportToSupabase('excel', filename);
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
            <h1 className="fe-module-title">Reporte ejecutivo</h1>
            <p className="fe-module-subtitle">Análisis con exportación PDF y Excel</p>
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
                <SelectItem value="executive">Ejecutivo</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wide text-white/35">Desde</Label>
              <Input
                type="date"
                value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                onChange={e => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined;
                  setDateRange(prev => ({ from: newDate, to: prev?.to }));
                }}
                className="w-[150px] border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase tracking-wide text-white/35">Hasta</Label>
              <Input
                type="date"
                value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                onChange={e => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined;
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
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Link href="/dashboard/reports/history">Historial</Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Ingresos"
            value={formatCurrency(financialSummary.income)}
            description="vs periodo anterior"
            icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
            variant="success"
            trend={financialSummary.incomeChange}
          />
          <MetricCard
            title="Gastos"
            value={formatCurrency(financialSummary.expenses)}
            description="vs periodo anterior"
            icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />}
            variant="danger"
            trend={financialSummary.expensesChange}
          />
          <MetricCard
            title="Beneficio neto"
            value={formatCurrency(financialSummary.netProfit)}
            description="vs periodo anterior"
            icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />}
            variant={financialSummary.netProfit >= 0 ? 'success' : 'danger'}
            trend={financialSummary.profitChange}
          />
          <MetricCard
            title="Margen"
            value={`${financialSummary.profitMargin.toFixed(1)}%`}
            description={`${financialSummary.transactionsCount} transacciones`}
            icon={<PieChartIcon className="h-5 w-5" strokeWidth={1.75} />}
          />
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
            <div className="grid gap-4 md:grid-cols-2">
              <ChartPanel title="Ingresos vs gastos">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
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
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <ChartPanel title="Tendencia mensual (6 meses)">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="income" stroke="#d7ff3f" strokeWidth={2} name="Ingresos" />
                  <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2} name="Gastos" />
                  <Area type="monotone" dataKey="netProfit" fill="#d7ff3f20" stroke="#a3e635" name="Neto" />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {(reportType === 'vehicle' || reportType === 'executive') && (
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
            {(reportType === 'client' || reportType === 'executive') && (
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
            {(reportType === 'partner' || reportType === 'executive') && (
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
              {(reportType === 'vehicle' || reportType === 'executive') && (
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
              {(reportType === 'client' || reportType === 'executive') && (
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
              {reportType === 'financial' && (
                <ChartPanel title="Distribución">
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/40">
                    <BarChart3 className="h-5 w-5 text-[#d7ff3f]" strokeWidth={1.75} />
                    Usa la pestaña Resumen para gráficos del periodo.
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
