import { TextDecoder, TextEncoder } from 'node:util';
import { read, utils } from 'xlsx';
import { generateExcelReport } from './excel-generator';
import { generatePDFReport, type ReportData } from './pdf-generator';
import { ReportAnalyticsService } from './analytics-service';
import { calculateFinancialReconciliation } from '@/lib/financial-metrics';
import type { FinancialRecord, Vehicle, Partner } from '@/types';

const vehicles = [{ id: 'v', partnerId: 'p', cost: 495000, status: 'sold', alias: 'Unidad' }] as Vehicle[];
const partners = [{ id: 'p', name: 'Socio' }] as Partner[];
const record = (id: string, data: Partial<FinancialRecord>): FinancialRecord => ({
  id, vehicleId: 'v', partnerId: 'p', categoryId: 'rent', category: 'Renta',
  type: 'income', amount: 1000, date: '2026-11-02', description: '', isDeleted: false,
  createdAt: '2026-11-02', ...data,
});
const records = [
  record('rent', { amount: 100000 }),
  record('sale', { amount: 1166850, creditGranted: true }),
  record('expense', { amount: 124750, type: 'expense', category: 'Mantenimiento' }),
  record('deposit', { amount: 50000, category: 'Depósito en Garantía' }),
  record('refund', { amount: 50000, type: 'expense', category: 'Devolución de Depósito' }),
  record('payment', { amount: 30000, type: 'payment' }),
  record('deleted', { amount: 999999, isDeleted: true }),
];

describe('report breakdown reconciliation', () => {
  it('uses the same income, expense, sales-cost and profit definitions as the summary for vehicles', () => {
    const expected = calculateFinancialReconciliation(records);
    const [result] = ReportAnalyticsService.calculateVehicleMetrics(vehicles, records);
    expect(result.totalIncome).toBe(expected.totalIncome);
    expect(result.totalExpenses).toBe(expected.totalExpenses);
    expect(result.netProfit).toBe(-24750);
    expect(result.transactionsCount).toBe(expected.includedRecords.length);
  });

  it('reports the profit earned during administration without subtracting the historical purchase cost', () => {
    const rentalVehicle = { ...vehicles[0], status: 'rented' } as Vehicle;
    const movements = [
      record('rent', { amount: 40000 }),
      record('expense', { amount: 10000, type: 'expense', category: 'Mantenimiento' }),
    ];

    expect(ReportAnalyticsService.calculateVehicleMetrics([rentalVehicle], movements)[0].netProfit).toBe(30000);
    expect(ReportAnalyticsService.calculatePartnerMetrics(partners, [rentalVehicle], movements)[0].netBalance).toBe(30000);
  });

  it('reconciles the partner breakdown without financed sales or acquisition costs', () => {
    const expected = calculateFinancialReconciliation(records);
    const [result] = ReportAnalyticsService.calculatePartnerMetrics(partners, vehicles, records);
    expect(result.totalIncome).toBe(expected.totalIncome);
    expect(result.totalExpenses).toBe(expected.totalExpenses);
    expect(result.netBalance).toBe(-24750);
    expect(result.transactionsCount).toBe(expected.includedRecords.length);
  });
});

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('financial report exports', () => {
  const reconciliation = calculateFinancialReconciliation(records);
  const report: ReportData = {
    type: 'financial',
    title: 'Reporte financiero',
    dateRange: { from: new Date(2026, 10, 1), to: new Date(2026, 10, 30) },
    income: reconciliation.totalIncome,
    expenses: reconciliation.totalExpenses,
    netProfit: reconciliation.netProfit,
    vehicleSales: reconciliation.vehicleSales,
    creditCollections: 30000,
    records: reconciliation.includedRecords,
    excludedRecords: reconciliation.excludedRecords,
  };

  it('reconciles Excel totals with transaction rows and shows credit separately', async () => {
    const workbook = read(await readBlob(await generateExcelReport(report)));
    const rows = (name: string) => utils.sheet_to_json<(string | number)[]>(workbook.Sheets[name], { header: 1 });
    const summary = rows('Resumen');
    const transactions = rows('Transacciones').slice(3);
    const excluded = rows('Movimientos excluidos').slice(3);
    expect(transactions).toHaveLength(2);
    expect(excluded).toHaveLength(4);
    expect([...transactions, ...excluded].map(row => row[0])).toEqual(Array(6).fill('02/11/2026'));
    const income = transactions.filter(row => row[1] === 'Ingreso').reduce((total, row) => total + Number(row[4]), 0);
    const expenses = transactions.filter(row => row[1] === 'Gasto').reduce((total, row) => total + Number(row[4]), 0);
    expect(rows('Créditos')).toEqual(expect.arrayContaining([['Ventas financiadas', 1166850], ['Cobros de crédito', 30000]]));
    expect(summary).toEqual(expect.arrayContaining([
      ['Ingresos Totales', income],
      ['Gastos Totales', expenses],
      ['Beneficio Neto', income - expenses],
    ]));
    expect(income - expenses).toBe(-24750);
  });

  it('preserves the calendar date and reconciled totals in the generated PDF', async () => {
    Object.assign(globalThis, { TextDecoder, TextEncoder });
    const image = jest.spyOn(globalThis, 'Image').mockImplementation(() => ({
      set src(_url: string) {
        (this as unknown as HTMLImageElement).onerror?.(new Event('error'));
      },
    }) as HTMLImageElement);
    let blob: Blob;
    try {
      blob = await generatePDFReport(report);
    } finally {
      image.mockRestore();
    }
    const bytes = new Uint8Array(await readBlob(blob));
    const pdf = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    expect(pdf.match(/\(02\/11\/2026\) Tj/g)).toHaveLength(6);
    for (const amount of [100000, 124750, 1166850, 30000, -24750]) {
      expect(pdf).toContain(new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount));
    }
  });
});
