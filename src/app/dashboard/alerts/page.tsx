/**
 * Página de Alertas de Negocio Inteligentes
 */

'use client';

import React from 'react';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useFinances } from '@/contexts/providers/finances-provider';
import { SmartBusinessAlerts } from '@/components/dashboard/smart-business-alerts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bell, InfoIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AlertsPage() {
  const { vehicles = [] } = useVehicles();
  const { clients = [] } = useClients();
  const { financialRecords = [] } = useFinances();

  const hasData = vehicles.length > 0 && clients.length > 0 && financialRecords.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alertas de Negocio</h1>
        <p className="text-muted-foreground mt-1">
          Notificaciones inteligentes sobre tu operación
        </p>
      </div>

      {/* Feature Description */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <Bell className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          Alertas Inteligentes
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2">
          El sistema analiza automáticamente tu operación y te notifica sobre:
          clientes morosos, vehículos sin renta, gastos atípicos, mantenimientos vencidos,
          y oportunidades de mejora.
        </AlertDescription>
      </Alert>

      {/* Contenido Principal */}
      {hasData ? (
        <SmartBusinessAlerts
          vehicles={vehicles}
          clients={clients}
          financialRecords={financialRecords}
          periodDays={30}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Insuficientes Datos para Alertas</CardTitle>
            <CardDescription>
              El sistema necesita más información para generar alertas inteligentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Para activar las alertas, necesitas registrar:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Al menos 1 vehículo</li>
                <li>Al menos 1 cliente</li>
                <li>Al menos 1 registro financiero (ingreso o gasto)</li>
              </ul>
              <div className="flex gap-4 mt-4">
                <Button asChild>
                  <Link href="/dashboard/vehicles">Registrar Vehículo</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/clients">Registrar Cliente</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/finanzas">Registrar Ingreso/Gasto</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guía de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            Tipos de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-red-600">
                <span className="h-3 w-3 rounded-full bg-red-600" />
                Críticas
              </div>
              <p className="text-muted-foreground">
                Problemas graves que requieren atención inmediata: clientes con deuda &gt;$5,000,
                mantenimientos vencidos, pérdidas significativas.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-yellow-600">
                <span className="h-3 w-3 rounded-full bg-yellow-600" />
                Advertencias
              </div>
              <p className="text-muted-foreground">
                Problemas moderados que debes monitorear: deuda entre $2,000-$5,000,
                vehículos sin renta, gastos atípicos.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-blue-600">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Informativas
              </div>
              <p className="text-muted-foreground">
                Información útil para tu operación: mantenimientos próximos,
                vehículos con baja ocupación, recordatorios.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-green-600">
                <span className="h-3 w-3 rounded-full bg-green-600" />
                Oportunidades
              </div>
              <p className="text-muted-foreground">
                Oportunidades para mejorar ganancias: vehículos muy rentables
                (sugerencia de aumento de precio), clientes confiables para créditos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
