import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Vehicle, Client, Partner, FinancialRecord } from '@/types';

export interface ReportData {
  type: 'financial' | 'vehicle' | 'client' | 'partner';
  title: string;
  subtitle?: string;
  dateRange: { from: Date; to: Date };
  companyName?: string;
  generatedBy?: string;
  kpis?: Array<{ label: string; value: string | number; subtitle?: string }>;

  income?: number;
  expenses?: number;
  netProfit?: number;
  profitMargin?: number;
  transactionsCount?: number;
  expensesByCategory?: Record<string, number>;
  incomeByCategory?: Record<string, number>;

  vehicles?: Vehicle[];
  vehicleMetrics?: Array<{
    vehicle: Vehicle;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitability: number;
    utilizationRate: number;
  }>;

  clients?: Client[];
  clientMetrics?: Array<{
    client: Client;
    totalPayments: number;
    balance: number;
    daysSinceLastPayment: number;
    paymentBehavior: string;
  }>;

  partners?: Partner[];
  partnerMetrics?: Array<{
    partner: Partner;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    activeVehicles: number;
  }>;

  records?: FinancialRecord[];
}

/** Light theme — printable, FleetEase accent */
const BRAND = {
  bg: [246, 247, 242] as [number, number, number],
  surface: [255, 255, 255] as [number, number, number],
  surfaceAlt: [238, 240, 234] as [number, number, number],
  lime: [180, 210, 40] as [number, number, number],
  limeBright: [215, 255, 63] as [number, number, number],
  limeDark: [92, 109, 8] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  rose: [244, 63, 94] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  text: [10, 12, 18] as [number, number, number],
  muted: [100, 106, 120] as [number, number, number],
  border: [220, 224, 214] as [number, number, number],
  tableHead: [24, 28, 36] as [number, number, number],
  tableStripe: [248, 249, 246] as [number, number, number],
};

const CHART_PALETTE: [number, number, number][] = [
  [180, 210, 40],
  [16, 185, 129],
  [56, 189, 248],
  [245, 158, 11],
  [244, 63, 94],
  [139, 92, 246],
  [20, 184, 166],
  [251, 146, 60],
];

