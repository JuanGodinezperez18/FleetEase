// src/app/dashboard/hooks/use-dashboard-data.ts
'use client';

import { useMemo } from 'react';
import { useData } from '@/contexts/data-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useAuth } from '@/contexts/auth-provider';
import { logger } from '@/lib/logger';

/**
 * Hook especializado para obtención de datos del dashboard
 * Separa la lógica de data fetching del resto de responsabilidades
 */
export function useDashboardData() {
  const dataContext = useData();
  const { currentUser } = useAuth();
  const { vehicles = [] } = useVehicles();
  const { clients = [] } = useClients();
  const { financialCategories = [] } = useFinances();

  const {
    partners = [],
    companies = [],
  } = dataContext || {};

  // ✅ FIX: Si no hay clients/vehicles pero el usuario tiene companyId, loguear advertencia
  useMemo(() => {
    if (currentUser && !currentUser.companyId && currentUser.role !== 'superAdmin') {
      logger.warn('[useDashboardData] Usuario admin sin companyId - esto causa listas vacías', { 
        uid: currentUser.uid,
        email: currentUser.email || ''
      });
    }
  }, [currentUser]);

  // Memoizar categorías de ingresos y pagos
  const incomeAndPaymentCategories = useMemo(() =>
    financialCategories.filter(cat => cat.type === 'income' || cat.type === 'payment'),
    [financialCategories]
  );

  // Memoizar categorías de gastos
  const expenseCategories = useMemo(() =>
    financialCategories.filter(cat => cat.type === 'expense'),
    [financialCategories]
  );

  return {
    // Datos
    vehicles,
    clients,
    partners,
    companies,
    financialCategories,
    incomeAndPaymentCategories,
    expenseCategories,

    // Contexto completo para operaciones directas
    dataContext,
  };
}
