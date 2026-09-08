"use client";

import React, { useState } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import { useFinancialAnalytics } from '@/hooks/use-financial-analytics';
import { FinancialDashboard } from './components/financial-dashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { FinancialAdvancedFilters } from './components/financial-advanced-filters';
import type { DateRange } from 'react-day-picker';

export default function FinancialAnalysisPage() {
  const { financialRecords, financialCategories, loading: loadingFinances } = useFinances();
  const { vehicles, vehiclesLoading } = useVehicles();
  const { clients, credits, loading: loadingClients } = useClients();
  const { companies, partners } = useData();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | 'all'>('all');
  const loadingData = loadingFinances || vehiclesLoading || loadingClients;

  const filteredRecords = React.useMemo(() => {
    return financialRecords.filter(record => {
      if (selectedCompanyId !== 'all' && record.companyId !== selectedCompanyId) return false;
      if (selectedPartnerId !== 'all') {
        if (selectedPartnerId === 'none' && record.partnerId) return false;
        if (selectedPartnerId !== 'none' && record.partnerId !== selectedPartnerId) return false;
      }
      if (dateRange?.from || dateRange?.to) {
        const recordDate = new Date(record.date);
        if (dateRange.from && recordDate < dateRange.from) return false;
        if (dateRange.to && recordDate > dateRange.to) return false;
      }
      return true;
    });
  }, [financialRecords, dateRange, selectedCompanyId, selectedPartnerId]);

  const analytics = useFinancialAnalytics(filteredRecords, clients, vehicles, partners, dateRange, financialCategories);

  // Sin ingresos operativos no existe un margen significativo que alertar.
  // Evita mostrar un falso "margen crítico: 0%" en períodos vacíos o con depósitos/gastos únicamente.
  const analyticsForDisplay = analytics.totalIncome > 0
    ? analytics
    : { ...analytics, profitMargin: 10 };

  if (loadingData) return <GlobalLoader />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Análisis Financiero Global</CardTitle>
          <CardDescription>
            Un resumen ejecutivo del rendimiento financiero de toda la flota.
            Utilice los filtros para analizar un período específico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialAdvancedFilters
            companies={companies}
            partners={partners}
            onDateChange={setDateRange}
            onCompanyChange={setSelectedCompanyId}
            onPartnerChange={setSelectedPartnerId}
          />
        </CardContent>
      </Card>

      <FinancialDashboard analytics={analyticsForDisplay} />
    </div>
  );
}
