'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, ArrowLeft, ImageIcon } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { AssignmentForm } from './components/assignment-form';
import { toast } from 'sonner';
import type { Vehicle, Client, VehicleAssignmentLog } from '@/types';

export default function VehicleAssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId') || undefined;

  const { vehicleAssignmentLogs, rawVehicles, clients, endVehicleAssignment, loadingData } = useData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [endingLogId, setEndingLogId] = useState<string | null>(null);

  const vehicleById = useMemo(() => {
    const map = new Map<string, Vehicle>();
    rawVehicles.forEach((v: Vehicle) => map.set(v.id, v));
    return map;
  }, [rawVehicles]);

  const clientById = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach((c: Client) => map.set(c.id, c));
    return map;
  }, [clients]);

  const sortedLogs = useMemo(() => {
    let logs = [...vehicleAssignmentLogs];
    if (preselectedVehicleId) {
      logs = logs.filter((log: VehicleAssignmentLog) => log.vehicleId === preselectedVehicleId);
    }
    return logs.sort((a: VehicleAssignmentLog, b: VehicleAssignmentLog) =>
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }, [vehicleAssignmentLogs, preselectedVehicleId]);

  const handleEndAssignment = async (log: VehicleAssignmentLog) => {
    setEndingLogId(log.id);
    try {
      await endVehicleAssignment(log.id, log.vehicleId);
    } catch (error) {
      // El error ya se notifica dentro de endVehicleAssignment via toast
    } finally {
      setEndingLogId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/vehicles')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Asignaciones de Vehículos</h2>
          <p className="text-sm text-muted-foreground">
            Historial de qué cliente tuvo cada unidad asignada — útil para identificar responsables ante multas.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>
                {preselectedVehicleId
                  ? `Historial - ${vehicleById.get(preselectedVehicleId)?.plate || 'Vehículo'}`
                  : 'Historial de Asignaciones'}
              </CardTitle>
              <CardDescription>
                {preselectedVehicleId && (
                  <Button variant="link" className="px-0 h-auto" onClick={() => router.push('/dashboard/vehicles/assignments')}>
                    Ver todas las asignaciones
                  </Button>
                )}
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nueva Asignación
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <p className="text-sm text-muted-foreground">Cargando historial...</p>
          ) : sortedLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No hay asignaciones registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Asignado</TableHead>
                    <TableHead>Finalizado</TableHead>
                    <TableHead>Odómetro</TableHead>
                    <TableHead>Combustible</TableHead>
                    <TableHead>Fotos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.map((log: VehicleAssignmentLog) => {
                    const vehicle = vehicleById.get(log.vehicleId);
                    const client = log.clientId ? clientById.get(log.clientId) : null;
                    const isActive = !log.unassignedAt;
                    const photoCount = log.photos ? Object.keys(log.photos).length : 0;

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          {vehicle ? `${vehicle.plate} - ${vehicle.make} ${vehicle.model}` : log.vehicleId}
                        </TableCell>
                        <TableCell>
                          {client ? `${client.firstname} ${client.lastname}` : '—'}
                        </TableCell>
                        <TableCell>{formatDate(log.assignedAt)}</TableCell>
                        <TableCell>{log.unassignedAt ? formatDate(log.unassignedAt) : '—'}</TableCell>
                        <TableCell>{log.odometerReading != null ? `${log.odometerReading} km` : '—'}</TableCell>
                        <TableCell>{log.fuelLevel || '—'}</TableCell>
                        <TableCell>
                          {photoCount > 0 ? (
                            <div className="flex items-center gap-1">
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span className="text-xs">{photoCount}</span>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isActive ? 'default' : 'outline'}>
                            {isActive ? 'Activa' : 'Finalizada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={endingLogId === log.id}
                              onClick={() => handleEndAssignment(log)}
                            >
                              Finalizar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Asignación</DialogTitle>
            <DialogDescription>
              Selecciona el cliente y la unidad, y registra las condiciones de entrega.
            </DialogDescription>
          </DialogHeader>
          <AssignmentForm
            preselectedVehicleId={preselectedVehicleId}
            onCancel={() => setIsFormOpen(false)}
            onSuccess={() => {
              setIsFormOpen(false);
              toast.success('Asignación registrada');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
