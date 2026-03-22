
"use client";

import { useState, useMemo, useCallback } from 'react';
import type { VehicleWithMileage } from '@/types';
import type { VehicleMileageMetric } from './use-mileage-analytics';
import { useDebouncedValue } from './use-debounced-value';

export interface MileageSearchFilters {
  query: string;
  maintenanceStatus: 'all' | 'urgent' | 'upcoming' | 'good';
  mileageRange: { min: number; max: number };
  companyId: string | 'all';
}

export type VehicleWithMileageAndMetrics = VehicleWithMileage & Partial<VehicleMileageMetric>;

export const useMileageSearch = (vehicles: VehicleWithMileageAndMetrics[]) => {
  const [filters, setFilters] = useState<MileageSearchFilters>({
    query: '',
    maintenanceStatus: 'all',
    mileageRange: { min: 0, max: 500000 },
    companyId: 'all',
  });

  const updateFilter = useCallback((key: keyof MileageSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // 1. Filter by company
      if (filters.companyId !== 'all' && vehicle.companyId !== filters.companyId) {
          return false;
      }
        
      // 2. Filter by text query
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

      // 3. Filter by maintenance status
      if (filters.maintenanceStatus !== 'all') {
          const kmLeft = vehicle.kmToNextMaintenance ?? Infinity;
          if (filters.maintenanceStatus === 'urgent' && kmLeft > 0) return false;
          if (filters.maintenanceStatus === 'upcoming' && (kmLeft <= 0 || kmLeft > 1500)) return false;
          if (filters.maintenanceStatus === 'good' && kmLeft <= 1500) return false;
      }
      
      // 4. Filter by mileage range
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
      maintenanceStatus: 'all',
      mileageRange: { min: 0, max: 500000 },
      companyId: 'all',
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
