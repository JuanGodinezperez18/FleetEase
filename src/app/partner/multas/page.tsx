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

export default function PartnerMultasPage() {
  const { currentUser } = useAuth();
  const { multas, rawVehicles, partners, clients, loadingData } = useData();

  // Obtener socio actual
  const currentPartner = useMemo(() => {
    return partners.find(p => p.userId === currentUser?.uid);
  }, [partners, currentUser]);

  // Vehículos del socio
  const partnerVehicleIds = useMemo(() => {
    if (!currentPartner) return new Set<string>();
    return new Set(
      rawVehicles
        .filter(v => v.partnerId === currentPartner.id && v.status !== 'sold')
        .map(v => v.id)
    );
  }, [currentPartner, rawVehicles]);

  // Multas de los vehículos del socio con detalles
  const partnerMultas: MultaWithDetails[] = useMemo(() => {
    return multas
      .filter(m => !m.isDeleted && partnerVehicleIds.has(m.vehicleId))
      .map(multa => {
        const vehicle = rawVehicles.find(v => v.id === multa.vehicleId);
        const client = clients.find(c => c.id === multa.clientId);

        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(multa.fechaInfraccion).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...multa,
          vehiclePlate: vehicle?.plate,
          vehicleAlias: vehicle?.alias,
          clientName: client ? `${client.firstname} ${client.lastname}` : 'Sin asignar',
          clientPhone: client?.phone,
          daysOverdue,
        };
      })
      .sort((a, b) => new Date(b.fechaInfraccion).getTime() - new Date(a.fechaInfraccion).getTime());
  }, [multas, partnerVehicleIds, rawVehicles, clients]);

  // Estadísticas
  const stats = useMemo(() => {
    const pendientes = partnerMultas.filter(m => m.status === 'pendiente');
    const pagadas = partnerMultas.filter(m => m.status === 'pagada');
    const enProceso = partnerMultas.filter(m => m.status === 'en_proceso');

    const totalPendiente = pendientes.reduce((sum, m) => sum + m.total, 0);
    const totalPagado = pagadas.reduce((sum, m) => sum + m.total, 0);

    return {
      total: partnerMultas.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      enProceso: enProceso.length,
      totalPendiente,
      totalPagado,
    };
  }, [partnerMultas]);

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

  if (!currentPartner) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          No se encontró información del socio. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Multas de tus Vehículos</h1>
        <p className="text-muted-foreground">
          Infracciones de tránsito de todos tus vehículos
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Multas</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              De todos tus vehículos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalPendiente)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pagadas}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalPagado)}
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
          <CardTitle>Historial de Multas</CardTitle>
          <CardDescription>
            Todas las infracciones registradas de tus vehículos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partnerMultas.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold">¡Sin multas registradas!</p>
              <p className="text-muted-foreground">
                Tus vehículos no tienen infracciones de tránsito
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Cliente Responsable</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerMultas.map((multa) => (
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{multa.clientName}</span>
                          {multa.clientPhone && (
                            <span className="text-xs text-muted-foreground">{multa.clientPhone}</span>
                          )}
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
    </div>
  );
}
