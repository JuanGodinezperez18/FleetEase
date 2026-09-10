/**
 * Alertas de Negocio Inteligentes
 * Notificaciones proactivas sobre problemas y oportunidades de negocio
 */

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, Clock, DollarSign, AlertCircle, CheckCircle, ArrowRight, TrendingUp } from 'lucide-react';
import type { Vehicle, Client, FinancialRecord } from '@/types';
import Link from 'next/link';
import { getMaintenanceIntervalKm } from '@/lib/financial-metrics';

interface BusinessAlert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'opportunity';
  category: 'client' | 'vehicle' | 'finance' | 'maintenance';
  title: string;
  description: string;
  impact: string;
  action?: {
    label: string;
    href: string;
  };
  data?: any;
}

interface SmartBusinessAlertsProps {
  vehicles: Vehicle[];
  clients: Client[];
  financialRecords: FinancialRecord[];
  periodDays?: number;
}

export function SmartBusinessAlerts({
  vehicles,
  clients,
  financialRecords,
  periodDays = 30,
}: SmartBusinessAlertsProps) {
  
  const alerts: BusinessAlert[] = useMemo(() => {
    const generatedAlerts: BusinessAlert[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    // 1. Alertas de Clientes Morosos
    clients.forEach(client => {
      if (client.balance > 5000) {
        generatedAlerts.push({
          id: `client-debt-${client.id}`,
          type: 'critical',
          category: 'client',
          title: `Cliente con deuda alta: ${client.firstname} ${client.lastname}`,
          description: `El cliente tiene un saldo pendiente de $${client.balance.toLocaleString('es-MX')}`,
          impact: 'Riesgo alto de no pago. Se recomienda acción inmediata.',
          action: {
            label: 'Ver cliente',
            href: `/dashboard/clients/${client.id}`,
          },
          data: { balance: client.balance, clientId: client.id },
        });
      } else if (client.balance > 2000) {
        generatedAlerts.push({
          id: `client-debt-warning-${client.id}`,
          type: 'warning',
          category: 'client',
          title: `Cliente con deuda moderada: ${client.firstname} ${client.lastname}`,
          description: `El cliente tiene un saldo pendiente de $${client.balance.toLocaleString('es-MX')}`,
          impact: 'Monitorear de cerca. Contactar si supera $5,000.',
          action: {
            label: 'Ver cliente',
            href: `/dashboard/clients/${client.id}`,
          },
          data: { balance: client.balance, clientId: client.id },
        });
      }
    });

    // 2. Alertas de Vehículos Sin Renta
    const activeVehicles = vehicles.filter(v => v.status === 'active' && !v.isDeleted);
    activeVehicles.forEach(vehicle => {
      const vehicleRecords = financialRecords.filter(r => 
        r.vehicleId === vehicle.id && 
        r.type === 'income' &&
        new Date(r.date) >= cutoffDate
      );

      if (vehicleRecords.length === 0) {
        generatedAlerts.push({
          id: `vehicle-idle-${vehicle.id}`,
          type: 'warning',
          category: 'vehicle',
          title: `Vehículo sin ingresos: ${vehicle.alias || vehicle.plate}`,
          description: 'Este vehículo no ha generado ingresos en los últimos 30 días',
          impact: 'Pérdida de ingresos potenciales. Revisar estrategia de precios.',
          action: {
            label: 'Ver vehículo',
            href: `/dashboard/vehicles/${vehicle.id}`,
          },
          data: { vehicleId: vehicle.id, daysIdle: 30 },
        });
      } else if (vehicleRecords.length <= 2) {
        generatedAlerts.push({
          id: `vehicle-low-occupancy-${vehicle.id}`,
          type: 'info',
          category: 'vehicle',
          title: `Vehículo con baja ocupación: ${vehicle.alias || vehicle.plate}`,
          description: 'Solo ha sido rentado pocas veces en el último mes',
          impact: 'Oportunidad de mejora en ocupación.',
          action: {
            label: 'Ver vehículo',
            href: `/dashboard/vehicles/${vehicle.id}`,
          },
          data: { vehicleId: vehicle.id, rentalCount: vehicleRecords.length },
        });
      }
    });

    // 3. Alertas de Gastos Atípicos
    const expenseRecords = financialRecords.filter(r => 
      r.type === 'expense' && 
      new Date(r.date) >= cutoffDate
    );

    const avgExpense = expenseRecords.length > 0 
      ? expenseRecords.reduce((sum, r) => sum + (r.amount || 0), 0) / expenseRecords.length 
      : 0;

    expenseRecords.forEach(record => {
      const otherExpenses = expenseRecords.filter(r => r.id !== record.id);
      const avgOtherExpense = otherExpenses.length > 0
        ? otherExpenses.reduce((sum, r) => sum + (r.amount || 0), 0) / otherExpenses.length
        : 0;
      if (record.amount && avgOtherExpense > 0 && record.amount > avgOtherExpense * 2 && record.amount > 5000) {
        generatedAlerts.push({
          id: `expense-spike-${record.id}`,
          type: 'warning',
          category: 'finance',
          title: `Gasto atípico detectado: $${record.amount.toLocaleString('es-MX')}`,
          description: `Este gasto es ${Math.round((record.amount / avgOtherExpense) * 100)}% mayor al promedio`,
          impact: 'Puede afectar la rentabilidad del vehículo.',
          action: {
            label: 'Ver gasto',
            href: `/dashboard/finanzas?transaction=${record.id}`,
          },
          data: { recordId: record.id, amount: record.amount, avgExpense: avgOtherExpense },
        });
      }
    });

    // 4. Alertas de Oportunidad - Vehículos Muy Rentables
    vehicles
      .filter(v => !v.isDeleted && v.status !== 'sold')
      .forEach(vehicle => {
        const vehicleRecords = financialRecords.filter(r => 
          r.vehicleId === vehicle.id && 
          new Date(r.date) >= cutoffDate
        );

        const income = vehicleRecords
          .filter(r => r.type === 'income')
          .reduce((sum, r) => sum + (r.amount || 0), 0);

        const expenses = vehicleRecords
          .filter(r => r.type === 'expense')
          .reduce((sum, r) => sum + (r.amount || 0), 0);

        const netProfit = income - expenses;
        const margin = income > 0 ? (netProfit / income) * 100 : 0;

        if (margin > 50 && income > 10000) {
          generatedAlerts.push({
            id: `vehicle-high-profit-${vehicle.id}`,
            type: 'opportunity',
            category: 'vehicle',
            title: `Vehículo muy rentable: ${vehicle.alias || vehicle.plate}`,
            description: `Margen de utilidad del ${margin.toFixed(0)}% ($${netProfit.toLocaleString('es-MX')})`,
            impact: 'Oportunidad: Considera aumentar el precio para maximizar ganancias.',
            action: {
              label: 'Ver vehículo',
              href: `/dashboard/vehicles/${vehicle.id}`,
            },
            data: { vehicleId: vehicle.id, margin, netProfit },
          });
        }
      });

    // 5. Alertas de Mantenimiento Próximo (basado en kilometraje)
    vehicles
      .filter(v => !v.isDeleted && v.status !== 'sold' && v.currentMileage)
      .forEach(vehicle => {
        const maintenanceInterval = getMaintenanceIntervalKm(vehicle);
        const nextMaintenance = (vehicle.lastMaintenanceMileage || 0) + maintenanceInterval;
        const kmToMaintenance = nextMaintenance - vehicle.currentMileage;

        if (kmToMaintenance < 500 && kmToMaintenance > 0) {
          generatedAlerts.push({
            id: `maintenance-soon-${vehicle.id}`,
            type: 'info',
            category: 'maintenance',
            title: `Mantenimiento próximo: ${vehicle.alias || vehicle.plate}`,
            description: `Faltan ${kmToMaintenance} km para el próximo mantenimiento`,
            impact: 'Programa el mantenimiento para evitar daños mayores.',
            action: {
              label: 'Ver vehículo',
              href: `/dashboard/vehicles/${vehicle.id}`,
            },
            data: { vehicleId: vehicle.id, kmToMaintenance },
          });
        } else if (kmToMaintenance <= 0) {
          generatedAlerts.push({
            id: `maintenance-overdue-${vehicle.id}`,
            type: 'critical',
            category: 'maintenance',
            title: `Mantenimiento vencido: ${vehicle.alias || vehicle.plate}`,
            description: `El mantenimiento está vencido por ${Math.abs(kmToMaintenance)} km`,
            impact: 'Riesgo de fallas mecánicas. Programa mantenimiento urgente.',
            action: {
              label: 'Ver vehículo',
              href: `/dashboard/vehicles/${vehicle.id}`,
            },
            data: { vehicleId: vehicle.id, kmOverdue: Math.abs(kmToMaintenance) },
          });
        }
      });

    // Ordenar alertas por criticidad
    const priorityOrder = { critical: 0, warning: 1, info: 2, opportunity: 3 };
    return generatedAlerts.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
  }, [vehicles, clients, financialRecords, periodDays]);

  // Contar alertas por tipo
  const alertCounts = useMemo(() => ({
    critical: alerts.filter(a => a.type === 'critical').length,
    warning: alerts.filter(a => a.type === 'warning').length,
    info: alerts.filter(a => a.type === 'info').length,
    opportunity: alerts.filter(a => a.type === 'opportunity').length,
  }), [alerts]);

  return (
    <div className="space-y-4">
      {/* Resumen de Alertas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertCounts.critical}</div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advertencias</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alertCounts.warning}</div>
            <p className="text-xs text-muted-foreground">Monitorear de cerca</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Informativas</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{alertCounts.info}</div>
            <p className="text-xs text-muted-foreground">Para tu conocimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{alertCounts.opportunity}</div>
            <p className="text-xs text-muted-foreground">Para mejorar ganancias</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alertas */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className={getAlertCardClass(alert.type)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <AlertIcon type={alert.type} />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{alert.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {alert.description}
                      </CardDescription>
                    </div>
                    <Badge variant={getAlertBadgeVariant(alert.type)}>
                      {getAlertBadgeLabel(alert.type)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Impacto:</strong> {alert.impact}
                  </p>
                  {alert.action && (
                    <Button asChild size="sm" variant={getAlertButtonVariant(alert.type)}>
                      <Link href={alert.action.href}>
                        {alert.action.label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">¡Todo en Orden!</h3>
            <p className="text-muted-foreground text-center">
              No hay alertas de negocio en este momento. Tu operación está funcionando correctamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getAlertCardClass(type: BusinessAlert['type']): string {
  const baseClass = 'border-l-4';
  switch (type) {
    case 'critical':
      return `${baseClass} border-l-red-600 bg-red-50 dark:bg-red-950/20`;
    case 'warning':
      return `${baseClass} border-l-yellow-600 bg-yellow-50 dark:bg-yellow-950/20`;
    case 'info':
      return `${baseClass} border-l-blue-600 bg-blue-50 dark:bg-blue-950/20`;
    case 'opportunity':
      return `${baseClass} border-l-green-600 bg-green-50 dark:bg-green-950/20`;
    default:
      return baseClass;
  }
}

function getAlertBadgeVariant(type: BusinessAlert['type']): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (type) {
    case 'critical':
      return 'destructive';
    case 'warning':
      return 'default';
    case 'info':
      return 'secondary';
    case 'opportunity':
      return 'outline';
    default:
      return 'default';
  }
}

function getAlertBadgeLabel(type: BusinessAlert['type']): string {
  switch (type) {
    case 'critical':
      return 'Crítico';
    case 'warning':
      return 'Advertencia';
    case 'info':
      return 'Informativo';
    case 'opportunity':
      return 'Oportunidad';
    default:
      return 'Alerta';
  }
}

function getAlertButtonVariant(type: BusinessAlert['type']): 'default' | 'destructive' | 'outline' | 'secondary' {
  switch (type) {
    case 'critical':
      return 'destructive';
    case 'warning':
      return 'default';
    default:
      return 'outline';
  }
}

function AlertIcon({ type }: { type: BusinessAlert['type'] }) {
  switch (type) {
    case 'critical':
      return <AlertTriangle className="h-6 w-6 text-red-600" />;
    case 'warning':
      return <AlertCircle className="h-6 w-6 text-yellow-600" />;
    case 'info':
      return <Clock className="h-6 w-6 text-blue-600" />;
    case 'opportunity':
      return <TrendingUp className="h-6 w-6 text-green-600" />;
    default:
      return <AlertCircle className="h-6 w-6" />;
  }
}
