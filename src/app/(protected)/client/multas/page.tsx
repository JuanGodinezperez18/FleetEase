"use client";

import React, { useMemo } from 'react';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MultaWithDetails } from '@/types';

export default function ClientMultasPage() {
  const { currentUser } = useAuth();
  const { multas, rawVehicles, clients, loadingData } = useData();

  const currentClient = useMemo(() => clients.find(c => c.userId === currentUser?.uid), [clients, currentUser]);

  const clientMultas: MultaWithDetails[] = useMemo(() => {
    if (!currentClient) return [];
    return multas
      .filter(m => !m.isDeleted && m.clientId === currentClient.id)
      .map(multa => {
        const vehicle = rawVehicles.find(v => v.id === multa.vehicleId);
        const daysOverdue = Math.floor((new Date().getTime() - new Date(multa.fechaInfraccion).getTime()) / (1000 * 60 * 60 * 24));
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

  const stats = useMemo(() => {
    const pendientes = clientMultas.filter(m => m.status === 'pendiente');
    const pagadas = clientMultas.filter(m => m.status === 'pagada');
    const enProceso = clientMultas.filter(m => m.status === 'en_proceso');
    // Pendiente y En Proceso siguen siendo obligaciones del cliente.
    // Solo Pagada y Cancelada dejan de formar parte del saldo por pagar.
    const multasPorPagar = clientMultas.filter(m => m.status === 'pendiente' || m.status === 'en_proceso');
    const totalPendiente = multasPorPagar.reduce((sum, m) => sum + m.total, 0);
    const totalPagado = pagadas.reduce((sum, m) => sum + m.total, 0);
    const vehiculosMap = new Map<string, number>();
    clientMultas.forEach(m => vehiculosMap.set(m.vehicleId, (vehiculosMap.get(m.vehicleId) || 0) + 1));
    return { total: clientMultas.length, pendientes: pendientes.length, pagadas: pagadas.length, enProceso: enProceso.length, totalPendiente, totalPagado, vehiculosConMultas: vehiculosMap.size };
  }, [clientMultas]);

  const getStatusBadge = (status: string) => {
    const variants = { pendiente: 'destructive', pagada: 'default', en_proceso: 'secondary', cancelada: 'outline' };
    const labels = { pendiente: 'Pendiente', pagada: 'Pagada', en_proceso: 'En Proceso', cancelada: 'Cancelada' };
    return <Badge variant={variants[status as keyof typeof variants] as any}>{labels[status as keyof typeof labels]}</Badge>;
  };

  if (loadingData) {
    return <div className="flex h-96 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[var(--fe-lime)]" /></div>;
  }

  if (!currentClient) {
    return <div className="fe-surface mx-auto max-w-2xl rounded-2xl p-6 text-sm text-white/60">No se encontró información del cliente. Contacta al administrador.</div>;
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="fe-section-title font-heading">Tus Multas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historial completo de tus infracciones de tránsito</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="fe-surface"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Multas</CardTitle><ShieldAlert className="h-4 w-4 text-[var(--fe-lime)]" /></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.total}</div><p className="text-xs text-muted-foreground">En {stats.vehiculosConMultas} vehículo{stats.vehiculosConMultas !== 1 ? 's' : ''}</p></CardContent></Card>
        <Card className="fe-surface"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Por pagar</CardTitle><Clock className="h-4 w-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-semibold text-yellow-500">{stats.pendientes + stats.enProceso}</div><p className="text-xs text-muted-foreground">{formatCurrency(stats.totalPendiente)} a pagar</p></CardContent></Card>
        <Card className="fe-surface"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pagadas</CardTitle><CheckCircle className="h-4 w-4 text-emerald-400" /></CardHeader><CardContent><div className="text-2xl font-semibold text-emerald-400">{stats.pagadas}</div><p className="text-xs text-muted-foreground">{formatCurrency(stats.totalPagado)} histórico</p></CardContent></Card>
        <Card className="fe-surface"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">En Proceso</CardTitle><AlertTriangle className="h-4 w-4 text-amber-400" /></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.enProceso}</div><p className="text-xs text-muted-foreground">En gestión</p></CardContent></Card>
      </div>

      <Card className="fe-surface">
        <CardHeader><CardTitle className="font-heading">Historial de Infracciones</CardTitle><CardDescription>Todas las multas que te corresponden, de todos los vehículos que hayas tenido asignados</CardDescription></CardHeader>
        <CardContent>
          {clientMultas.length === 0 ? (
            <div className="py-12 text-center"><CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-400" /><p className="text-lg font-semibold">¡Excelente!</p><p className="text-muted-foreground">No tienes multas registradas</p></div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Vehículo</TableHead><TableHead>Descripción</TableHead><TableHead>Dirección</TableHead><TableHead className="text-right">Importe</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
              {clientMultas.map((multa) => (
                <TableRow key={multa.id}>
                  <TableCell><div className="flex flex-col"><span>{format(new Date(multa.fechaInfraccion), 'dd/MM/yyyy', { locale: es })}</span><span className="text-xs text-muted-foreground">Hace {multa.daysOverdue} días</span></div></TableCell>
                  <TableCell><div className="flex flex-col"><span className="font-medium">{multa.vehiclePlate}</span><span className="text-xs text-muted-foreground">{multa.vehicleAlias}</span></div></TableCell>
                  <TableCell className="max-w-xs"><div className="truncate" title={multa.descripcion}>{multa.descripcion}</div></TableCell>
                  <TableCell className="max-w-xs"><div className="truncate" title={multa.direccion}>{multa.direccion}</div></TableCell>
                  <TableCell className="text-right">{formatCurrency(multa.importe)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(multa.total)}</TableCell>
                  <TableCell>{getStatusBadge(multa.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table></div>
          )}
        </CardContent>
      </Card>

      {clientMultas.length > 0 && (
        <Card className="fe-surface border-[var(--fe-lime)]/15">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--fe-lime)]" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Importante</p>
                <p className="text-sm text-muted-foreground">Estas son todas las multas registradas a tu nombre, incluyendo vehículos que tuviste asignados anteriormente. Si tienes multas pendientes, es importante que las liquides para evitar recargos adicionales.</p>
                {stats.pendientes + stats.enProceso > 0 && <p className="mt-2 text-sm font-semibold text-[var(--fe-lime)]">Tienes {stats.pendientes + stats.enProceso} multa{stats.pendientes + stats.enProceso !== 1 ? 's' : ''} por pagar por un total de {formatCurrency(stats.totalPendiente)}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
