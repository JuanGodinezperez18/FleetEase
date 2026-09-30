import type * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { ReportData, ReportKpi, KpiFormat } from './pdf-generator';

function toNumber(value: string | number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatKpiDisplay(kpi: ReportKpi): string {
  const fmt: KpiFormat = kpi.format || 'currency';
  const n = toNumber(kpi.value);

  if (fmt === 'number' && n !== null) {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n);
  }
  if (fmt === 'percent' && n !== null) {
    return `${n.toFixed(1)}%`;
  }
  if (fmt === 'currency' && n !== null) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(n);
  }
  return String(kpi.value);
}

/**
 * Genera un reporte Excel profesional con múltiples hojas
 */
export class ExcelReportGenerator {
  private xlsx!: typeof import('xlsx');
  private workbook!: XLSX.WorkBook;

  async generate(data: ReportData): Promise<Blob> {
    this.xlsx = await import('xlsx');
    this.workbook = this.xlsx.utils.book_new();
    this.addSummarySheet(data);

    if (data.kpis && data.kpis.length > 0) {
      this.addKpisSheet(data.kpis);
    }

    switch (data.type) {
      case 'financial':
        this.addFinancialSheets(data);
        break;
      case 'vehicle':
        this.addVehicleSheets(data);
        break;
      case 'client':
        this.addClientSheets(data);
        break;
      case 'partner':
        this.addPartnerSheets(data);
        break;
    }

    const excelBuffer = this.xlsx.write(this.workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  private addSummarySheet(data: ReportData) {
    const summaryData: (string | number)[][] = [
      ['RESUMEN DEL REPORTE'],
      [''],
      ['Titulo', data.title],
      ['Subtitulo', data.subtitle || ''],
      [
        'Periodo',
        `${format(data.dateRange.from, 'dd/MM/yyyy')} - ${format(data.dateRange.to, 'dd/MM/yyyy')}`,
      ],
      ['Generado', format(new Date(), 'dd/MM/yyyy HH:mm')],
      ['Generado por', data.generatedBy || ''],
      [''],
      ['RESUMEN FINANCIERO'],
      [''],
    ];

    if (data.income !== undefined) {
      summaryData.push(['Ingresos Totales', data.income]);
    }
    if (data.expenses !== undefined) {
      summaryData.push(['Gastos Totales', data.expenses]);
    }
    if (data.netProfit !== undefined) {
      summaryData.push(['Beneficio Neto', data.netProfit]);
    }
    if (data.profitMargin !== undefined) {
      summaryData.push(['Margen de Beneficio %', Number(data.profitMargin.toFixed(2))]);
    }
    if (data.transactionsCount !== undefined) {
      summaryData.push(['Numero de Transacciones', data.transactionsCount]);
    }

    if (data.kpis && data.kpis.length > 0) {
      summaryData.push(['']);
      summaryData.push(['KPIs SELECCIONADOS']);
      summaryData.push(['']);
      data.kpis.forEach(kpi => {
        summaryData.push([kpi.label, formatKpiDisplay(kpi)]);
        if (kpi.subtitle) {
          summaryData.push(['  detalle', kpi.subtitle]);
        }
      });
    }

    const worksheet = this.xlsx.utils.aoa_to_sheet(summaryData);
    worksheet['!cols'] = [{ wch: 32 }, { wch: 28 }];
    this.xlsx.utils.book_append_sheet(this.workbook, worksheet, 'Resumen');
  }

  private addKpisSheet(kpis: ReportKpi[]) {
    const rows: (string | number)[][] = [
      ['Indicadores del Dashboard'],
      [''],
      ['Indicador', 'Valor', 'Formato', 'Detalle'],
    ];

    kpis.forEach(kpi => {
      const n = toNumber(kpi.value);
      rows.push([
        kpi.label,
        n !== null ? n : String(kpi.value),
        kpi.format || 'auto',
        kpi.subtitle || '',
      ]);
    });

    const worksheet = this.xlsx.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 40 }];
    this.xlsx.utils.book_append_sheet(this.workbook, worksheet, 'KPIs');
  }

