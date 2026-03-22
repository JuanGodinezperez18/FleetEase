/**
 * Página de Rentabilidad por Vehículo
 * Feature estrella de FleetEase
 */

'use client';

import React from 'react';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useFinances } from '@/contexts/providers/finances-provider';
import { VehicleProfitabilityDashboard } from '@/components/dashboard/vehicle-profitability-dashboard';
import { DashboardHeader } from '@/app/dashboard/components/dashboard-header';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDashboardDate } from '@/contexts/dashboard-date-context';

export default function ProfitabilityPage() {
  const { vehicles = [] } = useVehicles();
  const { financialRecords = [] } = useFinances();
  const { dateRange, periodDays } = useDashboardDate();

  const hasVehicles = vehicles.length > 0;
  const hasRecords = financialRecords.length > 0;

  // Calcular el texto del período seleccionado
  const getPeriodText = () => {
    if (!dateRange?.from || !dateRange?.to) return 'últimos 30 días';
    
    const from = dateRange.from;
    const to = dateRange.to;
    
    // Verificar si es el mes actual
    const now = new Date();
    if (from.getMonth() === now.getMonth() && from.getFullYear() === now.getFullYear() &&
        to.getMonth() === now.getMonth() && to.getFullYear() === now.getFullYear()) {
      return 'mes actual';
    }
    
    // Verificar si es el año actual
    if (from.getMonth() === 0 && from.getDate() === 1 &&
        to.getMonth() === 11 && to.getDate() === 31 &&
        from.getFullYear() === now.getFullYear()) {
      return 'año actual';
    }
    
    // Para semanas o rangos personalizados
    return `${periodDays} días seleccionados`;
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        userName=""
        isConfigOpen={false}
        onOpenConfig={() => {}}
        onDateChange={() => {}}
      />

      {/* Header de la Página */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rentabilidad por Vehículo</h1>
        <p className="text-muted-foreground mt-1">
          Identifica qué vehículos ganan dinero y cuáles pierden
        </p>
      </div>

      {/* Alerta de Feature Estrella */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          Feature Estrella de FleetEase
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
          Este dashboard te muestra exactamente cuánto gana o pierde cada vehículo en el período seleccionado ({getPeriodText()}).
          Usa esta información para tomar decisiones: aumentar precios, reducir gastos, o vender vehículos no rentables.
        </AlertDescription>
      </Alert>

      {/* Contenido Principal */}
      {hasVehicles && hasRecords ? (
        <VehicleProfitabilityDashboard
          vehicles={vehicles}
          financialRecords={financialRecords}
          periodDays={periodDays}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {!hasVehicles ? 'No hay vehículos registrados' : 'No hay registros financieros'}
            </CardTitle>
            <CardDescription>
              {!hasVehicles
                ? 'Comienza registrando tus vehículos para ver la rentabilidad'
                : 'Registra ingresos y gastos para ver la rentabilidad de tus vehículos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {!hasVehicles && (
                <Button asChild>
                  <Link href="/dashboard/vehicles">Registrar Vehículo</Link>
                </Button>
              )}
              {!hasRecords && (
                <Button asChild variant="outline">
                  <Link href="/dashboard/finanzas">Registrar Ingreso/Gasto</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guía de Interpretación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            Cómo Interpretar los Datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Estados de Rentabilidad:</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-600" />
                <strong>Rentable:</strong> El vehículo genera utilidades (ingresos &gt; gastos)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-yellow-600" />
                <strong>Tablas:</strong> El vehículo ni gana ni pierde significativamente
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-600" />
                <strong>Pérdida:</strong> El vehículo genera pérdidas (gastos &gt; ingresos)
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Métricas Clave:</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <strong>Margen de Utilidad:</strong> Porcentaje de ganancia sobre los ingresos. 
                Un margen &gt;30% es excelente, 15-30% es bueno, &lt;15% requiere atención.
              </li>
              <li>
                <strong>Tasa de Ocupación:</strong> Porcentaje de días que el vehículo estuvo rentado. 
                Una ocupación &gt;70% es excelente.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Acciones Recomendadas:</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <strong>Vehículos en pérdida:</strong> Revisa si los gastos de mantenimiento son muy altos. 
                Considera aumentar el precio de renta o vender el vehículo.
              </li>
              <li>
                <strong>Baja ocupación:</strong> El vehículo está poco rentado. 
                Revisa tu estrategia de precios o marketing.
              </li>
              <li>
                <strong>Alta rentabilidad:</strong> ¡Excelente! Considera aumentar ligeramente el precio 
                para maximizar ganancias sin afectar la ocupación.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
