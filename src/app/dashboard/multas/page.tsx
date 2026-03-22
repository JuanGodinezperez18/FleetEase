"use client";

import React, { useState, useMemo } from 'react';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ShieldAlert, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MultaForm } from './components/multa-form';
import { MultasTable } from './components/multas-table';
import type { Multa, MultaWithDetails } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function MultasPage() {
  const { multas, loading: loadingFinances } = useFinances();
  const { vehicles, vehiclesLoading } = useVehicles();
  const { clients, loading: loadingClients } = useClients();
  const loadingData = loadingFinances || vehiclesLoading || loadingClients;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMulta, setSelectedMulta] = useState<Multa | null>(null);

  // Enriquecer multas con información de vehículos y clientes
  const multasWithDetails: MultaWithDetails[] = useMemo(() => {
    return multas
      .filter(m => !m.isDeleted)
      .map(multa => {
        const vehicle = vehicles.find(v => v.id === multa.vehicleId);
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
  }, [multas, vehicles, clients]);

  // Estadísticas
  const stats = useMemo(() => {
    const pendientes = multasWithDetails.filter(m => m.status === 'pendiente');
    const pagadas = multasWithDetails.filter(m => m.status === 'pagada');
    const enProceso = multasWithDetails.filter(m => m.status === 'en_proceso');

    const totalPendiente = pendientes.reduce((sum, m) => sum + m.total, 0);
    const totalPagado = pagadas.reduce((sum, m) => sum + m.total, 0);

    return {
      total: multasWithDetails.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      enProceso: enProceso.length,
      totalPendiente,
      totalPagado,
    };
  }, [multasWithDetails]);

  const handleEdit = (multa: Multa) => {
    setSelectedMulta(multa);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedMulta(null);
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multas e Infracciones</h1>
          <p className="text-muted-foreground">
            Gestiona las multas de tránsito de tu flota
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Multa
        </Button>
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
              Registradas en el sistema
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
            <XCircle className="h-4 w-4 text-blue-500" />
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
          <CardTitle>Lista de Multas</CardTitle>
          <CardDescription>
            Historial completo de multas e infracciones de tránsito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MultasTable multas={multasWithDetails} onEdit={handleEdit} />
        </CardContent>
      </Card>

      {/* Dialog del formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMulta ? 'Editar Multa' : 'Registrar Nueva Multa'}
            </DialogTitle>
            <DialogDescription>
              {selectedMulta
                ? 'Actualiza la información de la multa de tránsito'
                : 'Registra una nueva multa de tránsito y asígnala al cliente responsable'}
            </DialogDescription>
          </DialogHeader>
          <MultaForm
            multa={selectedMulta}
            onClose={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
