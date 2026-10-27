/**
 * Página de Rentabilidad por Vehículo
 * Feature estrella de FleetEase
 */

'use client';

import React from 'react';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useAuth } from '@/contexts/auth-provider';
import { VehicleProfitabilityDashboard } from '@/components/dashboard/vehicle-profitability-dashboard';
import { DashboardHeader } from '@/app/dashboard/components/dashboard-header';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDashboardDate } from '@/contexts/dashboard-date-context';
import { InfoTip } from '@/components/ui/info-tip';

export default function ProfitabilityPage() {
  const { currentUser } = useAuth();
  const { vehicles = [] } = useVehicles();
  const { financialRecords = [], financialCategories = [] } = useFinances();
  const { dateRange, periodDays } = useDashboardDate();
  const hasVehicles = vehicles.length > 0;
  const hasRecords = financialRecords.length > 0;

  const getPeriodText = () => {
    if (!dateRange?.from || !dateRange?.to) return 'últimos 30 días';
    const { from, to } = dateRange;
    const now = new Date();
    if (from.getMonth() === now.getMonth() && from.getFullYear() === now.getFullYear() && to.getMonth() === now.getMonth() && to.getFullYear() === now.getFullYear()) return 'mes actual';
    if (from.getMonth() === 0 && from.getDate() === 1 && to.getMonth() === 11 && to.getDate() === 31 && from.getFullYear() === now.getFullYear()) return 'año actual';
    return `${periodDays} días seleccionados`;
  };

  const userDisplayName = currentUser?.name || currentUser?.email || '';

  return (
    <div className="space-y-6 rounded-[18px] bg-background/40 p-1 sm:p-2">
      <DashboardHeader userName={userDisplayName} isConfigOpen={false} onOpenConfig={() => {}} onDateChange={() => {}} />
      <div className="fe-module-header">
        <div className="min-w-0 flex-1">
          <div className="fe-module-eyebrow">Análisis</div>
          <h1 className="fe-module-title">Rentabilidad por Vehículo</h1>
          <p className="fe-module-subtitle">Identifica qué vehículos ganan dinero y cuáles pierden</p>
        </div>
        <div className="fe-module-actions">
          <InfoTip
            title="Feature estrella de FleetEase"
            label="Cómo usar este dashboard"
            size="md"
          >
            <p>
              Muestra cuánto gana o pierde cada vehículo en el período seleccionado ({getPeriodText()}).
              Úsalo para decidir: subir precios, reducir gastos o vender unidades no rentables.
            </p>
            <p className="mt-2 font-medium text-[var(--fe-text-secondary)]">Estados</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li><strong>Rentable:</strong> ingresos > gastos</li>
              <li><strong>Tablas:</strong> sin ganancia ni pérdida clara</li>
              <li><strong>Pérdida:</strong> gastos > ingresos</li>
            </ul>
            <p className="mt-2 font-medium text-[var(--fe-text-secondary)]">Métricas</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li><strong>Margen:</strong> >30% excelente, 15–30% bueno, <15% revisar</li>
              <li><strong>Ocupación:</strong> >70% excelente</li>
            </ul>
          </InfoTip>
        </div>
      </div>

      {hasVehicles && hasRecords ? (
        <VehicleProfitabilityDashboard
          vehicles={vehicles}
          financialRecords={financialRecords}
          financialCategories={financialCategories}
          periodDays={periodDays}
          dateRange={dateRange}
        />
      ) : (
        <Card className="fe-surface rounded-[14px]">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--fe-lime)]" />
              {!hasVehicles ? 'No hay vehículos registrados' : 'No hay registros financieros'}
            </CardTitle>
            <CardDescription>
              {!hasVehicles
                ? 'Comienza registrando tus vehículos para ver la rentabilidad'
                : 'Registra ingresos y gastos para ver la rentabilidad de tus vehículos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {!hasVehicles && (
                <Button asChild className="min-h-11">
                  <Link href="/dashboard/vehicles">Registrar Vehículo</Link>
                </Button>
              )}
              {!hasRecords && (
                <Button asChild variant="outline" className="min-h-11">
                  <Link href="/dashboard/finanzas">Registrar Ingreso/Gasto</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
