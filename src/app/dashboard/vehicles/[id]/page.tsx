"use client";

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Vehicle, Client } from '@/types';
import { infallibleNormalizeDate, formatDate } from '@/lib/date-utils';
import { sumRentalIncome, sumExpense, calculateNetProfit } from '@/lib/financial-metrics';
import {
  Calendar,
  Palette,
  DollarSign,
  Wrench,
  Gauge,
  ShieldCheck,
  TrendingUp,
  User,
  Briefcase,
  Share2,
  Printer,
  ArrowLeft,
  Car,
  Loader2,
  FileText,
  History,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoItem } from './components/InfoItem';
import { useToast } from '@/hooks/use-toast';
import { VehicleTimeline, type TimelineEvent } from './components/VehicleTimeline';
import { VehicleStatusBadge } from '@/components/vehicles/vehicle-status-badges';
import { formatCurrency } from '@/lib/utils';

const statusTranslations: Record<Vehicle['status'], string> = {
  active: 'Activo',
  rented: 'Rentado',
  inactive: 'Inactivo',
  maintenance: 'Mantenimiento',
  sold: 'Vendido',
};

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    getVehicleWithDetailsById,
    financialRecords,
    vehicleAssignmentLogs,
    mileageLogs,
    clients,
    partners,
    loadingData,
  } = useData();
  const { toast } = useToast();

  const vehicle = useMemo(() => {
    if (!id || loadingData) return null;
    const vehicleId = Array.isArray(id) ? id[0] : id;
    return getVehicleWithDetailsById(vehicleId);
  }, [id, getVehicleWithDetailsById, loadingData]);

  const timelineEvents = useMemo(() => {
    if (!vehicle) return [];

    const events: TimelineEvent[] = [];
    const clientMap = new Map<string, Client>(clients.map(c => [c.id, c]));

    const acquisitionDate = infallibleNormalizeDate(vehicle.acquisitionDate);
    if (acquisitionDate) {
      events.push({
        id: `acq-${vehicle.id}`,
        date: acquisitionDate,
        type: 'acquisition',
        title: 'Vehículo adquirido',
        description: `Costo: ${vehicle.cost ? formatCurrency(vehicle.cost) : 'No registrado'}`,
      });
    }

    vehicleAssignmentLogs
      .filter(log => log.vehicleId === vehicle.id)
      .forEach(log => {
        const startDate = infallibleNormalizeDate(log.startDate);
        const client = log.clientId ? clientMap.get(log.clientId) : null;
        const clientName = client ? `${client.firstname} ${client.lastname}` : 'Cliente desconocido';

        if (startDate) {
          events.push({
            id: `assign-${log.id}`,
            date: startDate,
            type: 'assignment',
            title: `Asignado a ${clientName}`,
            description: log.reason || 'Inicio de asignación.',
          });
        }
        if (log.endDate) {
          const endDate = infallibleNormalizeDate(log.endDate);
          if (endDate) {
            events.push({
              id: `unassign-${log.id}`,
              date: endDate,
              type: 'assignment',
              title: `Devolución de ${clientName}`,
              description: 'Fin del periodo de asignación.',
            });
          }
        }
      });

    financialRecords
      .filter(r => r.vehicleId === vehicle.id && !r.isDeleted)
      .forEach(record => {
        const recordDate = infallibleNormalizeDate(record.date);
        if (recordDate) {
          if (record.type === 'expense') {
            events.push({
              id: `expense-${record.id}`,
              date: recordDate,
              type: 'maintenance',
              title: `Gasto: ${record.category || 'General'}`,
              description: `${record.description} - ${formatCurrency(record.amount)}`,
            });
          } else if (record.type === 'income') {
            events.push({
              id: `income-${record.id}`,
              date: recordDate,
              type: 'income',
              title: `Ingreso: ${record.category || 'General'}`,
              description: `${record.description} - ${formatCurrency(record.amount)}`,
            });
          }
        }
      });

    mileageLogs
      .filter(log => log.vehicleId === vehicle.id)
      .forEach(log => {
        const logDate = infallibleNormalizeDate(log.date);
        if (logDate) {
          events.push({
            id: `mileage-${log.id}`,
            date: logDate,
            type: 'mileage',
            title: 'Registro de kilometraje',
            description: `${log.mileage.toLocaleString()} km`,
          });
        }
      });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [vehicle, vehicleAssignmentLogs, financialRecords, mileageLogs, clients]);

  const vehicleFinancialRecords = useMemo(() => {
    if (!vehicle) return [];
    return financialRecords.filter(record => record.vehicleId === vehicle.id && !record.isDeleted);
  }, [financialRecords, vehicle]);

  const netProfit = useMemo(() => {
    if (!vehicle) return 0;
    const income = sumRentalIncome(vehicleFinancialRecords);
    const expense = sumExpense(vehicleFinancialRecords);
    const acquisitionCost = vehicle.cost || 0;
    return income - expense - acquisitionCost;
  }, [vehicleFinancialRecords, vehicle]);

  const roi = useMemo(() => {
    if (!vehicle || !vehicle.cost || vehicle.cost === 0) return null;
    const operatingProfit = calculateNetProfit(vehicleFinancialRecords);
    return ((operatingProfit / vehicle.cost) * 100).toFixed(2);
  }, [vehicleFinancialRecords, vehicle]);

  const assignedDriver = useMemo(() => {
    const activeAssignment = vehicleAssignmentLogs.find(
      a => a.vehicleId === vehicle?.id && !a.endDate
    );
    if (!activeAssignment) return { name: 'No asignado', type: '' };
    const client = clients.find(c => c.id === activeAssignment.clientId);
    return client
      ? { name: `${client.firstname} ${client.lastname}`, type: 'Cliente' }
      : { name: 'Desconocido', type: '' };
  }, [vehicleAssignmentLogs, vehicle, clients]);

  const ownerPartner = useMemo(() => {
    if (!vehicle?.partnerId) return 'N/A';
    const partner = partners.find(p => p.id === vehicle.partnerId);
    return partner ? `${partner.firstname} ${partner.lastname}` : 'Desconocido';
  }, [vehicle, partners]);

  const handleShare = async () => {
    if (!vehicle) return;
    const vehicleInfo = `
*Vehículo:* ${vehicle.make} ${vehicle.model} (${vehicle.year})
*Placa:* ${vehicle.plate}
*Kilometraje:* ${vehicle.displayCurrentMileage}
*Estado:* ${statusTranslations[vehicle.status] || vehicle.status}
*Ganancia/Pérdida neta:* ${formatCurrency(netProfit)}
        `.trim();

    const shareData = {
      title: `Detalles del vehículo: ${vehicle.make} ${vehicle.model}`,
      text: vehicleInfo,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('Error al compartir:', error);
        toast({
          title: 'Error',
          description: 'No se pudo compartir la información.',
          variant: 'destructive',
        });
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`);
      toast({
        title: 'Copiado al portapapeles',
        description: 'La información del vehículo ha sido copiada.',
      });
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[30px] bg-[#080a0f] text-center text-white">
        <p className="font-heading text-lg font-semibold">No se encontró el vehículo</p>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/vehicles')}
          className="rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          Volver a vehículos
        </Button>
      </div>
    );
  }

  const imageUrl =
    typeof vehicle.imageUrl === 'string' ? vehicle.imageUrl : null;

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/vehicles')}
            className="h-9 w-fit rounded-xl px-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Volver a vehículos
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/vehicles?action=edit&vehicleId=${vehicle.id}`)}
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Edit className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Printer className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Imprimir
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Share2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Compartir
            </Button>
          </div>
        </div>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Flota
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              {vehicle.make} {vehicle.model}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-xs font-semibold text-white/80">
                {vehicle.plate}
              </span>
              <span className="text-sm text-white/40">{vehicle.year}</span>
              <VehicleStatusBadge status={vehicle.status} />
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <Car className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </header>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}/documents`)}
            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <FileText className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            Documentos
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}/transactions`)}
            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <DollarSign className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            Transacciones
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/vehicles/assignments?vehicleId=${vehicle.id}`)}
            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white "
          >
            <History className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            Asignaciones
          </Button>
        </div>

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.18)]">
          <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-2">
            <div className="relative h-56 overflow-hidden rounded-[16px] border border-white/[0.06] bg-white/[0.03] sm:h-64">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white/20">
                  <Car className="h-16 w-16" strokeWidth={1.25} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoItem
                icon={<Palette className="h-4 w-4" strokeWidth={1.75} />}
                label="Color"
                value={vehicle.color || 'N/A'}
              />
              <InfoItem
                icon={<Calendar className="h-4 w-4" strokeWidth={1.75} />}
                label="Adquisición"
                value={formatDate(vehicle.acquisitionDate)}
              />
              <InfoItem
                icon={<DollarSign className="h-4 w-4" strokeWidth={1.75} />}
                label="Costo"
                value={formatCurrency(vehicle.cost || 0)}
                valueClassName="text-emerald-300"
              />
              <InfoItem
                icon={<DollarSign className="h-4 w-4" strokeWidth={1.75} />}
                label="Renta semanal"
                value={formatCurrency(vehicle.weeklyRentalValue || 0)}
              />
              <InfoItem
                icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
                label="Comisión admin"
                value={(vehicle.adminCommission || 0).toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                })}
              />
              <InfoItem
                icon={<Gauge className="h-4 w-4" strokeWidth={1.75} />}
                label="Kilometraje"
                value={vehicle.displayCurrentMileage}
              />
              <InfoItem
                icon={<Wrench className="h-4 w-4" strokeWidth={1.75} />}
                label="Último mtto. (km)"
                value={vehicle.displayLastMaintMileage}
              />
              <InfoItem
                icon={<User className="h-4 w-4" strokeWidth={1.75} />}
                label="Conductor"
                value={assignedDriver.name}
              />
              <InfoItem
                icon={<Briefcase className="h-4 w-4" strokeWidth={1.75} />}
                label="Socio propietario"
                value={ownerPartner}
              />
            </div>
          </div>

          <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
            <h3 className="mb-3 font-heading text-sm font-semibold text-white">Seguro</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoItem
                icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
                label="No. de póliza"
                value={vehicle.insurancePolicyNumber || 'N/A'}
              />
              <InfoItem
                icon={<Calendar className="h-4 w-4" strokeWidth={1.75} />}
                label="Vencimiento"
                value={formatDate(vehicle.insuranceExpiryDate)}
              />
            </div>
          </div>

          <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
            <h3 className="mb-3 font-heading text-sm font-semibold text-white">Análisis financiero</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoItem
                icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
                label="Ganancia / pérdida neta"
                value={formatCurrency(netProfit)}
                valueClassName={netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}
              />
              <InfoItem
                icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
                label="ROI"
                value={roi !== null ? `${roi}%` : 'N/A'}
                valueClassName={
                  roi !== null && parseFloat(roi) >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }
              />
            </div>
            <p className="mt-2 text-[11px] text-white/35">(Ingresos − Gastos) / Costo</p>
          </div>
        </section>

        <VehicleTimeline events={timelineEvents} />
      </div>
    </div>
  );
}
