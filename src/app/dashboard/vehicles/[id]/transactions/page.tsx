"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, Loader2 } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { transactionsColumns } from './columns';

export default function VehicleTransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const { vehicles, financialRecords, financialCategories, loadingData } = useData();

  const vehicle = useMemo(() => vehicles.find(v => v.id === vehicleId), [vehicles, vehicleId]);

  const vehicleTransactions = useMemo(() => {
    if (!vehicleId || !financialRecords) return [];

    const categoryMap = new Map(financialCategories.map(cat => [cat.id, cat.name]));

    return financialRecords
      .filter(fr => fr && fr.vehicleId === vehicleId)
      .map(record => ({
        ...record,
        categoryName: categoryMap.get(record.categoryId || '') || record.category || 'General',
      }))
      .sort((a, b) => {
        const dateA = infallibleNormalizeDate(a.date);
        const dateB = infallibleNormalizeDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
  }, [vehicleId, financialRecords, financialCategories]);

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
        <p className="font-heading text-lg font-semibold">Vehículo no encontrado</p>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/vehicles')}
          className="rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver a vehículos
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/vehicles/${vehicleId}`)}
          className="h-11 w-fit rounded-xl px-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver a detalles
        </Button>

        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Flota · Transacciones
          </div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            <DollarSign className="h-6 w-6 text-[#d7ff3f]" strokeWidth={1.75} />
            Historial de transacciones
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {vehicle.make} {vehicle.model} · {vehicle.plate}
          </p>
        </header>

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-3 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-5">
          <DataTable
            columns={transactionsColumns}
            data={vehicleTransactions}
            searchPlaceholder="Buscar por descripción..."
            noResultsText="No hay transacciones registradas para este vehículo."
          />
        </section>
      </div>
    </div>
  );
}
