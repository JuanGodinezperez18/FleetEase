"use client";

import { useParams, useRouter } from "next/navigation";
import { useData } from "@/hooks/use-data";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/common/data-table";
import type { CreditPaymentSchedule } from "@/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Check, Ban, Clock } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  completed: "border-white/10 bg-white/[0.06] text-white/55",
  defaulted: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  inactive: "border-white/10 bg-white/[0.06] text-white/40",
  cancelled: "border-white/10 bg-white/[0.06] text-white/40",
};

export default function CreditDetailPage() {
  const params = useParams();
  const creditId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { credits, clients, vehicles, financialRecords, creditPaymentSchedules, financialCategories, selectedCompanyId } =
    useData();


  const credit = useMemo(() => credits.find(c => c.id === creditId), [credits, creditId]);
  const client = useMemo(() => clients.find(c => c.id === credit?.clientId), [clients, credit]);
  const vehicle = useMemo(() => vehicles.find(v => v.id === credit?.vehicleId), [vehicles, credit]);

  const payments = useMemo(
    () =>
      financialRecords
        .filter(fr => fr.creditId === creditId && fr.type === "payment" && !fr.isDeleted)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [financialRecords, creditId]
  );
  const schedule = useMemo(
    () => creditPaymentSchedules.filter(s => s.creditId === creditId).sort((a, b) => a.paymentNumber - b.paymentNumber),
    [creditPaymentSchedules, creditId]
  );

  const getCategoryName = (categoryId: string) => financialCategories.find(c => c.id === categoryId)?.name || "Sin categoría";

  const scheduleColumns: ColumnDef<CreditPaymentSchedule>[] = [
    { accessorKey: "paymentNumber", header: "Pago #" },
    {
      accessorKey: "dueDate",
      header: "Vencimiento",
      cell: ({ row }) => format(new Date(row.original.dueDate), "PPP", { locale: es }),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const s = row.original;
        const paidAmount = Number(s.paidAmount || 0);
        const amount = Number(s.amount || 0);
        const isPartial = paidAmount > 0 && paidAmount < amount && s.status !== "cancelled";
        if (s.status === "paid")
          return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <Check className="h-3 w-3" strokeWidth={1.75} /> Pagado
            </span>
          );
        if (s.status === "cancelled")
          return (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
              <Ban className="h-3 w-3" strokeWidth={1.75} /> Cancelado
            </span>
          );
        if (isPartial)
          return (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              <Clock className="h-3 w-3" strokeWidth={1.75} /> Parcial
            </span>
          );
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
            <Clock className="h-3 w-3" strokeWidth={1.75} /> Pendiente
          </span>
        );
      },
    },
    { accessorKey: "amount", header: "Cuota", cell: ({ row }) => formatCurrency(row.original.amount) },
    {
      id: "paidAmount",
      header: "Abonado",
      cell: ({ row }) => {
        const paidAmount = Number(row.original.paidAmount || 0);
        return (
          <span className={paidAmount > 0 ? "font-semibold tabular-nums text-emerald-300" : "text-white/35"}>
            {formatCurrency(paidAmount)}
          </span>
        );
      },
    },
    {
      id: "remainingAmount",
      header: "Pendiente",
      cell: ({ row }) => {
        const remaining = Math.max(Number(row.original.amount || 0) - Number(row.original.paidAmount || 0), 0);
        return (
          <span className={remaining > 0 ? "font-semibold tabular-nums text-white" : "text-white/35"}>
            {formatCurrency(remaining)}
          </span>
        );
      },
    },
    {
      accessorKey: "paidDate",
      header: "Fecha pago",
      cell: ({ row }) => (row.original.paidDate ? format(new Date(row.original.paidDate), "PPP", { locale: es }) : "—"),
    },
  ];

  if (!credit) {
    return (
      <div className="rounded-[18px] bg-[#080a0f] p-8 text-center text-white/50">Crédito no encontrado</div>
    );
  }

  const progress = credit.totalAmount > 0 ? ((credit.paidAmount || 0) / credit.totalAmount) * 100 : 0;
  const statusClass = STATUS_STYLES[credit.status] || STATUS_STYLES.inactive;

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/credits")}
            className="h-11 w-fit rounded-xl px-3 text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Volver a créditos
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
                Créditos
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                Detalle del crédito
              </h1>
              <p className="mt-1 text-sm text-white/40">
                {client?.firstname} {client?.lastname}
                {vehicle ? ` · ${vehicle.make} ${vehicle.model} (${vehicle.plate})` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
                {credit.status}
              </span>
              {credit.status === "active" && (credit.remainingBalance || 0) > 0 && (
                <Button
                  onClick={() => router.push("/dashboard/finanzas/payments")}
                  className="h-11 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
                >
                  Registrar pago en Pagos
                </Button>
              )}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[11px] text-white/40">Monto total</p>
              <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-white">{formatCurrency(credit.totalAmount)}</p>
            </div>
            <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[11px] text-white/40">Pagado</p>
              <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-emerald-300">{formatCurrency(credit.paidAmount || 0)}</p>
            </div>
            <div className="rounded-[12px] border border-rose-400/15 bg-rose-400/[0.05] p-3">
              <p className="text-[11px] text-rose-300/70">Saldo pendiente</p>
              <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-rose-300">{formatCurrency(credit.remainingBalance || 0)}</p>
            </div>
            <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[11px] text-white/40">Inicio</p>
              <p className="mt-0.5 text-sm font-medium text-white/90">{format(new Date(credit.startDate), "PPP", { locale: es })}</p>
            </div>
            <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-3 sm:col-span-2">
              <p className="mb-1.5 text-[11px] text-white/40">Progreso</p>
              <Progress value={progress} className="h-1.5 bg-white/[0.08]" />
              <p className="mt-1 text-right text-[11px] text-white/35">
                {credit.paymentsMade} de {credit.numberOfPayments} pagos ({progress.toFixed(1)}%)
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-white">
              <Calendar className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
              Calendario de pagos
            </h2>
            <p className="mt-0.5 text-xs text-white/40">Abonos se aplican en orden a cuotas pendientes</p>
          </div>
          <div className="p-3 sm:p-5">
            <DataTable columns={scheduleColumns} data={schedule} noResultsText="No hay calendario de pagos." />
          </div>
        </section>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Historial de pagos ({payments.length})</h2>
          </div>
          <div className="space-y-2 p-4 sm:p-5">
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/35">No hay pagos registrados.</p>
            ) : (
              payments.map(payment => {
                const categoryName = getCategoryName(payment.categoryId);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-3"
                  >
                    <div>
                      <p className="font-semibold tabular-nums text-emerald-300">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-white/40">{format(new Date(payment.date), "PPP", { locale: es })}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
                      {categoryName}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
