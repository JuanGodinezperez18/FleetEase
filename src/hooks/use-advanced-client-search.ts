
"use client";

import { useMemo, useState, useCallback } from 'react';
import type { Client, ClientWithMetrics } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';

interface AdvancedFilters {
  searchTerm: string;
  debtRange: { min: number; max: number } | null;
  paymentBehavior: Client['paymentBehavior'] | 'all';
  licenseStatus: 'expired' | 'expiring_soon' | 'valid' | 'all';
  hasVehicle: boolean | 'all';
  hasActiveCredit: boolean | 'all';
  dateRange: { from: Date | null; to: Date | null } | null;
}

export function useAdvancedClientSearch(clients: ClientWithMetrics[], balances: Record<string, number> = {}) {
  const [filters, setFilters] = useState<AdvancedFilters>({
    searchTerm: '',
    debtRange: null,
    paymentBehavior: 'all',
    licenseStatus: 'all',
    hasVehicle: 'all',
    hasActiveCredit: 'all',
    dateRange: null,
  });

  // ✅ Búsqueda fuzzy (tolerante a errores)
  const fuzzyMatch = (text: string, search: string): boolean => {
    const searchLower = search.toLowerCase().trim();
    if (!searchLower) return true;
    const textLower = text.toLowerCase();
    
    // Búsqueda exacta
    if (textLower.includes(searchLower)) return true;
    
    // Búsqueda por iniciales (ej: "jg" matchea "Juan García")
    const initials = text.split(' ').map(w => w[0]).join('').toLowerCase();
    if (initials.includes(searchLower)) return true;
    
    return false;
  };

  // ✅ Filtrar clientes con todas las condiciones
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Filtro de búsqueda (nombre, email, teléfono, RFC)
      if (filters.searchTerm) {
        const searchableText = [
          client.firstname,
          client.lastname,
          client.email,
          client.phone,
        ].filter(Boolean).join(' ');
        
        if (!fuzzyMatch(searchableText, filters.searchTerm)) {
          return false;
        }
      }

      // Filtro de rango de deuda
      if (filters.debtRange) {
        const debt = balances[client.id] || 0;
        if (debt < filters.debtRange.min || debt > filters.debtRange.max) {
          return false;
        }
      }

      // Filtro de comportamiento de pago
      if (filters.paymentBehavior !== 'all' && client.paymentBehavior !== filters.paymentBehavior) {
        return false;
      }

      // Filtro de estado de licencia
      if (filters.licenseStatus !== 'all') {
        const licenseDate = client.licenseExpiry ? infallibleNormalizeDate(client.licenseExpiry) : null;
        const now = new Date();
        const daysUntilExpiry = licenseDate ? Math.ceil((licenseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

        if (filters.licenseStatus === 'expired' && (!daysUntilExpiry || daysUntilExpiry >= 0)) {
          return false;
        }
        if (filters.licenseStatus === 'expiring_soon' && (!daysUntilExpiry || daysUntilExpiry < 0 || daysUntilExpiry > 30)) {
          return false;
        }
        if (filters.licenseStatus === 'valid' && (!daysUntilExpiry || daysUntilExpiry <= 30)) {
          return false;
        }
      }

      // Filtro de vehículo asignado
      if (filters.hasVehicle !== 'all') {
        const hasVehicle = !!client.assignedVehicleId;
        if (hasVehicle !== filters.hasVehicle) {
          return false;
        }
      }

      // Filtro de crédito activo
      if (filters.hasActiveCredit !== 'all') {
        const hasCredit = (client as any).hasActiveCredit === true;
        if (hasCredit !== filters.hasActiveCredit) {
          return false;
        }
      }

      // Filtro de rango de fechas (fecha de creación)
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const clientDate = infallibleNormalizeDate(client.createdAt || '');
        if (!clientDate) return false;
        if (filters.dateRange.from && clientDate < filters.dateRange.from) {
          return false;
        }
        if (filters.dateRange.to && clientDate > filters.dateRange.to) {
          return false;
        }
      }

      return true;
    });
  }, [clients, balances, filters]);

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      debtRange: null,
      paymentBehavior: 'all',
      licenseStatus: 'all',
      hasVehicle: 'all',
      hasActiveCredit: 'all',
      dateRange: null,
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => {
    if (v === null || v === '' || v === 'all') return false;
    if (typeof v === 'object' && Object.values(v).every(val => val === null || val === 0 || val === 999999)) return false;
    return true;
  }).length;

  return {
    filteredClients,
    filters,
    updateFilter,
    resetFilters,
    activeFiltersCount
  };
}
