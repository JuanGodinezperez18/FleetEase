'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PlusCircle,
  ArrowLeft,
  ImageIcon,
  Car,
  Users,
  ShieldCheck,
  Clock3,
  Loader2,
} from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { AssignmentForm } from './components/assignment-form';
import { toast } from 'sonner';
import type { Vehicle, Client, VehicleAssignmentLog } from '@/types';

export default function VehicleAssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId') || undefined;
  const {
    vehicleAssignmentLogs,
    rawVehicles,
    clients,
    endVehicleAssignment,
    loadingData,
    credits,
  } = useData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [endingLogId, setEndingLogId] = useState<string | null>(null);

  const vehicleById = useMemo(
    () => new Map(rawVehicles.map((v: Vehicle) => [v.id, v])),
    [rawVehicles]
  );
  const clientById = useMemo(
    () => new Map(clients.map((c: Client) => [c.id, c])),
    [clients]
  );

  const sortedLogs = useMemo(() => {
    let logs = [...vehicleAssignmentLogs];
    if (preselectedVehicleId) {
      logs = logs.filter(
        (log: VehicleAssignmentLog) => log.vehicleId === preselectedVehicleId
      );
    }
    return logs.sort(
      (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }, [vehicleAssignmentLogs, preselectedVehicleId]);

  const activeAssignments = useMemo(
    () => sortedLogs.filter(log => !log.unassignedAt),
    [sortedLogs]
  );
  const availableCount = useMemo(
    () =>
      rawVehicles.filter(
        v =>
          !v.isDeleted &&
          v.status === 'active' &&
          !v.clientId &&
          !v.lockedByCredit
      ).length,
    [rawVehicles]
  );
  const protectedCount = useMemo(
    () => rawVehicles.filter(v => !v.isDeleted && v.lockedByCredit).length,
    [rawVehicles]
  );

  const handleEndAssignment = async (log: VehicleAssignmentLog) => {
    const vehicle = vehicleById.get(log.vehicleId);
    if (!vehicle) return;

    const activeCredit = credits.some(
      credit => credit.vehicleId === vehicle.id && credit.status === 'active'
    );
    if (activeCredit || vehicle.lockedByCredit) {
      toast.error('No se puede desasignar', {
        description:
          'Este vehículo está protegido por un crédito activo. Debe liquidarse o cancelarse el crédito primero.',
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

  const preselectedPlate = preselectedVehicleId
    ? vehicleById.get(preselectedVehicleId)?.plate
    : null;

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 h-9 w-9 rounded-xl text-white/50 hover:bg-white/[0.06] hover:text-white"
              onClick={() => router.push('/dashboard/vehicles')}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </Button>
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
                Flota · Asignaciones
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                Asignaciones
              </h1>
              <p className="mt-1 max-w-xl text-sm text-white/45">
                Entrega, libera y consulta el historial de cada unidad
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="h-10 shrink-0 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Nueva asignación
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3.5 rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.18)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <Car className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                Asignadas ahora
              </p>
              <p className="mt-0.5 font-heading text-2xl font-semibold tabular-nums text-white">
                {activeAssignments.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.18)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50">
              <Users className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                Disponibles
              </p>
              <p className="mt-0.5 font-heading text-2xl font-semibold tabular-nums text-white">
                {availableCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.18)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/[0.08] text-amber-300">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                Protegidas por crédito
              </p>
              <p className="mt-0.5 font-heading text-2xl font-semibold tabular-nums text-white">
                {protectedCount}
              </p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-heading text-lg font-semibold text-white">
                {preselectedVehicleId
                  ? `Historial · ${preselectedPlate || 'Vehículo'}`
                  : 'Historial de asignaciones'}
              </h2>
              <p className="mt-0.5 text-sm text-white/40">
                Quién tuvo cada unidad y cuándo terminó la asignación
              </p>
            </div>
            {preselectedVehicleId && (
              <Button
                variant="ghost"
                className="h-9 w-fit rounded-xl px-3 text-xs text-white/50 hover:bg-white/[0.06] hover:text-white"
                onClick={() => router.push('/dashboard/vehicles/assignments')}
              >
                Ver todas
              </Button>
            )}
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center gap-2 py-16 text-white/40">
              <Loader2 className="h-5 w-5 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
              <span className="text-sm">Cargando asignaciones…</span>
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                <Clock3 className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <p className="font-heading text-base font-semibold text-white">
                No hay asignaciones registradas
              </p>
              <p className="mt-1 max-w-sm text-sm text-white/40">
                Cuando entregues una unidad, su historial aparecerá aquí.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/40">Vehículo</TableHead>
                      <TableHead className="text-white/40">Cliente</TableHead>
                      <TableHead className="text-white/40">Asignado</TableHead>
                      <TableHead className="text-white/40">Finalizado</TableHead>
                      <TableHead className="text-white/40">Odómetro</TableHead>
                      <TableHead className="text-white/40">Combustible</TableHead>
                      <TableHead className="text-white/40">Fotos</TableHead>
                      <TableHead className="text-white/40">Estado</TableHead>
                      <TableHead className="text-right text-white/40">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLogs.map(log => {
                      const vehicle = vehicleById.get(log.vehicleId);
                      const client = log.clientId ? clientById.get(log.clientId) : null;
                      const isActive = !log.unassignedAt;
                      const isCreditProtected =
                        !!vehicle?.lockedByCredit ||
                        credits.some(
                          credit =>
                            credit.vehicleId === log.vehicleId && credit.status === 'active'
                        );
                      const photoCount = log.photos ? Object.keys(log.photos).length : 0;
                      return (
                        <TableRow
                          key={log.id}
                          className="border-white/[0.06] hover:bg-white/[0.03]"
                        >
                          <TableCell className="font-medium text-white/90">
                            {vehicle
                              ? `${vehicle.plate} · ${vehicle.make} ${vehicle.model}`
                              : log.vehicleId}
                          </TableCell>
                          <TableCell className="text-white/70">
                            {client ? `${client.firstname} ${client.lastname}` : '—'}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {formatDate(log.assignedAt)}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {log.unassignedAt ? formatDate(log.unassignedAt) : '—'}
                          </TableCell>
                          <TableCell className="tabular-nums text-white/60">
                            {log.odometerReading != null
                              ? `${log.odometerReading.toLocaleString()} km`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {log.fuelLevel || '—'}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {photoCount > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                                {photoCount}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            {isActive ? (
                              <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                Activa
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/45">
                                Finalizada
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={endingLogId === log.id || isCreditProtected}
                                title={
                                  isCreditProtected
                                    ? 'Protegida por crédito activo'
                                    : undefined
                                }
                                onClick={() => handleEndAssignment(log)}
                                className="h-8 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                              >
                                {isCreditProtected
                                  ? 'Protegida'
                                  : endingLogId === log.id
                                    ? 'Liberando…'
                                    : 'Desasignar'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 p-4 md:hidden">
                {sortedLogs.map(log => {
                  const vehicle = vehicleById.get(log.vehicleId);
                  const client = log.clientId ? clientById.get(log.clientId) : null;
                  const isActive = !log.unassignedAt;
                  const isCreditProtected =
                    !!vehicle?.lockedByCredit ||
                    credits.some(
                      credit =>
                        credit.vehicleId === log.vehicleId && credit.status === 'active'
                    );
                  const photoCount = log.photos ? Object.keys(log.photos).length : 0;

                  return (
                    <article
                      key={log.id}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-heading text-sm font-semibold text-white">
                            {vehicle
                              ? `${vehicle.plate} · ${vehicle.make} ${vehicle.model}`
                              : log.vehicleId}
                          </p>
                          <p className="mt-0.5 text-xs text-white/45">
                            {client
                              ? `${client.firstname} ${client.lastname}`
                              : 'Sin cliente'}
                          </p>
                        </div>
                        {isActive ? (
                          <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            Activa
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/45">
                            Finalizada
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/50">
                        <div>
                          <span className="text-white/35">Asignado</span>
                          <p className="mt-0.5 text-white/75">{formatDate(log.assignedAt)}</p>
                        </div>
                        <div>
                          <span className="text-white/35">Finalizado</span>
                          <p className="mt-0.5 text-white/75">
                            {log.unassignedAt ? formatDate(log.unassignedAt) : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/35">Odómetro</span>
                          <p className="mt-0.5 tabular-nums text-white/75">
                            {log.odometerReading != null
                              ? `${log.odometerReading.toLocaleString()} km`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/35">Combustible</span>
                          <p className="mt-0.5 text-white/75">{log.fuelLevel || '—'}</p>
                        </div>
                        {photoCount > 0 && (
                          <div className="col-span-2">
                            <span className="inline-flex items-center gap-1 text-white/50">
                              <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                              {photoCount} foto{photoCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={endingLogId === log.id || isCreditProtected}
                          title={
                            isCreditProtected ? 'Protegida por crédito activo' : undefined
                          }
                          onClick={() => handleEndAssignment(log)}
                          className="mt-3 h-9 w-full rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                        >
                          {isCreditProtected
                            ? 'Protegida por crédito'
                            : endingLogId === log.id
                              ? 'Liberando…'
                              : 'Desasignar'}
                        </Button>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[95dvh] max-w-2xl overflow-y-auto rounded-[24px] border-white/10 bg-[#0e1117] text-white sm:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-[-0.02em]">
              Nueva asignación
            </DialogTitle>
            <DialogDescription className="text-white/45">
              Selecciona un cliente y una unidad disponible. Las unidades asignadas o protegidas
              por crédito no aparecen aquí.
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