  private addFinancialSheets(data: ReportData) {
    if (data.expensesByCategory && Object.keys(data.expensesByCategory).length > 0) {
      const expensesData: (string | number)[][] = [
        ['Gastos por Categoria'],
        [''],
        ['Categoria', 'Monto', '% del Total'],
      ];

      Object.entries(data.expensesByCategory)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, amount]) => {
          expensesData.push([
            category,
            amount,
            Number(((amount / (data.expenses || 1)) * 100).toFixed(2)),
          ]);
        });

      expensesData.push(['']);
      expensesData.push(['Total', data.expenses || 0, 100]);

      const worksheet = this.xlsx.utils.aoa_to_sheet(expensesData);
      worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }];
      this.xlsx.utils.book_append_sheet(this.workbook, worksheet, 'Gastos por Categoria');
    }

    if (data.incomeByCategory && Object.keys(data.incomeByCategory).length > 0) {
      const incomeData: (string | number)[][] = [
        ['Ingresos por Categoria'],
        [''],
        ['Categoria', 'Monto', '% del Total'],
      ];

      Object.entries(data.incomeByCategory)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, amount]) => {
          incomeData.push([
            category,
            amount,
            Number(((amount / (data.income || 1)) * 100).toFixed(2)),
          ]);
        });

      incomeData.push(['']);
      incomeData.push(['Total', data.income || 0, 100]);

      const worksheet = this.xlsx.utils.aoa_to_sheet(incomeData);
      worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }];
      this.xlsx.utils.book_append_sheet(this.workbook, worksheet, 'Ingresos por Categoria');
    }

    if (data.records && data.records.length > 0) {
      const recordsData: (string | number)[][] = [
        ['Detalle de Transacciones'],
        [''],
        ['Fecha', 'Tipo', 'Categoria', 'Descripcion', 'Monto', 'Vehiculo'],
      ];

      data.records.forEach(record => {
        recordsData.push([
          format(new Date(record.date), 'dd/MM/yyyy'),
          record.type === 'income' ? 'Ingreso' : 'Gasto',
          record.category || 'N/A',
          record.description || '',
          record.amount,
          record.vehicleId || 'N/A',
        ]);
      });

      const worksheet = this.xlsx.utils.aoa_to_sheet(recordsData);
      worksheet['!cols'] = [
        { wch: 12 },
        { wch: 10 },
        { wch: 20 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
      ];
      this.xlsx.utils.book_append_sheet(this.workbook, worksheet, 'Transacciones');
    }
  }

  private addVehicleSheets(data: ReportData) {
    if (!data.vehicleMetrics || data.vehicleMetrics.length === 0) return;

    const vehicleData: (string | number)[][] = [
      ['Analisis de Rentabilidad por Vehiculo'],
      [''],
      [
        'Vehiculo',
        'Placa',
        'Marca',
        'Modelo',
        'Ano',
        'Ingresos',
        'Gastos',
        'Beneficio Neto',
        'Rentabilidad %',
        'Tasa Utilizacion %',
      ],
    ];

    data.vehicleMetrics.forEach(metric => {
      vehicleData.push([
        metric.vehicle.alias || `${metric.vehicle.make} ${metric.vehicle.model}`,
        metric.vehicle.plate,
        metric.vehicle.make,
        metric.vehicle.model,
        metric.vehicle.year,
        metric.totalIncome,
        metric.totalExpenses,
        metric.netProfit,
        Number(metric.profitability.toFixed(2)),
        metric.utilizationRate != null ? Number(metric.utilizationRate.toFixed(2)) : 'N/A',
      ]);
    });

    const worksheet = this.xlsx.utils.aoa_to_sheet(vehicleData);
    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 14 },
      { wch: 16 },
    ];
    this.xlsx.utils.book_append_sheet(this.workbook, worksheet, 'Rentabilidad Vehiculos');
  }

  private addClientSheets(data: ReportData) {
    if (!data.clientMetrics || data.clientMetrics.length === 0) return;

    const clientData: (string | number)[][] = [
      ['Analisis de Clientes'],
      [''],
      [
        'Cliente',
        'Telefono',
        'Email',
        'Pagos Totales',
        'Balance',
        'Dias Ultimo Pago',
        'Comportamiento',
      ],
    ];

    data.clientMetrics.forEach(metric => {
      clientData.push([
        `${metric.client.firstname} ${metric.client.lastname}`,
        metric.client.phone,
        metric.client.email || 'N/A',
        metric.totalPayments,
        metric.balance,
        metric.daysSinceLastPayment >= 0 ? metric.daysSinceLastPayment : 'N/A',
        metric.paymentBehavior,
      ]);
    });

    const worksheet = this.xlsx.utils.aoa_to_sheet(clientData);
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 16 },
      { wch: 20 },
    ];
    this.xlsx.utils.book_append_sheet(this.workbook, worksheet, 'Analisis Clientes');
  }

  private addPartnerSheets(data: ReportData) {
    if (!data.partnerMetrics || data.partnerMetrics.length === 0) return;

    const partnerData: (string | number)[][] = [
      ['Analisis de Socios'],
      [''],
      ['Socio', 'Telefono', 'Email', 'Vehiculos Activos', 'Ingresos', 'Gastos', 'Balance Neto'],
    ];

    data.partnerMetrics.forEach(metric => {
      partnerData.push([
        `${metric.partner.firstname} ${metric.partner.lastname}`,
        metric.partner.phone ?? '',
        metric.partner.email || 'N/A',
        metric.activeVehicles,
        metric.totalIncome,
        metric.totalExpenses,
        metric.netBalance,
      ]);
    });

    const worksheet = this.xlsx.utils.aoa_to_sheet(partnerData);
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 16 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    this.xlsx.utils.book_append_sheet(this.workbook, worksheet, 'Analisis Socios');
  }
}

export async function generateExcelReport(data: ReportData): Promise<Blob> {
  const generator = new ExcelReportGenerator();
  return generator.generate(data);
}

export function downloadExcel(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
