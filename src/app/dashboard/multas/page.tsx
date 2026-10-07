"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useFinances } from "@/contexts/providers/finances-provider";
import { useVehicles } from "@/contexts/providers/vehicles-provider";
import { useClients } from "@/contexts/providers/clients-provider";
import { Button } from "@/components/ui/button";
import { Plus, ShieldAlert, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultaForm } from "./components/multa-form";
import { MultasTable } from "./components/multas-table";
import type { Multa, MultaWithDetails } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useDashboardDate } from "@/contexts/dashboard-date-context";
import { ModuleDateFilterBar } from "@/components/common/module-date-filter-bar";
import { isDateInRange } from "@/lib/is-date-in-range";
import { MetricCard } from "@/components/dashboard/components/MetricCard";
import { supabase } from "@/lib/supabase";

export default function MultasPage() {
  const { multas, financialRecords, loading: loadingFinances } = useFinances();
  const { dateRange } = useDashboardDate();
  const { vehicles, vehiclesLoading } = useVehicles();
  const { clients, loading: loadingClients } = useClients();
  const loadingData = loadingFinances || vehiclesLoading || loadingClients;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMulta, setSelectedMulta] = useState<Multa | null>(null);
  const [multaPaidAmounts, setMultaPaidAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const loadMultaPayments = async () => {
      const multaCharges = financialRecords.filter(
        record =>
          !record.isDeleted &&
          record.type === "income" &&
          record.category === "Multa" &&
          record.sourceRecordType === "multa" &&
          !!record.sourceRecordId
      );

      if (multaCharges.length === 0) {
        if (!cancelled) setMultaPaidAmounts({});
        return;
      }

      const chargeIds = multaCharges.map(record => record.id);
      const { data, error } = await supabase
        .from("financial_record_links")
        .select("target_financial_record_id, source_financial_record_id, amount_applied")
        .in("target_financial_record_id", chargeIds)
        .eq("relationship_type", "multa_payment_to_financial_record");

      if (error) {
        console.error("[Multas] No se pudieron cargar los pagos aplicados:", error);
        if (!cancelled) setMultaPaidAmounts({});
        return;
      }

      const activePaymentIds = new Set(
        financialRecords.filter(record => !record.isDeleted && record.type === "payment").map(record => record.id)
      );
      const chargeToMultaId = new Map(
        multaCharges.map(record => [record.id, record.sourceRecordId as string])
      );
      const paidByMulta: Record<string, number> = {};

      for (const link of data || []) {
        if (!activePaymentIds.has(link.source_financial_record_id)) continue;
        const multaId = chargeToMultaId.get(link.target_financial_record_id);
        if (!multaId) continue;
        paidByMulta[multaId] = (paidByMulta[multaId] || 0) + Number(link.amount_applied || 0);
      }

      if (!cancelled) setMultaPaidAmounts(paidByMulta);
    };

    void loadMultaPayments();
    return () => {
      cancelled = true;
    };
  }, [financialRecords]);

  const multasWithDetails: MultaWithDetails[] = useMemo(() => {
    return multas
      .filter(m => !m.isDeleted && isDateInRange(m.fechaInfraccion, dateRange))
      .map(multa => {
        const vehicle = vehicles.find(v => v.id === multa.vehicleId);
        const client = clients.find(c => c.id === multa.clientId);
        const daysOverdue = differenceInCalendarDays(new Date(), parseISO(multa.fechaInfraccion));
        return {
          ...multa,
          vehiclePlate: vehicle?.plate,
          vehicleAlias: vehicle?.alias,
          clientName: client ? `${client.firstname} ${client.lastname}` : "Sin asignar",
          clientPhone: client?.phone,
          daysOverdue,
        };
      })
      .sort((a, b) => new Date(b.fechaInfraccion).getTime() - new Date(a.fechaInfraccion).getTime());
  }, [multas, vehicles, clients, multaPaidAmounts, dateRange]);

  const stats = useMemo(() => {
    const pendientes = multasWithDetails.filter(m => m.status === "pendiente");
    const pagadas = multasWithDetails.filter(m => m.status === "pagada");
    const enProceso = multasWithDetails.filter(m => m.status === "en_proceso");
    return {
      total: multasWithDetails.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      enProceso: enProceso.length,
      totalPendiente: pendientes.reduce((sum, m) => sum + Math.max(0, (m as MultaWithDetails & { outstandingAmount?: number }).outstandingAmount ?? m.total), 0),
      totalPagado: multasWithDetails.reduce((sum, m) => sum + Math.min(m.total, (m as MultaWithDetails & { outstandingAmount?: number }).total - ((m as MultaWithDetails & { outstandingAmount?: number }).outstandingAmount ?? m.total)), 0),
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
      <div className="fe-page-shell min-h-[40vh] items-center justify-center fe-text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--fe-lime)]" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="fe-page-shell space-y-5 sm:space-y-6">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="fe-module-header">
          <div>
            <div className="fe-module-eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" />
              Operación
            </div>
            <h1 className="fe-module-title">
              Multas
            </h1>
            <p className="fe-module-subtitle">Infracciones de tránsito de la flota</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--fe-lime)]/15 bg-[color:var(--fe-lime)]/[0.08] text-[var(--fe-lime)]">
              <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <ModuleDateFilterBar />
              <Button
              onClick={() => {
                setSelectedMulta(null);
                setIsFormOpen(true);
              }}
              className="h-11 rounded-xl px-4 text-xs font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Registrar multa
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total"
            value={String(stats.total)}
            description="Registradas"
            icon={<ShieldAlert className="h-5 w-5" strokeWidth={1.75} />}
          />
          <MetricCard
            title="Pendientes"
            value={String(stats.pendientes)}
            description={formatCurrency(stats.totalPendiente)}
            icon={<Clock className="h-5 w-5" strokeWidth={1.75} />}
            variant="warning"
          />
          <MetricCard
            title="Pagadas"
            value={String(stats.pagadas)}
            description={formatCurrency(stats.totalPagado)}
            icon={<CheckCircle className="h-5 w-5" strokeWidth={1.75} />}
            variant="success"
          />
          <MetricCard
            title="En proceso"
            value={String(stats.enProceso)}
            description="En gestión"
            icon={<Loader2 className="h-5 w-5" strokeWidth={1.75} />}
          />
        </div>

        <section className="overflow-hidden fe-panel-bg rounded-[14px] shadow-[0_18px_50px_rgba(0,0,0,.16)]">
          <div className="border-b border-[color:var(--fe-border)] px-5 py-4">
            <h2 className="font-heading text-base font-semibold fe-text">Lista de multas</h2>
            <p className="mt-0.5 text-xs fe-text-muted">{multasWithDetails.length} registro{multasWithDetails.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="p-4 sm:p-5">
            <MultasTable multas={multasWithDetails} onEdit={handleEdit} />
          </div>
        </section>
      </div>

      <Dialog
        open={isFormOpen}
        onOpenChange={open => {
          if (!open) handleCloseForm();
          else setIsFormOpen(true);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-[color:var(--fe-border)] bg-[var(--fe-panel)] fe-text">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">
              {selectedMulta ? "Editar multa" : "Registrar multa"}
            </DialogTitle>
            <DialogDescription className="fe-text-muted">
              {selectedMulta
                ? "Actualiza la información de la infracción"
                : "Registra una multa y asígnala al cliente responsable"}
            </DialogDescription>
          </DialogHeader>
          <MultaForm multa={selectedMulta} onClose={handleCloseForm} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