function toNumber(value: string | number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export class PDFReportGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin = 16;
  private currentY = 16;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  generate(data: ReportData): Blob {
    this.paintPageBackground();
    this.addHeader(data);
    this.addKpiCards(data);

    // Always try a comparison chart from KPI values
    if (data.kpis && data.kpis.length >= 2) {
      this.addKpiComparisonChart(data.kpis);
    }

    if (data.income !== undefined && data.expenses !== undefined) {
      this.addIncomeExpenseVisual(data);
    }

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
    }

    this.addFooter();
    return this.doc.output('blob');
  }

  private paintPageBackground() {
    this.doc.setFillColor(...BRAND.bg);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F');
  }

  private ensureSpace(needed: number) {
    if (this.currentY + needed > this.pageHeight - 18) {
      this.doc.addPage();
      this.paintPageBackground();
      this.currentY = 16;
    }
  }

  private addHeader(data: ReportData) {
    const w = this.pageWidth - this.margin * 2;

    this.doc.setFillColor(...BRAND.limeBright);
    this.doc.rect(0, 0, this.pageWidth, 3.5, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(...BRAND.limeDark);
    this.doc.text('FLEETEASE', this.margin, this.currentY + 6);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text('Reporte ejecutivo', this.margin + 34, this.currentY + 6);

    this.currentY += 14;

    this.doc.setFillColor(...BRAND.surface);
    this.doc.setDrawColor(...BRAND.border);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.currentY, w, 28, 3, 3, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(15);
    this.doc.setTextColor(...BRAND.text);
    this.doc.text(data.title, this.margin + 6, this.currentY + 10);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...BRAND.muted);
    const period = `${format(data.dateRange.from, 'dd MMM yyyy', { locale: es })}  →  ${format(data.dateRange.to, 'dd MMM yyyy', { locale: es })}`;
    this.doc.text(period, this.margin + 6, this.currentY + 18);

    if (data.subtitle) {
      this.doc.text(data.subtitle, this.margin + 6, this.currentY + 24);
    }

    const gen = format(new Date(), 'dd MMM yyyy · HH:mm', { locale: es });
    this.doc.setFontSize(8);
    this.doc.text(
      data.generatedBy ? `Por ${data.generatedBy} · ${gen}` : gen,
      this.pageWidth - this.margin - 6,
      this.currentY + 10,
      { align: 'right' }
    );

    if (data.companyName) {
      this.doc.setTextColor(...BRAND.limeDark);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(data.companyName, this.pageWidth - this.margin - 6, this.currentY + 18, {
        align: 'right',
      });
    }

    this.currentY += 36;
  }

  private addKpiCards(data: ReportData) {
    type Card = { label: string; value: string; accent: [number, number, number]; hint?: string };
    const cards: Card[] = [];

    if (data.kpis && data.kpis.length > 0) {
      data.kpis.slice(0, 8).forEach((kpi, i) => {
        const value =
          typeof kpi.value === 'number' ? this.formatCurrency(kpi.value) : String(kpi.value);
        cards.push({
          label: kpi.label,
          value,
          accent: CHART_PALETTE[i % CHART_PALETTE.length],
          hint: kpi.subtitle,
        });
      });
    } else {
      if (data.income !== undefined) {
        cards.push({
          label: 'Ingresos',
          value: this.formatCurrency(data.income),
          accent: BRAND.emerald,
        });
      }
      if (data.expenses !== undefined) {
        cards.push({
          label: 'Gastos',
          value: this.formatCurrency(data.expenses),
          accent: BRAND.rose,
        });
      }
      if (data.netProfit !== undefined) {
        cards.push({
          label: 'Beneficio neto',
          value: this.formatCurrency(data.netProfit),
          accent: data.netProfit >= 0 ? BRAND.lime : BRAND.rose,
        });
      }
      if (data.profitMargin !== undefined) {
        cards.push({
          label: 'Margen',
          value: `${data.profitMargin.toFixed(1)}%`,
          accent: BRAND.amber,
          hint:
            data.transactionsCount !== undefined
              ? `${data.transactionsCount} movimientos`
              : undefined,
        });
      }
    }

    if (cards.length === 0) return;

    // Layout: max 4 per row
    const perRow = Math.min(4, cards.length);
    const rows = Math.ceil(cards.length / perRow);
    const gap = 3.5;
    const cardH = 26;

    for (let row = 0; row < rows; row++) {
      this.ensureSpace(cardH + 6);
      const slice = cards.slice(row * perRow, row * perRow + perRow);
      const cardW = (this.pageWidth - this.margin * 2 - gap * (slice.length - 1)) / slice.length;

      slice.forEach((card, i) => {
        const x = this.margin + i * (cardW + gap);
        this.doc.setFillColor(...BRAND.surface);
        this.doc.setDrawColor(...BRAND.border);
        this.doc.setLineWidth(0.25);
        this.doc.roundedRect(x, this.currentY, cardW, cardH, 2.5, 2.5, 'FD');

        this.doc.setFillColor(...card.accent);
        this.doc.roundedRect(x, this.currentY, 2, cardH, 1, 1, 'F');

        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.5);
        this.doc.setTextColor(...BRAND.muted);
        const label =
          card.label.length > 22 ? card.label.slice(0, 21) + '…' : card.label.toUpperCase();
        this.doc.text(label, x + 5, this.currentY + 7);

        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(card.value.length > 12 ? 10 : 12);
        this.doc.setTextColor(...BRAND.text);
        this.doc.text(card.value, x + 5, this.currentY + 16);

        if (card.hint) {
          this.doc.setFont('helvetica', 'normal');
          this.doc.setFontSize(6.5);
          this.doc.setTextColor(...BRAND.muted);
          const hint = card.hint.length > 28 ? card.hint.slice(0, 27) + '…' : card.hint;
          this.doc.text(hint, x + 5, this.currentY + 22);
        }
      });

      this.currentY += cardH + 5;
    }

    this.currentY += 4;
  }

  /** Horizontal bars comparing numeric KPIs */
  private addKpiComparisonChart(
    kpis: Array<{ label: string; value: string | number; subtitle?: string }>
  ) {
    const numeric = kpis
      .map(k => ({ label: k.label, value: toNumber(k.value) }))
      .filter((k): k is { label: string; value: number } => k.value !== null && k.value !== 0)
      .slice(0, 8);

    if (numeric.length < 2) return;

    const maxAbs = Math.max(...numeric.map(k => Math.abs(k.value))) || 1;
    const rowH = 11;
    const chartH = 14 + numeric.length * rowH;

    this.ensureSpace(chartH + 8);

    const boxW = this.pageWidth - this.margin * 2;
    this.doc.setFillColor(...BRAND.surface);
    this.doc.setDrawColor(...BRAND.border);
    this.doc.setLineWidth(0.25);
    this.doc.roundedRect(this.margin, this.currentY, boxW, chartH, 3, 3, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...BRAND.text);
    this.doc.text('Comparativa de indicadores', this.margin + 6, this.currentY + 8);

    const labelW = 48;
    const barX = this.margin + labelW;
    const barMaxW = boxW - labelW - 36;
    const startY = this.currentY + 14;

    numeric.forEach((item, i) => {
      const y = startY + i * rowH;
      const color = CHART_PALETTE[i % CHART_PALETTE.length];
      const width = Math.max(2, (Math.abs(item.value) / maxAbs) * barMaxW);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...BRAND.muted);
      const label = item.label.length > 20 ? item.label.slice(0, 19) + '…' : item.label;
      this.doc.text(label, this.margin + 6, y + 4);

      this.doc.setFillColor(...BRAND.surfaceAlt);
      this.doc.roundedRect(barX, y, barMaxW, 5.5, 1.5, 1.5, 'F');

      this.doc.setFillColor(...color);
      this.doc.roundedRect(barX, y, width, 5.5, 1.5, 1.5, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(...BRAND.text);
      this.doc.text(this.formatCurrency(item.value), barX + barMaxW + 2, y + 4);
    });

    this.currentY += chartH + 8;
  }

  private addIncomeExpenseVisual(data: ReportData) {
    this.ensureSpace(52);

    const income = Math.max(0, data.income || 0);
    const expenses = Math.max(0, data.expenses || 0);
    const total = income + expenses;
    if (total <= 0) return;

    const boxW = this.pageWidth - this.margin * 2;
    const boxH = 46;
    this.doc.setFillColor(...BRAND.surface);
    this.doc.setDrawColor(...BRAND.border);
    this.doc.setLineWidth(0.25);
    this.doc.roundedRect(this.margin, this.currentY, boxW, boxH, 3, 3, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...BRAND.text);
    this.doc.text('Composición del periodo', this.margin + 6, this.currentY + 8);

    const cx = this.margin + 28;
    const cy = this.currentY + 28;
    const outerR = 14;
    const innerR = 8;

    const incomeAngle = (income / total) * 360;
    this.drawDonutSlice(cx, cy, outerR, -90, -90 + incomeAngle, BRAND.emerald);
    this.drawDonutSlice(cx, cy, outerR, -90 + incomeAngle, 270, BRAND.rose);
    this.doc.setFillColor(...BRAND.surface);
    this.doc.circle(cx, cy, innerR, 'F');

    const legendX = this.margin + 52;
    const barMaxW = boxW - 70;

    this.doc.setFillColor(...BRAND.emerald);
    this.doc.circle(legendX, this.currentY + 18, 1.8, 'F');
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text('Ingresos', legendX + 5, this.currentY + 19);
    this.doc.setTextColor(...BRAND.text);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.formatCurrency(income), legendX + 28, this.currentY + 19);

    this.doc.setFillColor(...BRAND.surfaceAlt);
    this.doc.roundedRect(legendX, this.currentY + 22, barMaxW, 4, 1, 1, 'F');
    this.doc.setFillColor(...BRAND.emerald);
    this.doc.roundedRect(
      legendX,
      this.currentY + 22,
      Math.max(2, (income / total) * barMaxW),
      4,
      1,
      1,
      'F'
    );

    this.doc.setFillColor(...BRAND.rose);
    this.doc.circle(legendX, this.currentY + 34, 1.8, 'F');
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...BRAND.muted);
    this.doc.text('Gastos', legendX + 5, this.currentY + 35);
    this.doc.setTextColor(...BRAND.text);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.formatCurrency(expenses), legendX + 28, this.currentY + 35);

    this.doc.setFillColor(...BRAND.surfaceAlt);
    this.doc.roundedRect(legendX, this.currentY + 38, barMaxW, 4, 1, 1, 'F');
    this.doc.setFillColor(...BRAND.rose);
    this.doc.roundedRect(
      legendX,
      this.currentY + 38,
      Math.max(2, (expenses / total) * barMaxW),
      4,
      1,
      1,
      'F'
    );

    this.currentY += boxH + 10;
  }

  private drawDonutSlice(
    cx: number,
    cy: number,
    outerR: number,
    startDeg: number,
    endDeg: number,
    color: [number, number, number]
  ) {
    this.doc.setFillColor(...color);
    const steps = Math.max(8, Math.ceil(Math.abs(endDeg - startDeg) / 6));
    for (let i = 0; i < steps; i++) {
      const a1 = ((startDeg + ((endDeg - startDeg) * i) / steps) * Math.PI) / 180;
      const a2 = ((startDeg + ((endDeg - startDeg) * (i + 1)) / steps) * Math.PI) / 180;
      const x1 = cx + outerR * Math.cos(a1);
      const y1 = cy + outerR * Math.sin(a1);
      const x2 = cx + outerR * Math.cos(a2);
      const y2 = cy + outerR * Math.sin(a2);
      this.doc.triangle(cx, cy, x1, y1, x2, y2, 'F');
    }
  }

  private addSectionTitle(title: string) {
    this.ensureSpace(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(...BRAND.text);
    this.doc.text(title, this.margin, this.currentY);

    this.doc.setDrawColor(...BRAND.lime);
    this.doc.setLineWidth(0.7);
    this.doc.line(this.margin, this.currentY + 2, this.margin + 18, this.currentY + 2);

    this.currentY += 8;
  }

  private addCategoryBars(
    title: string,
    categories: Record<string, number>,
    totalFallback: number
  ) {
    const entries = Object.entries(categories)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    if (entries.length === 0) return;

    const total = totalFallback || entries.reduce((s, [, v]) => s + v, 0) || 1;
    const rowH = 9;
    const chartH = 10 + entries.length * rowH;

    this.ensureSpace(chartH + 12);
    this.addSectionTitle(title);

    const labelW = 42;
    const barX = this.margin + labelW;
    const barMaxW = this.pageWidth - this.margin - barX - 28;

    entries.forEach(([name, amount], i) => {
      const y = this.currentY + i * rowH;
      const pct = amount / total;
      const color = CHART_PALETTE[i % CHART_PALETTE.length];

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(...BRAND.muted);
      const label = name.length > 18 ? name.slice(0, 17) + '…' : name;
      this.doc.text(label, this.margin, y + 4);

      this.doc.setFillColor(...BRAND.surfaceAlt);
      this.doc.roundedRect(barX, y, barMaxW, 5, 1.2, 1.2, 'F');

      this.doc.setFillColor(...color);
      this.doc.roundedRect(barX, y, Math.max(1.5, pct * barMaxW), 5, 1.2, 1.2, 'F');

      this.doc.setFontSize(7);
      this.doc.setTextColor(...BRAND.text);
      this.doc.text(
        `${this.formatCurrency(amount)}  ${(pct * 100).toFixed(0)}%`,
        barX + barMaxW + 2,
        y + 4
      );
    });

    this.currentY += entries.length * rowH + 8;
  }

  private tableTheme() {
    return {
      theme: 'plain' as const,
      headStyles: {
        fillColor: BRAND.tableHead,
        textColor: BRAND.limeBright,
        fontSize: 8,
        fontStyle: 'bold' as const,
        cellPadding: 3,
      },
      bodyStyles: {
        fillColor: BRAND.surface,
        textColor: BRAND.text,
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: BRAND.tableStripe,
      },
      styles: {
        lineColor: BRAND.border,
        lineWidth: 0.15,
      },
      margin: { left: this.margin, right: this.margin },
    };
  }

  private addFinancialReport(data: ReportData) {
    if (data.expensesByCategory && Object.keys(data.expensesByCategory).length > 0) {
      this.addCategoryBars('Gastos por categoría', data.expensesByCategory, data.expenses || 0);
    }

    if (data.incomeByCategory && Object.keys(data.incomeByCategory).length > 0) {
      this.addCategoryBars('Ingresos por categoría', data.incomeByCategory, data.income || 0);
    }

    if (data.records && data.records.length > 0) {
      this.ensureSpace(40);
      this.addSectionTitle(
        `Movimientos recientes (${Math.min(data.records.length, 15)} de ${data.records.length})`
      );

      const sorted = [...data.records]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);

      const body = sorted.map(record => [
        format(new Date(record.date), 'dd/MM/yy', { locale: es }),
        record.type === 'income' ? 'Ingreso' : 'Gasto',
        (record.category || '—').slice(0, 22),
        (record.description || '—').slice(0, 36),
        this.formatCurrency(record.amount),
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
        body,
        ...this.tableTheme(),
        didParseCell: cellData => {
          if (cellData.section === 'body' && cellData.column.index === 1) {
            const v = String(cellData.cell.raw);
            cellData.cell.styles.textColor = v === 'Ingreso' ? BRAND.emerald : BRAND.rose;
          }
        },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
    }
  }

  private addVehicleReport(data: ReportData) {
    if (!data.vehicleMetrics || data.vehicleMetrics.length === 0) return;

    this.ensureSpace(40);
    this.addSectionTitle('Rentabilidad por vehículo');

    const body = data.vehicleMetrics.map(m => [
      (m.vehicle.alias || `${m.vehicle.make} ${m.vehicle.model}`).slice(0, 24),
      m.vehicle.plate,
      this.formatCurrency(m.totalIncome),
      this.formatCurrency(m.totalExpenses),
      this.formatCurrency(m.netProfit),
      `${m.profitability.toFixed(0)}%`,
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Vehículo', 'Placa', 'Ingresos', 'Gastos', 'Beneficio', 'Rent.']],
      body,
      ...this.tableTheme(),
      didParseCell: d => {
        if (d.section === 'body' && d.column.index === 4) {
          const raw = String(d.cell.raw).replace(/[^0-9.-]/g, '');
          const n = parseFloat(raw);
          if (!Number.isNaN(n)) {
            d.cell.styles.textColor = n >= 0 ? BRAND.emerald : BRAND.rose;
          }
        }
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
  }

  private addClientReport(data: ReportData) {
    if (!data.clientMetrics || data.clientMetrics.length === 0) return;

    this.ensureSpace(40);
    this.addSectionTitle('Análisis de clientes');

    const body = data.clientMetrics.map(m => [
      `${m.client.firstname} ${m.client.lastname}`.slice(0, 28),
      this.formatCurrency(m.totalPayments),
      this.formatCurrency(m.balance),
      m.daysSinceLastPayment >= 0 ? `${m.daysSinceLastPayment}d` : '—',
      m.paymentBehavior,
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Cliente', 'Pagos', 'Saldo', 'Último', 'Comportamiento']],
      body,
      ...this.tableTheme(),
      didParseCell: d => {
        if (d.section === 'body' && d.column.index === 2) {
          d.cell.styles.textColor = BRAND.rose;
        }
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
  }

  private addPartnerReport(data: ReportData) {
    if (!data.partnerMetrics || data.partnerMetrics.length === 0) return;

    this.ensureSpace(40);
    this.addSectionTitle('Análisis de socios');

    const body = data.partnerMetrics.map(m => [
      `${m.partner.firstname} ${m.partner.lastname}`.slice(0, 28),
      String(m.activeVehicles),
      this.formatCurrency(m.totalIncome),
      this.formatCurrency(m.totalExpenses),
      this.formatCurrency(m.netBalance),
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Socio', 'Unidades', 'Ingresos', 'Gastos', 'Balance']],
      body,
      ...this.tableTheme(),
      didParseCell: d => {
        if (d.section === 'body' && d.column.index === 4) {
          const raw = String(d.cell.raw).replace(/[^0-9.-]/g, '');
          const n = parseFloat(raw);
          if (!Number.isNaN(n)) {
            d.cell.styles.textColor = n >= 0 ? BRAND.emerald : BRAND.rose;
          }
        }
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
  }

  private addFooter() {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);

      this.doc.setFillColor(...BRAND.surface);
      this.doc.rect(0, this.pageHeight - 12, this.pageWidth, 12, 'F');
      this.doc.setFillColor(...BRAND.limeBright);
      this.doc.rect(0, this.pageHeight - 12.4, this.pageWidth, 0.7, 'F');

      this.doc.setFontSize(7);
      this.doc.setTextColor(...BRAND.muted);
      this.doc.text('FleetEase · Gestión de flotas', this.margin, this.pageHeight - 5);
      this.doc.setTextColor(...BRAND.limeDark);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`Pág. ${i} / ${pageCount}`, this.pageWidth - this.margin, this.pageHeight - 5, {
        align: 'right',
      });
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  }
}

export async function generatePDFReport(data: ReportData): Promise<Blob> {
  const generator = new PDFReportGenerator();
  return generator.generate(data);
}

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
