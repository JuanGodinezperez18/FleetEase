
import type { FinancialRecord, Client, Vehicle, FinancialCategory } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';

export interface IncomeData extends FinancialRecord {
  clientName: string;
  vehicleName: string;
  categoryName: string;
  sortableDate: number; 
}

const getSortableDate = (dateInput: unknown): number => {
    const normalizedDate = infallibleNormalizeDate(dateInput);
    return normalizedDate ? normalizedDate.getTime() : 0;
};

export const mapIncomes = (
  financialRecords: FinancialRecord[],
  clients: Client[],
  vehicles: Vehicle[],
  categories: FinancialCategory[]
): IncomeData[] => {
  const clientMap = new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`]));
  const vehicleMap = new Map(vehicles.map(v => [v.id, `${v.make} ${v.model} (${v.plate})`]));
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

  const incomeAndPaymentRecords = financialRecords.filter(
    (r): r is FinancialRecord & { type: 'income' | 'payment' } => (r.type === 'income' || r.type === 'payment') && !r.isDeleted
  );

  return incomeAndPaymentRecords.map((record) => {
    const clientName = record.clientId ? clientMap.get(record.clientId) || 'N/A' : 'N/A';
    const vehicleName = record.vehicleId ? vehicleMap.get(record.vehicleId) || 'N/A' : 'N/A';
    const categoryName = record.categoryId ? categoryMap.get(record.categoryId) || record.category || 'General' : record.category || 'General';
    
    return {
      ...record,
      clientName,
      vehicleName,
      categoryName,
      sortableDate: getSortableDate(record.date),
    };
  });
};

    