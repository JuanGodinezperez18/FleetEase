"use client";

import React, { useMemo } from 'react';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MultaWithDetails } from '@/types';

export default function ClientMultasPage() {
  const { currentUser } = useAuth();
  const { multas, rawVehicles, clients, loadingData } = useData();

  // Obtener cliente actual
  const currentClient = useMemo(() => {
    return clients.find(c => c.userId === currentUser?.uid);
  }, [clients, currentUser]);

  // TODAS las multas del cliente (de todos los vehículos que haya tenido)
  const clientMultas: MultaWithDetails[] = useMemo(() => {
    if (!currentClient) return [];

    return multas
      .filter(m => !m.isDeleted && m.clientId === currentClient.id)
      .map(multa => {
        const vehicle = rawVehicles.find(v => v.id === multa.vehicleId);

        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(multa.fechaInfraccion).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...multa,
          vehiclePlate: vehicle?.plate,
          vehicleAlias: vehicle?.alias,
          clientName: `${currentClient.firstname} ${currentClient.lastname}`,
          clientPhone: currentClient.phone,
          daysOverdue,
        };
      })
      .sort((a, b) => new Date(b.fechaInfraccion).getTime() - new Date(a.fechaInfraccion).getTime());
  }, [multas, currentClient, rawVehicles]);

  // Estadísticas
  const stats = useMemo(() => {
    const pendientes = clientMultas.filter(m => m.status === 'pendiente');
    const pagadas = clientMultas.filter(m => m.status === 'pagada');
    const enProceso = clientMultas.filter(m => m.status === 'en_proceso');

    const totalPendiente = pendientes.reduce((sum, m) => sum + m.total, 0);
    const totalPagado = pagadas.reduce((sum, m) => sum + m.total, 0);

    // Agrupar por vehículo
    const vehiculosMap = new Map<string, number>();
    clientMultas.forEach(m => {
      const count = vehiculosMap.get(m.vehicleId) || 0;
      vehiculosMap.set(m.vehicleId, count + 1);
    });

    return {
      total: clientMultas.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      enProceso: enProceso.length,
      totalPendiente,
      totalPagado,
      vehiculosConMultas: vehiculosMap.size,
    };
  }, [clientMultas]);

  const getStatusBadge = (status: string) => {
    const variants = {
      pendiente: 'destructive',
      pagada: 'default',
      en_proceso: 'secondary',
      cancelada: 'outline',
    };

    const labels = {
      pendiente: 'Pendiente',
      pagada: 'Pagada',
      en_proceso: 'En Proceso',
      cancelada: 'Cancelada',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentClient) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          No se encontró información del cliente. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tus Multas</h1>
        <p className="text-muted-foreground">
          Historial completo de tus infracciones de tránsito
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Multas</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              En {stats.vehiculosConMultas} vehículo{stats.vehiculosConMultas !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalPendiente)} a pagar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.pagadas}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalPagado)} histórico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enProceso}</div>
            <p className="text-xs text-muted-foreground">
              En gestión
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de multas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Infracciones</CardTitle>
          <CardDescription>
            Todas las multas que te corresponden, de todos los vehículos que hayas tenido asignados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientMultas.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold">¡Excelente!</p>
              <p className="text-muted-foreground">
                No tienes multas registradas
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientMultas.map((multa) => (
                    <TableRow key={multa.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>
                            {format(new Date(multa.fechaInfraccion), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Hace {multa.daysOverdue} días
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{multa.vehiclePlate}</span>
                          <span className="text-xs text-muted-foreground">{multa.vehicleAlias}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={multa.descripcion}>
                          {multa.descripcion}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={multa.direccion}>
                          {multa.direccion}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(multa.importe)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(multa.total)}
                      </TableCell>
                      <TableCell>{getStatusBadge(multa.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nota informativa */}
      {clientMultas.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Importante
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Estas son todas las multas registradas a tu nombre, incluyendo vehículos que tuviste asignados anteriormente.
                  Si tienes multas pendientes, es importante que las liquides para evitar recargos adicionales.
                </p>
                {stats.pendientes > 0 && (
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-2">
                    Tienes {stats.pendientes} multa{stats.pendientes !== 1 ? 's' : ''} pendiente{stats.pendientes !== 1 ? 's' : ''} por un total de {formatCurrency(stats.totalPendiente)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
