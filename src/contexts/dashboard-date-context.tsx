/**
 * Contexto para compartir el filtro de fechas del Dashboard
 * Permite que otras páginas (como Profitability) usen el mismo filtro
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';

export type DateFilterPreset = 'week' | 'month' | 'year';

interface DashboardDateContextType {
  dateRange: DateRange | undefined;
  dateFilterPreset: DateFilterPreset;
  setDateRange: (range: DateRange | undefined) => void;
  setDateFilterPreset: (preset: DateFilterPreset) => void;
  periodDays: number;
}

const DashboardDateContext = createContext<DashboardDateContextType | undefined>(undefined);

interface DashboardDateProviderProps {
  children: React.ReactNode;
}

export function DashboardDateProvider({ children }: DashboardDateProviderProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>('month');

  // Calcular días en el período seleccionado
  const periodDays = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 30;
    
    const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos extremos
    return diffDays;
  }, [dateRange]);

  const handleSetDateRange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
  }, []);

  const handleSetDateFilterPreset = useCallback((preset: DateFilterPreset) => {
    setDateFilterPreset(preset);
  }, []);

  const value = useMemo(() => ({
    dateRange,
    dateFilterPreset,
    setDateRange: handleSetDateRange,
    setDateFilterPreset: handleSetDateFilterPreset,
    periodDays,
  }), [dateRange, dateFilterPreset, handleSetDateRange, handleSetDateFilterPreset, periodDays]);

  return (
    <DashboardDateContext.Provider value={value}>
      {children}
    </DashboardDateContext.Provider>
  );
}

export function useDashboardDate() {
  const context = useContext(DashboardDateContext);
  if (context === undefined) {
    throw new Error('useDashboardDate debe ser usado dentro de un DashboardDateProvider');
  }
  return context;
}
