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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDashboardDate } from '@/contexts/dashboard-date-context';

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

  return (
    <div className="space-y-6">
      <DashboardHeader userName={currentUser?.name || ''} isConfigOpen={false} onOpenConfig={() => {}} onDateChange={() => {}} />
      <div>
        <h1 className="fe-section-title font-heading text-3xl font-bold tracking-tight">Rentabilidad por Vehículo</h1>
        <p className="text-muted-foreground mt-1">Identifica qué vehículos ganan dinero y cuáles pierden</p>
      </div>

      <Alert className="fe-surface border-[color:var(--fe-lime)]/20 bg-[color:var(--fe-lime)]/5">
        <TrendingUp className="h-5 w-5 text-[color:var(--fe-lime)]" />
        <AlertTitle className="font-heading text-foreground">Feature Estrella de FleetEase</AlertTitle>
        <AlertDescription className="text-muted-foreground mt-2">
          Este dashboard te muestra exactamente cuánto gana o pierde cada vehículo en el período seleccionado ({getPeriodText()}). Usa esta información para tomar decisiones: aumentar precios, reducir gastos, o vender vehículos no rentables.
        </AlertDescription>
      </Alert>

      {hasVehicles && hasRecords ? (
        <VehicleProfitabilityDashboard
          vehicles={vehicles}
          financialRecords={financialRecords}
          financialCategories={financialCategories}
          periodDays={periodDays}
          dateRange={dateRange}
        />
      ) : (
        <Card className="fe-surface">
          <CardHeader>
            <CardTitle className="font-heading">{!hasVehicles ? 'No hay vehículos registrados' : 'No hay registros financieros'}</CardTitle>
            <CardDescription>{!hasVehicles ? 'Comienza registrando tus vehículos para ver la rentabilidad' : 'Registra ingresos y gastos para ver la rentabilidad de tus vehículos'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {!hasVehicles && <Button asChild><Link href="/dashboard/vehicles">Registrar Vehículo</Link></Button>}
              {!hasRecords && <Button asChild variant="outline"><Link href="/dashboard/finanzas">Registrar Ingreso/Gasto</Link></Button>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="fe-surface">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <InfoIcon className="h-5 w-5 text-[color:var(--fe-lime)]" />
            Cómo Interpretar los Datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-heading font-semibold mb-2">Estados de Rentabilidad:</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-600" /><strong>Rentable:</strong> El vehículo genera utilidades (ingresos &gt; gastos)</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-yellow-600" /><strong>Tablas:</strong> El vehículo ni gana ni pierde significativamente</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /><strong>Pérdida:</strong> El vehículo genera pérdidas (gastos &gt; ingresos)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-2">Métricas Clave:</h4>
            <ul className="space-y-2 text-muted-foreground"><li><strong>Margen de Utilidad:</strong> Porcentaje de ganancia sobre los ingresos. Un margen &gt;30% es excelente, 15-30% es bueno, &lt;15% requiere atención.</li><li><strong>Tasa de Ocupación:</strong> Porcentaje de días que el vehículo estuvo rentado. Una ocupación &gt;70% es excelente.</li></ul>
          </div>
          <div>
            <h4 className="font-heading font-semibold mb-2">Acciones Recomendadas:</h4>
            <ul className="space-y-2 text-muted-foreground"><li><strong>Vehículos en pérdida:</strong> Revisa si los gastos de mantenimiento son muy altos. Considera aumentar el precio de renta o vender el vehículo.</li><li><strong>Baja ocupación:</strong> El vehículo está poco rentado. Revisa tu estrategia de precios o marketing.</li><li><strong>Alta rentabilidad:</strong> ¡Excelente! Considera aumentar ligeramente el precio para maximizar ganancias sin afectar la ocupación.</li></ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
