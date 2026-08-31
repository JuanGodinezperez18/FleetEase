'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, ArrowLeft, ImageIcon, Car, Users, ShieldCheck, Clock3 } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { AssignmentForm } from './components/assignment-form';
import { toast } from 'sonner';
import type { Vehicle, Client, VehicleAssignmentLog } from '@/types';

const shell = 'rounded-2xl border border-border bg-card/60 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl';

export default function VehicleAssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId') || undefined;
  const { vehicleAssignmentLogs, rawVehicles, clients, endVehicleAssignment, loadingData, credits } = useData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [endingLogId, setEndingLogId] = useState<string | null>(null);

  const vehicleById = useMemo(() => new Map(rawVehicles.map((v: Vehicle) => [v.id, v])), [rawVehicles]);
  const clientById = useMemo(() => new Map(clients.map((c: Client) => [c.id, c])), [clients]);

  const sortedLogs = useMemo(() => {
    let logs = [...vehicleAssignmentLogs];
    if (preselectedVehicleId) logs = logs.filter((log: VehicleAssignmentLog) => log.vehicleId === preselectedVehicleId);
    return logs.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  }, [vehicleAssignmentLogs, preselectedVehicleId]);

  const activeAssignments = useMemo(() => sortedLogs.filter((log) => !log.unassignedAt), [sortedLogs]);
  const availableCount = useMemo(
    () => rawVehicles.filter((v) => !v.isDeleted && v.status === 'active' && !v.clientId && !v.lockedByCredit).length,
    [rawVehicles]
  );
  const protectedCount = useMemo(() => rawVehicles.filter((v) => !v.isDeleted && v.lockedByCredit).length, [rawVehicles]);

  const handleEndAssignment = async (log: VehicleAssignmentLog) => {
    const vehicle = vehicleById.get(log.vehicleId);
    if (!vehicle) return;

    const activeCredit = credits.some((credit) => credit.vehicleId === vehicle.id && credit.status === 'active');
    if (activeCredit || vehicle.lockedByCredit) {
      toast.error('No se puede desasignar', {
        description: 'Este vehículo está protegido por un crédito activo. Debe liquidarse o cancelarse el crédito primero.',
      });
      return;
    }

    setEndingLogId(log.id);
    try {
      await endVehicleAssignment(log.id, log.vehicleId);
    } finally {
      setEndingLogId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1 rounded-xl" onClick={() => router.push('/dashboard/vehicles')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Car className="h-3.5 w-3.5" /> Control de flota
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Asignaciones</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Entrega, libera y consulta el historial de cada unidad sin perder trazabilidad.</p>
          </div>
        </div>
        <Button className="rounded-xl" onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva asignación
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={shell}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-primary/10 p-3 text-primary"><Car className="h-5 w-5" /></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Asignadas ahora</p><p className="text-2xl font-bold">{activeAssignments.length}</p></div>
          </CardContent>
        </Card>
        <Card className={shell}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-white/5 p-3 text-muted-foreground"><Users className="h-5 w-5" /></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Disponibles</p><p className="text-2xl font-bold">{availableCount}</p></div>
          </CardContent>
        </Card>
        <Card className={shell}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-400/10 p-3 text-amber-300"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Protegidas por crédito</p><p className="text-2xl font-bold">{protectedCount}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className={shell}>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">
                {preselectedVehicleId ? `Historial · ${vehicleById.get(preselectedVehicleId)?.plate || 'Vehículo'}` : 'Historial de asignaciones'}
              </CardTitle>
              <CardDescription>Consulta quién tuvo cada unidad y cuándo terminó la asignación.</CardDescription>
            </div>
            {preselectedVehicleId && (
              <Button variant="ghost" className="w-fit" onClick={() => router.push('/dashboard/vehicles/assignments')}>
                Ver todas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingData ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((row) => <div key={row} className="h-14 animate-pulse rounded-xl bg-white/[0.05]" />)}
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary"><Clock3 className="h-6 w-6" /></div>
              <p className="font-semibold">No hay asignaciones registradas</p>
              <p className="mt-1 text-sm text-muted-foreground">Cuando entregues una unidad, su historial aparecerá aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Vehículo</TableHead><TableHead>Cliente</TableHead><TableHead>Asignado</TableHead><TableHead>Finalizado</TableHead><TableHead>Odómetro</TableHead><TableHead>Combustible</TableHead><TableHead>Fotos</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.map((log) => {
                    const vehicle = vehicleById.get(log.vehicleId);
                    const client = log.clientId ? clientById.get(log.clientId) : null;
                    const isActive = !log.unassignedAt;
                    const isCreditProtected = !!vehicle?.lockedByCredit || credits.some((credit) => credit.vehicleId === log.vehicleId && credit.status === 'active');
                    const photoCount = log.photos ? Object.keys(log.photos).length : 0;
                    return (
                      <TableRow key={log.id} className="border-border hover:bg-accent/40">
                        <TableCell className="font-medium">{vehicle ? `${vehicle.plate} · ${vehicle.make} ${vehicle.model}` : log.vehicleId}</TableCell>
                        <TableCell>{client ? `${client.firstname} ${client.lastname}` : '—'}</TableCell>
                        <TableCell>{formatDate(log.assignedAt)}</TableCell>
                        <TableCell>{log.unassignedAt ? formatDate(log.unassignedAt) : '—'}</TableCell>
                        <TableCell>{log.odometerReading != null ? `${log.odometerReading.toLocaleString()} km` : '—'}</TableCell>
                        <TableCell>{log.fuelLevel || '—'}</TableCell>
                        <TableCell>{photoCount > 0 ? <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{photoCount}</span> : '—'}</TableCell>
                        <TableCell><Badge variant={isActive ? 'default' : 'outline'}>{isActive ? 'Activa' : 'Finalizada'}</Badge></TableCell>
                        <TableCell className="text-right">
                          {isActive && (
                            <Button variant="outline" size="sm" disabled={endingLogId === log.id || isCreditProtected} title={isCreditProtected ? 'Protegida por crédito activo' : undefined} onClick={() => handleEndAssignment(log)}>
                              {isCreditProtected ? 'Protegida' : endingLogId === log.id ? 'Liberando…' : 'Desasignar'}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-popover">
          <DialogHeader>
            <DialogTitle>Nueva asignación</DialogTitle>
            <DialogDescription>Selecciona un cliente y una unidad disponible. Las unidades asignadas o protegidas por crédito no aparecen aquí.</DialogDescription>
          </DialogHeader>
          <AssignmentForm preselectedVehicleId={preselectedVehicleId} onCancel={() => setIsFormOpen(false)} onSuccess={() => { setIsFormOpen(false); toast.success('Asignación registrada'); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
