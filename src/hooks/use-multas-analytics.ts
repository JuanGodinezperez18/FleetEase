import { useMemo } from 'react';
import type { Multa, Vehicle, Client } from '@/types';

export interface MultasAnalytics {
  totalMultas: number;
  multasPendientes: number;
  multasPagadas: number;
  multasEnProceso: number;
  multasCanceladas: number;
  totalPendienteAmount: number;
  totalPagadoAmount: number;
  vehiculosConMultas: number;
  vehiculosLimpios: number;
  clientesConMultas: number;
  promedioMultaPorVehiculo: number;
  vehiculoConMasMultas: {
    vehicleId: string;
    plate?: string;
    alias?: string;
    count: number;
  } | null;
  clienteConMasMultas: {
    clientId: string;
    name?: string;
    count: number;
  } | null;
  multasPorVehiculo: Array<{
    vehicleId: string;
    plate?: string;
    alias?: string;
    count: number;
    totalAmount: number;
    pendientes: number;
    pagadas: number;
  }>;
  multasPorCliente: Array<{
    clientId: string;
    name?: string;
    count: number;
    totalAmount: number;
    pendientes: number;
  }>;
}

export function useMultasAnalytics(
  multas: Multa[],
  vehicles: Vehicle[],
  clients: Client[]
): MultasAnalytics {
  return useMemo(() => {
    const activeMultas = multas.filter(m => !m.isDeleted);

    // Estadísticas generales
    const multasPendientes = activeMultas.filter(m => m.status === 'pendiente').length;
    const multasPagadas = activeMultas.filter(m => m.status === 'pagada').length;
    const multasEnProceso = activeMultas.filter(m => m.status === 'en_proceso').length;
    const multasCanceladas = activeMultas.filter(m => m.status === 'cancelada').length;

    const totalPendienteAmount = activeMultas
      .filter(m => m.status === 'pendiente')
      .reduce((sum, m) => sum + m.total, 0);

    const totalPagadoAmount = activeMultas
      .filter(m => m.status === 'pagada')
      .reduce((sum, m) => sum + m.total, 0);

    // Multas por vehículo
    const multasPorVehiculoMap = new Map<string, {
      count: number;
      totalAmount: number;
      pendientes: number;
      pagadas: number;
    }>();

    activeMultas.forEach(multa => {
      const existing = multasPorVehiculoMap.get(multa.vehicleId) || {
        count: 0,
        totalAmount: 0,
        pendientes: 0,
        pagadas: 0,
      };

      multasPorVehiculoMap.set(multa.vehicleId, {
        count: existing.count + 1,
        totalAmount: existing.totalAmount + multa.total,
        pendientes: existing.pendientes + (multa.status === 'pendiente' ? 1 : 0),
        pagadas: existing.pagadas + (multa.status === 'pagada' ? 1 : 0),
      });
    });

    const multasPorVehiculo = Array.from(multasPorVehiculoMap.entries()).map(([vehicleId, stats]) => {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      return {
        vehicleId,
        plate: vehicle?.plate,
        alias: vehicle?.alias,
        ...stats,
      };
    }).sort((a, b) => b.count - a.count);

    // Multas por cliente
    const multasPorClienteMap = new Map<string, {
      count: number;
      totalAmount: number;
      pendientes: number;
    }>();

    activeMultas.forEach(multa => {
      if (!multa.clientId) return;

      const existing = multasPorClienteMap.get(multa.clientId) || {
        count: 0,
        totalAmount: 0,
        pendientes: 0,
      };

      multasPorClienteMap.set(multa.clientId, {
        count: existing.count + 1,
        totalAmount: existing.totalAmount + multa.total,
        pendientes: existing.pendientes + (multa.status === 'pendiente' ? 1 : 0),
      });
    });

    const multasPorCliente = Array.from(multasPorClienteMap.entries()).map(([clientId, stats]) => {
      const client = clients.find(c => c.id === clientId);
      return {
        clientId,
        name: client ? `${client.firstname} ${client.lastname}` : 'Desconocido',
        ...stats,
      };
    }).sort((a, b) => b.count - a.count);

    // Vehículos con y sin multas
    const vehiculosConMultas = multasPorVehiculo.length;
    const activeVehicles = vehicles.filter(v => !v.isDeleted && v.status !== 'sold');
    const vehiculosLimpios = activeVehicles.length - vehiculosConMultas;

    // Promedio de multas por vehículo
    const promedioMultaPorVehiculo = vehiculosConMultas > 0
      ? activeMultas.length / vehiculosConMultas
      : 0;

    // Vehículo y cliente con más multas
    const vehiculoConMasMultas = multasPorVehiculo[0] || null;
    const clienteConMasMultas = multasPorCliente[0] || null;

    return {
      totalMultas: activeMultas.length,
      multasPendientes,
      multasPagadas,
      multasEnProceso,
      multasCanceladas,
      totalPendienteAmount,
      totalPagadoAmount,
      vehiculosConMultas,
      vehiculosLimpios,
      clientesConMultas: multasPorCliente.length,
      promedioMultaPorVehiculo,
      vehiculoConMasMultas,
      clienteConMasMultas,
      multasPorVehiculo,
      multasPorCliente,
    };
  }, [multas, vehicles, clients]);
}
