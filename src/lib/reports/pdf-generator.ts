import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Vehicle, Client, Partner, FinancialRecord } from '@/types';

export interface ReportData {
  type: 'financial' | 'vehicle' | 'client' | 'partner' | 'executive';
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
  vehicles?: Vehicle[];
  vehicleMetrics?: Array<{
    vehicle: Vehicle;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitability: number;
    utilizationRate: number;
  }>;

  // Client data
  clients?: Client[];
  clientMetrics?: Array<{
    client: Client;
    totalPayments: number;
    balance: number;
    daysSinceLastPayment: number;
    paymentBehavior: string;
  }>;

  // Partner data
  partners?: Partner[];
  partnerMetrics?: Array<{
    partner: Partner;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    activeVehicles: number;
  }>;

  // Detailed records
  records?: FinancialRecord[];
}

/**
 * Genera un reporte PDF profesional
 */
export class PDFReportGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;
  private primaryColor: [number, number, number] = [37, 99, 235]; // Blue-600
  private secondaryColor: [number, number, number] = [100, 116, 139]; // Slate-500

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Genera el reporte completo
   */
  generate(data: ReportData): Blob {
    this.addHeader(data);
    this.addSummary(data);

    switch (data.type) {
      case 'financial':
        this.addFinancialReport(data);
        break;
      case 'vehicle':
        this.addVehicleReport(data);
        break;
      case 'client':
        this.addClientReport(data);
        break;
      case 'partner':
        this.addPartnerReport(data);
        break;
      case 'executive':
        this.addExecutiveReport(data);
        break;
    }

    this.addFooter();

    return this.doc.output('blob');
  }

  /**
   * Agrega el encabezado del reporte
   */
  private addHeader(data: ReportData) {
    // Logo/título de la empresa
    this.doc.setFontSize(22);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(data.companyName || 'FleetEase Manager', this.margin, this.currentY);

    this.currentY += 8;

    // Título del reporte
    this.doc.setFontSize(16);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(data.title, this.margin, this.currentY);

    this.currentY += 6;

    // Subtítulo y período
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.secondaryColor);

    const dateRangeText = `Período: ${format(data.dateRange.from, 'PPP', { locale: es })} - ${format(data.dateRange.to, 'PPP', { locale: es })}`;
    this.doc.text(dateRangeText, this.margin, this.currentY);

    this.currentY += 5;

    if (data.subtitle) {
      this.doc.text(data.subtitle, this.margin, this.currentY);
      this.currentY += 5;
    }

    // Fecha de generación
    const generatedText = `Generado: ${format(new Date(), 'PPP p', { locale: es })}${data.generatedBy ? ` por ${data.generatedBy}` : ''}`;
    this.doc.text(generatedText, this.margin, this.currentY);

    this.currentY += 10;

    // Línea divisoria
    this.doc.setDrawColor(...this.primaryColor);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);

    this.currentY += 8;
  }

  /**
   * Agrega el resumen ejecutivo
   */
  private addSummary(data: ReportData) {
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Resumen Ejecutivo', this.margin, this.currentY);

    this.currentY += 8;

    const summaryData: string[][] = [];

    if (data.income !== undefined) {
      summaryData.push(['Ingresos Totales', this.formatCurrency(data.income)]);
    }

    if (data.expenses !== undefined) {
      summaryData.push(['Gastos Totales', this.formatCurrency(data.expenses)]);
    }

    if (data.netProfit !== undefined) {
      const color = data.netProfit >= 0 ? '#10b981' : '#ef4444';
      summaryData.push(['Beneficio Neto', this.formatCurrency(data.netProfit)]);
    }

    if (data.profitMargin !== undefined) {
      summaryData.push(['Margen de Beneficio', `${data.profitMargin.toFixed(2)}%`]);
    }

    if (data.transactionsCount !== undefined) {
      summaryData.push(['Número de Transacciones', data.transactionsCount.toString()]);
    }

    if (summaryData.length > 0) {
      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Métrica', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 10,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 9,
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }
  }

  /**
   * Agrega el reporte financiero detallado
   */
  private addFinancialReport(data: ReportData) {
    // Gastos por categoría
    if (data.expensesByCategory && Object.keys(data.expensesByCategory).length > 0) {
      this.checkPageBreak(60);

      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Gastos por Categoría', this.margin, this.currentY);
      this.currentY += 8;

      const categoryData = Object.entries(data.expensesByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([category, amount]) => [
          category,
          this.formatCurrency(amount),
          `${((amount / (data.expenses || 1)) * 100).toFixed(1)}%`
        ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Categoría', 'Monto', '% del Total']],
        body: categoryData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 9,
        },
        styles: {
          fontSize: 8,
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }

    // Ingresos por categoría
    if (data.incomeByCategory && Object.keys(data.incomeByCategory).length > 0) {
      this.checkPageBreak(60);

      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Ingresos por Categoría', this.margin, this.currentY);
      this.currentY += 8;

      const categoryData = Object.entries(data.incomeByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([category, amount]) => [
          category,
          this.formatCurrency(amount),
          `${((amount / (data.income || 1)) * 100).toFixed(1)}%`
        ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Categoría', 'Monto', '% del Total']],
        body: categoryData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 9,
        },
        styles: {
          fontSize: 8,
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }

    // Detalle de transacciones
    if (data.records && data.records.length > 0) {
      this.checkPageBreak(80);

      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Detalle de Transacciones', this.margin, this.currentY);
      this.currentY += 8;

      const recordsData = data.records.map(record => [
        format(new Date(record.date), 'dd/MM/yyyy', { locale: es }),
        record.type === 'income' ? 'Ingreso' : 'Gasto',
        record.category || 'N/A',
        record.description || '',
        this.formatCurrency(record.amount),
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
        body: recordsData,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 8,
        },
        styles: {
          fontSize: 7,
        },
        columnStyles: {
          3: { cellWidth: 60 },
        },
        margin: { left: this.margin, right: this.margin },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }
  }

  /**
   * Agrega el reporte de vehículos
   */
  private addVehicleReport(data: ReportData) {
    if (!data.vehicleMetrics || data.vehicleMetrics.length === 0) return;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Análisis de Rentabilidad por Vehículo', this.margin, this.currentY);
    this.currentY += 8;

    const vehicleData = data.vehicleMetrics.map(metric => [
      metric.vehicle.alias || `${metric.vehicle.make} ${metric.vehicle.model}`,
      metric.vehicle.plate,
      this.formatCurrency(metric.totalIncome),
      this.formatCurrency(metric.totalExpenses),
      this.formatCurrency(metric.netProfit),
      `${metric.profitability.toFixed(1)}%`,
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Vehículo', 'Placa', 'Ingresos', 'Gastos', 'Beneficio', 'Rentabilidad']],
      body: vehicleData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Agrega el reporte de clientes
   */
  private addClientReport(data: ReportData) {
    if (!data.clientMetrics || data.clientMetrics.length === 0) return;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Análisis de Clientes', this.margin, this.currentY);
    this.currentY += 8;

    const clientData = data.clientMetrics.map(metric => [
      `${metric.client.firstname} ${metric.client.lastname}`,
      this.formatCurrency(metric.totalPayments),
      this.formatCurrency(metric.balance),
      metric.daysSinceLastPayment >= 0 ? `${metric.daysSinceLastPayment} días` : 'N/A',
      metric.paymentBehavior,
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Cliente', 'Pagos Totales', 'Balance', 'Último Pago', 'Comportamiento']],
      body: clientData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Agrega el reporte de socios
   */
  private addPartnerReport(data: ReportData) {
    if (!data.partnerMetrics || data.partnerMetrics.length === 0) return;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Análisis de Socios', this.margin, this.currentY);
    this.currentY += 8;

    const partnerData = data.partnerMetrics.map(metric => [
      `${metric.partner.firstname} ${metric.partner.lastname}`,
      metric.activeVehicles.toString(),
      this.formatCurrency(metric.totalIncome),
      this.formatCurrency(metric.totalExpenses),
      this.formatCurrency(metric.netBalance),
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Socio', 'Vehículos', 'Ingresos', 'Gastos', 'Balance Neto']],
      body: partnerData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Agrega el reporte ejecutivo (combinado)
   */
  private addExecutiveReport(data: ReportData) {
    this.addFinancialReport(data);

    if (data.vehicleMetrics && data.vehicleMetrics.length > 0) {
      this.checkPageBreak(80);
      this.addVehicleReport(data);
    }

    if (data.clientMetrics && data.clientMetrics.length > 0) {
      this.checkPageBreak(80);
      this.addClientReport(data);
    }
  }

  /**
   * Agrega el pie de página
   */
  private addFooter() {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.secondaryColor);
      this.doc.text(
        `Página ${i} de ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );

      this.doc.text(
        'FleetEase Manager - Sistema de Gestión de Flotas',
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  /**
   * Verifica si necesita un salto de página
   */
  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.doc.addPage();
      this.currentY = 20;
    }
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
 * Función auxiliar para generar un reporte PDF
 */
export async function generatePDFReport(data: ReportData): Promise<Blob> {
  const generator = new PDFReportGenerator();
  return generator.generate(data);
}

/**
 * Función para descargar el PDF generado
 */
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
