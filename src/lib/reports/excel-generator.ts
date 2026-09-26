import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ReportData } from './pdf-generator';

/**
 * Genera un reporte Excel profesional con múltiples hojas
 */
export class ExcelReportGenerator {
  private workbook: XLSX.WorkBook;

  constructor() {
    this.workbook = XLSX.utils.book_new();
  }

  /**
   * Genera el reporte completo
   */
  generate(data: ReportData): Blob {
    this.addSummarySheet(data);

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

    // Generar archivo Excel
    const excelBuffer = XLSX.write(this.workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /**
   * Agrega hoja de resumen
   */
  private addSummarySheet(data: ReportData) {
    const summaryData: any[][] = [
      ['RESUMEN DEL REPORTE'],
      [''],
      ['Título:', data.title],
      ['Subtítulo:', data.subtitle || ''],
      ['Período:', `${format(data.dateRange.from, 'PPP', { locale: es })} - ${format(data.dateRange.to, 'PPP', { locale: es })}`],
      ['Generado:', format(new Date(), 'PPP p', { locale: es })],
      ['Generado por:', data.generatedBy || ''],
      [''],
      ['RESUMEN FINANCIERO'],
      [''],
    ];

    if (data.income !== undefined) {
      summaryData.push(['Ingresos Totales', this.formatCurrency(data.income)]);
    }

    if (data.expenses !== undefined) {
      summaryData.push(['Gastos Totales', this.formatCurrency(data.expenses)]);
    }

    if (data.netProfit !== undefined) {
      summaryData.push(['Beneficio Neto', this.formatCurrency(data.netProfit)]);
    }

    if (data.profitMargin !== undefined) {
      summaryData.push(['Margen de Beneficio', `${data.profitMargin.toFixed(2)}%`]);
    }

    if (data.transactionsCount !== undefined) {
      summaryData.push(['Número de Transacciones', data.transactionsCount]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Aplicar estilos (ancho de columnas)
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Resumen');
  }

  /**
   * Agrega hojas de reporte financiero
   */
  private addFinancialSheets(data: ReportData) {
    // Hoja de gastos por categoría
    if (data.expensesByCategory && Object.keys(data.expensesByCategory).length > 0) {
      const expensesData: any[][] = [
        ['Gastos por Categoría'],
        [''],
        ['Categoría', 'Monto', '% del Total'],
      ];

      Object.entries(data.expensesByCategory)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, amount]) => {
          expensesData.push([
            category,
            amount,
            ((amount / (data.expenses || 1)) * 100).toFixed(2) + '%',
          ]);
        });

      expensesData.push(['']);
      expensesData.push(['Total', data.expenses, '100%']);

      const worksheet = XLSX.utils.aoa_to_sheet(expensesData);
      worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];

      XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Gastos por Categoría');
    }

    // Hoja de ingresos por categoría
    if (data.incomeByCategory && Object.keys(data.incomeByCategory).length > 0) {
      const incomeData: any[][] = [
        ['Ingresos por Categoría'],
        [''],
        ['Categoría', 'Monto', '% del Total'],
      ];

      Object.entries(data.incomeByCategory)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, amount]) => {
          incomeData.push([
            category,
            amount,
            ((amount / (data.income || 1)) * 100).toFixed(2) + '%',
          ]);
        });

      incomeData.push(['']);
      incomeData.push(['Total', data.income, '100%']);

      const worksheet = XLSX.utils.aoa_to_sheet(incomeData);
      worksheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];

      XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Ingresos por Categoría');
    }

    // Hoja de transacciones detalladas
    if (data.records && data.records.length > 0) {
      const recordsData: any[][] = [
        ['Detalle de Transacciones'],
        [''],
        ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Vehículo'],
      ];

      data.records.forEach(record => {
        recordsData.push([
          format(new Date(record.date), 'dd/MM/yyyy', { locale: es }),
          record.type === 'income' ? 'Ingreso' : 'Gasto',
          record.category || 'N/A',
          record.description || '',
          record.amount,
          record.vehicleId || 'N/A',
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(recordsData);
      worksheet['!cols'] = [
        { wch: 12 },
        { wch: 10 },
        { wch: 20 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Transacciones');
    }
  }

  /**
   * Agrega hojas de reporte de vehículos
   */
  private addVehicleSheets(data: ReportData) {
    if (!data.vehicleMetrics || data.vehicleMetrics.length === 0) return;

    const vehicleData: any[][] = [
      ['Análisis de Rentabilidad por Vehículo'],
      [''],
      ['Vehículo', 'Placa', 'Marca', 'Modelo', 'Año', 'Ingresos', 'Gastos', 'Beneficio Neto', 'Rentabilidad %', 'Tasa Utilización %'],
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
        metric.profitability.toFixed(2),
        metric.utilizationRate?.toFixed(2) || 'N/A',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(vehicleData);
    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Rentabilidad Vehículos');
  }

  /**
   * Agrega hojas de reporte de clientes
   */
  private addClientSheets(data: ReportData) {
    if (!data.clientMetrics || data.clientMetrics.length === 0) return;

    const clientData: any[][] = [
      ['Análisis de Clientes'],
      [''],
      ['Cliente', 'Teléfono', 'Email', 'Pagos Totales', 'Balance', 'Días Último Pago', 'Comportamiento de Pago'],
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

    const worksheet = XLSX.utils.aoa_to_sheet(clientData);
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Análisis Clientes');
  }

  /**
   * Agrega hojas de reporte de socios
   */
  private addPartnerSheets(data: ReportData) {
    if (!data.partnerMetrics || data.partnerMetrics.length === 0) return;

    const partnerData: any[][] = [
      ['Análisis de Socios'],
      [''],
      ['Socio', 'Teléfono', 'Email', 'Vehículos Activos', 'Ingresos', 'Gastos', 'Balance Neto'],
    ];

    data.partnerMetrics.forEach(metric => {
      partnerData.push([
        `${metric.partner.firstname} ${metric.partner.lastname}`,
        metric.partner.phone,
        metric.partner.email || 'N/A',
        metric.activeVehicles,
        metric.totalIncome,
        metric.totalExpenses,
        metric.netBalance,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(partnerData);
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Análisis Socios');
  }

  /**
   * Formatea un número como moneda
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  }
}

/**
 * Función auxiliar para generar un reporte Excel
 */
export async function generateExcelReport(data: ReportData): Promise<Blob> {
  const generator = new ExcelReportGenerator();
  return generator.generate(data);
}

/**
 * Función para descargar el Excel generado
 */
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
