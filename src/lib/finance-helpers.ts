
// lib/finance-helpers.ts
import type { FinancialRecord, Client, Vehicle, FinancialCategory } from '@/types';

/**
 * Enriquece registros financieros con información de clientes, vehículos y categorías
 */
export function enrichFinancialRecords(
  records: FinancialRecord[],
  clients: Client[],
  vehicles: Vehicle[],
  categories: FinancialCategory[]
) {
  return records.map(record => {
    const client = clients.find(c => c.id === record.clientId);
    const vehicle = vehicles.find(v => v.id === record.vehicleId);
    const category = categories.find(cat => cat.id === record.categoryId);

    return {
      ...record,
      clientName: client 
        ? `${client.firstname} ${client.lastname}`.trim()
        : 'N/A',
      vehicleAlias: vehicle?.alias || vehicle?.plate || 'N/A',
      categoryName: category?.name || 'Sin categoría',
    };
  });
}

/**
 * Agrupa registros financieros por categoría
 */
export function groupByCategory<T extends { categoryId?: string; amount: number }>(
  records: T[]
): Record<string, { count: number; total: number; records: T[] }> {
  return records.reduce((acc, record) => {
    const categoryId = record.categoryId || 'sin-categoria';
    
    if (!acc[categoryId]) {
      acc[categoryId] = { count: 0, total: 0, records: [] };
    }
    
    acc[categoryId].count += 1;
    acc[categoryId].total += record.amount;
    acc[categoryId].records.push(record);
    
    return acc;
  }, {} as Record<string, { count: number; total: number; records: T[] }>);
}

/**
 * Agrupa registros financieros por vehículo
 */
export function groupByVehicle<T extends { vehicleId?: string; amount: number }>(
  records: T[],
  vehicles: Vehicle[]
): Record<string, { 
  vehicleId: string; 
  vehicleName: string; 
  total: number; 
  count: number; 
  records: T[] 
}> {
  return records.reduce((acc, record) => {
    const vehicleId = record.vehicleId || 'sin-vehiculo';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        vehicleId,
        vehicleName: vehicle?.alias || vehicle ? `${vehicle.make} ${vehicle.model}` : 'Sin vehículo',
        total: 0,
        count: 0,
        records: [],
      };
    }
    
    acc[vehicleId].total += record.amount;
    acc[vehicleId].count += 1;
    acc[vehicleId].records.push(record);
    
    return acc;
  }, {} as Record<string, { 
    vehicleId: string; 
    vehicleName: string; 
    total: number; 
    count: number; 
    records: T[] 
  }>);
}

/**
 * Calcula el total de un array de registros financieros
 */
export function calculateTotal(records: { amount: number }[]): number {
  return records.reduce((sum, record) => sum + record.amount, 0);
}

/**
 * Filtra registros financieros por rango de fechas
 */
export function filterByDateRange<T extends { date: string | Date }>(
  records: T[],
  startDate: Date,
  endDate: Date
): T[] {
  return records.filter(record => {
    const recordDate = typeof record.date === 'string' 
      ? new Date(record.date) 
      : record.date;
    
    return recordDate >= startDate && recordDate <= endDate;
  });
}