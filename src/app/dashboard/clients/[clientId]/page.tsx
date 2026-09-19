"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Car,
  DollarSign,
  FileText,
  History,
  Newspaper,
  Loader2,
  User,
} from 'lucide-react';
import { EntityTimeline, type TimelineEvent } from '@/components/common/entity-timeline';
import { formatCurrency } from '@/lib/utils';
import {
  PaymentRiskBadge,
  LicenseStatusBadge,
} from '@/components/clients/client-status-badges';

const InfoCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | React.ReactNode;
  icon: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white/90">{value}</p>
    </div>
  </div>
);

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  const {
    clients,
    financialRecords,
    credits,
    vehicles,
    loadingData,
    clientBalances,
    financialCategories,
  } = useData();

  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);
  const clientBalance = useMemo(
    () => clientBalances.find(cb => cb.id === clientId)?.balance || 0,
    [clientBalances, clientId]
  );
  const assignedVehicle = useMemo(
    () => vehicles.find(v => v.clientId === clientId && v.status === 'rented'),
    [vehicles, clientId]
  );

  const clientTimeline = useMemo((): TimelineEvent[] => {
    if (!client) return [];

    const categoryMap = new Map(financialCategories.map(cat => [cat.id, cat.name]));
    const events: TimelineEvent[] = [];

    if (client.createdAt) {
      events.push({
        id: 'created',
        date: client.createdAt,
        type: 'created',
        title: 'Cliente registrado',
        description: `${client.firstname} ${client.lastname} fue agregado al sistema`,
      });
    }

    const payments = financialRecords
      .filter(fr => fr.clientId === client.id && !fr.isDeleted)
      .map((record): TimelineEvent => ({
        id: record.id,
        date: record.date,
        type: record.type,
        title:
          record.type === 'income'
            ? 'Cargo registrado'
            : record.type === 'payment'
              ? 'Pago recibido'
              : 'Gasto registrado',
        description: record.description || 'Movimiento financiero',
        amount: record.amount,
        metadata: {
          categoría: categoryMap.get(record.categoryId) || 'General',
        },
      }));

    events.push(...payments);

    credits
      .filter(c => c.clientId === client.id && !c.isDeleted)
      .forEach(credit => {
        events.push({
          id: `credit-${credit.id}`,
          date: credit.createdAt || credit.startDate,
          type: 'credit_approved',
          title: 'Crédito aprobado',
          description: `Crédito por ${formatCurrency(credit.totalAmount)} aprobado`,
          amount: credit.totalAmount,
          metadata: {
            plazo: `${credit.numberOfPayments} semanas`,
            pago_semanal: formatCurrency(credit.weeklyPayment),
          },
        });

        if (credit.status === 'completed') {
          events.push({
            id: `credit-paid-${credit.id}`,
            date: credit.updatedAt || credit.createdAt || new Date(),
            type: 'credit_paid',
            title: 'Crédito liquidado',
            description: 'El crédito ha sido pagado completamente',
            amount: credit.totalAmount,
          });
        }
      });

    vehicles
      .filter(v => v.clientId === client.id && !v.isDeleted)
      .forEach(vehicle => {
        events.push({
          id: `vehicle-${vehicle.id}`,
          date: vehicle.acquisitionDate,
          type: 'vehicle_assigned',
          title: 'Vehículo asignado',
          description: `${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
        });
      });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [client, financialRecords, credits, vehicles, financialCategories]);

  const photoUrl = useMemo(() => {
    if (!client?.photoUrl) return null;
    if (typeof client.photoUrl === 'string') return client.photoUrl;
    if (typeof window !== 'undefined' && client.photoUrl instanceof File) {
      return URL.createObjectURL(client.photoUrl);
    }
    return null;
  }, [client?.photoUrl]);

  if (loadingData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[30px] bg-[#080a0f] text-center text-white">
        <p className="font-heading text-lg font-semibold">Cliente no encontrado</p>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/clients')}
          className="rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver a clientes
        </Button>
      </div>
    );
  }

  const name = `${client.firstname} ${client.lastname}`;
  const balanceColor = clientBalance > 0 ? 'text-rose-300' : 'text-emerald-300';

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/clients')}
            className="h-9 w-fit rounded-xl px-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Volver a clientes
          </Button>
        </div>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={name}
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[#d7ff3f]/20 sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f] sm:h-20 sm:w-20">
                <User className="h-8 w-8" strokeWidth={1.75} />
              </div>
            )}
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
                Clientes
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                {name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <PaymentRiskBadge level={(client as any).paymentBehavior} />
                <LicenseStatusBadge status={(client as any).licenseStatus} />
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  {client.status}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/clients/${clientId}/documents`)}
            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <FileText className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            Documentos
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/clients/${clientId}/transactions`)}
            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <Newspaper className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            Transacciones
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/clients/${clientId}/history`)}
            className="h-11 justify-start rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white col-span-2 sm:col-span-1"
          >
            <History className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            Historial
          </Button>
        </div>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-[#d7ff3f]" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
                Información
              </p>
              <h2 className="text-base font-semibold text-white">Contacto y estado</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard label="Email" value={client.email || 'N/A'} icon={<Mail className="h-4 w-4" strokeWidth={1.75} />} />
            <InfoCard label="Teléfono" value={client.phone || 'N/A'} icon={<Phone className="h-4 w-4" strokeWidth={1.75} />} />
            <InfoCard
              label="Vencimiento de licencia"
              value={client.licenseExpiry || 'N/A'}
              icon={<Calendar className="h-4 w-4" strokeWidth={1.75} />}
            />
            <InfoCard
              label="Vehículo asignado"
              value={
                assignedVehicle
                  ? `${assignedVehicle.make} ${assignedVehicle.model} (${assignedVehicle.plate})`
                  : 'Ninguno'
              }
              icon={<Car className="h-4 w-4" strokeWidth={1.75} />}
            />
            <InfoCard
              label="Saldo actual"
              value={<span className={balanceColor}>{formatCurrency(clientBalance)}</span>}
              icon={<DollarSign className="h-4 w-4" strokeWidth={1.75} />}
            />
            <InfoCard
              label="Depósito en garantía"
              value={formatCurrency(client.securityDeposit || 0)}
              icon={<DollarSign className="h-4 w-4" strokeWidth={1.75} />}
            />
          </div>
        </section>

        <EntityTimeline events={clientTimeline} entityType="client" />
      </div>
    </div>
  );
}
