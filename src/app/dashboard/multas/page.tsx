"use client";

import React, { useState, useMemo } from "react";
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
import { MetricCard } from "@/components/dashboard/components/MetricCard";

export default function MultasPage() {
  const { multas, loading: loadingFinances } = useFinances();
  const { vehicles, vehiclesLoading } = useVehicles();
  const { clients, loading: loadingClients } = useClients();
  const loadingData = loadingFinances || vehiclesLoading || loadingClients;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMulta, setSelectedMulta] = useState<Multa | null>(null);

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
          clientName: client ? `${client.firstname} ${client.lastname}` : "Sin asignar",
          clientPhone: client?.phone,
          daysOverdue,
        };
      })
      .sort((a, b) => new Date(b.fechaInfraccion).getTime() - new Date(a.fechaInfraccion).getTime());
  }, [multas, vehicles, clients]);

  const stats = useMemo(() => {
    const pendientes = multasWithDetails.filter(m => m.status === "pendiente");
    const pagadas = multasWithDetails.filter(m => m.status === "pagada");
    const enProceso = multasWithDetails.filter(m => m.status === "en_proceso");
    return {
      total: multasWithDetails.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      enProceso: enProceso.length,
      totalPendiente: pendientes.reduce((sum, m) => sum + m.total, 0),
      totalPagado: pagadas.reduce((sum, m) => sum + m.total, 0),
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
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Operación
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Multas
            </h1>
            <p className="mt-1 text-sm text-white/40">Infracciones de tránsito de la flota</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <Button
              onClick={() => {
                setSelectedMulta(null);
                setIsFormOpen(true);
              }}
              className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
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

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Lista de multas</h2>
            <p className="mt-0.5 text-xs text-white/40">{multasWithDetails.length} registro{multasWithDetails.length !== 1 ? "s" : ""}</p>
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/10 bg-[#0e1117] text-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">
              {selectedMulta ? "Editar multa" : "Registrar multa"}
            </DialogTitle>
            <DialogDescription className="text-white/40">
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
