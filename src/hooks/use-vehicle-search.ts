"use client";

import { useState, useMemo, useCallback } from 'react';
import type { VehicleMetric } from './use-vehicle-analytics';
import { useDebouncedValue } from './use-debounced-value';

export interface VehicleSearchFilters {
  query: string;
  status: 'all' | 'active' | 'rented' | 'inactive' | 'maintenance' | 'sold';
  performance: 'all' | 'Excelente' | 'Bueno' | 'Promedio' | 'Pobre' | 'Crítico';
  profitRange: { min: number; max: number };
  mileageRange: { min: number; max: number };
  partnerId: string | 'all' | 'none';
  clientId: string | 'all' | 'none';
}

export type VehicleWithMetrics = import('@/types').Vehicle & Partial<VehicleMetric>;

export const useVehicleSearch = (vehicles: VehicleWithMetrics[]) => {
  const [filters, setFilters] = useState<VehicleSearchFilters>({
    query: '',
    status: 'all',
    performance: 'all',
    profitRange: { min: -20000, max: 100000 },
    mileageRange: { min: 0, max: 500000 },
    partnerId: 'all',
    clientId: 'all',
  });

  const updateFilter = useCallback((key: keyof VehicleSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Filter by text query
      if (debouncedQuery) {
        const searchTerm = debouncedQuery.toLowerCase();
        if (
          !vehicle.make.toLowerCase().includes(searchTerm) &&
          !vehicle.model.toLowerCase().includes(searchTerm) &&
          !String(vehicle.year).includes(searchTerm) &&
          !vehicle.plate.toLowerCase().includes(searchTerm)
        ) {
          return false;
        }
      }

      // Filter by status
      if (filters.status !== 'all' && vehicle.status !== filters.status) {
        return false;
      }
      
      // Filter by performance rating
      if (filters.performance !== 'all' && vehicle.performanceRating !== filters.performance) {
        return false;
      }

      // Filter by Partner
      if (filters.partnerId !== 'all') {
          if(filters.partnerId === 'none' && vehicle.partnerId) return false;
          if(filters.partnerId !== 'none' && vehicle.partnerId !== filters.partnerId) return false;
      }

      // Filter by Client
      if (filters.clientId !== 'all') {
          if(filters.clientId === 'none' && vehicle.clientId) return false;
          if(filters.clientId !== 'none' && vehicle.clientId !== filters.clientId) return false;
      }
      
      // Filter by profit range
      const profit = vehicle.netProfit ?? 0;
      if (profit < filters.profitRange.min || profit > filters.profitRange.max) {
        return false;
      }

      // Filter by mileage range
      const mileage = vehicle.currentMileage ?? 0;
      if (mileage < filters.mileageRange.min || mileage > filters.mileageRange.max) {
        return false;
      }

      return true;
    });
  }, [vehicles, filters, debouncedQuery]);

  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      status: 'all',
      performance: 'all',
      profitRange: { min: -20000, max: 100000 },
      mileageRange: { min: 0, max: 500000 },
      partnerId: 'all',
      clientId: 'all',
    });
  }, []);

  const debouncedSetQuery = (query: string) => updateFilter('query', query);

  return {
    filters,
    filteredVehicles,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults: filteredVehicles.length,
  };
};

    