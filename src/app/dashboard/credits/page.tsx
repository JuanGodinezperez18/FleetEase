"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useData } from "@/hooks/use-data";
import { getCreditColumns } from "./columns";
import { ResponsiveTable } from "@/components/common/ResponsiveTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, CreditCard } from "lucide-react";
import { FormModal } from "@/components/common/form-modal";
import { CreditForm, CreditFormValues } from "./components/credit-form";
import type { Credit } from "@/types";
import { toast as sonnerToast } from "sonner";
import { CreditCancellationDialog, type CreditCancellationResult } from "@/components/dashboard/credit-cancellation-dialog";
import { useCreditAnalytics } from "@/hooks/use-credits-analytics";
import { useCreditsSearch, type CreditWithMetrics } from "@/hooks/use-credits-search";
import { CreditPortfolioDashboard } from "./components/credit-portfolio-dashboard";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-provider";
import { checkCreditAvailability, buildCreditData, buildVehicleCreditLockPayload } from "@/lib/credit-creation";

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  completed: "border-white/10 bg-white/[0.06] text-white/55",
  defaulted: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  inactive: "border-white/10 bg-white/[0.06] text-white/40",
  cancelled: "border-white/10 bg-white/[0.06] text-white/40",
};

const BEHAVIOR_STYLES: Record<string, string> = {
  Puntual: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  "Ligero Retraso": "border-amber-400/20 bg-amber-400/10 text-amber-300",
  "Retraso Severo": "border-rose-400/20 bg-rose-400/10 text-rose-300",
};

const CreditMobileCard = ({
  credit,
  onEdit,
  onDelete,
  onDeactivate,
  onViewDetails,
}: {
  credit: CreditWithMetrics;
  onEdit: (c: Credit) => void;
  onDelete: (id: string) => void;
  onDeactivate: (id: string) => void;
  onViewDetails: (id: string) => void;
}) => {
  const progress = credit.totalAmount > 0 ? ((credit.paidAmount || 0) / credit.totalAmount) * 100 : 0;
  const statusClass = STATUS_STYLES[credit.status] || STATUS_STYLES.inactive;
  const behaviorClass = credit.paymentBehavior
    ? BEHAVIOR_STYLES[credit.paymentBehavior] || "border-white/10 bg-white/[0.06] text-white/50"
    : "border-white/10 bg-white/[0.06] text-white/50";

  return (
    <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-white/90">{credit.clientName}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
              {credit.status}
            </span>
          </div>
          <p className="mt-1.5 font-heading text-lg font-semibold tabular-nums text-white">
            {formatCurrency(credit.remainingBalance || 0)}
            <span className="ml-1 text-xs font-normal text-white/35">saldo</span>
          </p>
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[11px] text-white/40">
              <span>{formatCurrency(credit.paidAmount || 0)}</span>
              <span>{formatCurrency(credit.totalAmount)}</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-white/[0.08]" />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${behaviorClass}`}>
              {credit.paymentBehavior || "N/A"}
            </span>
            {credit.estimatedCompletionDate && (
              <span className="text-[11px] text-white/35">Fin est. {formatDate(credit.estimatedCompletionDate)}</span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white">
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px] rounded-xl border border-white/10 bg-[#0e1117] p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.55)]">
            <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-white/80 focus:bg-white/[0.08] focus:text-white" onSelect={() => onViewDetails(credit.id)}>
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-white/80 focus:bg-white/[0.08] focus:text-white" onSelect={() => onEdit(credit)}>
              Editar
            </DropdownMenuItem>
            {credit.status === "active" && (
              <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-amber-300 focus:bg-amber-500/15 focus:text-amber-200" onSelect={() => onDeactivate(credit.id)}>
                Cancelar crédito
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default function CreditsPage() {
  const {
    credits,
    clients,
    vehicles,
    financialRecords,
    loadingData,
    updateCredit,
    cancelCreditWithAdjustment,
    updateVehicle,
    refreshData,
    createCreditWithFinancialRecord,
  } = useData();

  const { currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [creditToAction, setCreditToAction] = useState<Credit | null>(null);

  const { creditMetrics, portfolioAnalytics } = useCreditAnalytics(credits, financialRecords);

  const clientNames: Record<string, string> = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`])),
    [clients]
  );

  const creditsWithMetrics: CreditWithMetrics[] = useMemo(() => {
    const metricsMap = new Map(creditMetrics.map(m => [m.creditId, m]));
    return credits
      .filter(c => !c.isDeleted)
      .map(credit => ({
        ...credit,
        ...metricsMap.get(credit.id),
        clientName: clientNames[credit.clientId] || "Cliente Desconocido",
      }));
  }, [credits, creditMetrics, clientNames]);

  const { filters, filteredCredits, updateFilter, resetFilters, debouncedSetQuery, totalResults } =
    useCreditsSearch(creditsWithMetrics);

  const handleCreateNew = useCallback(() => {
    setEditingCredit(null);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      handleCreateNew();
      router.replace("/dashboard/credits", { scroll: false });
    }
  }, [searchParams, router, handleCreateNew]);

  const handleEdit = useCallback((credit: Credit) => {
    setEditingCredit(credit);
    setIsModalOpen(true);
  }, []);

  const handleViewDetails = useCallback(
    (creditId: string) => {
      router.push(`/dashboard/credits/${creditId}`);
    },
    [router]
  );

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setTimeout(() => setEditingCredit(null), 300);
  }, [isSubmitting]);

  const openCancellationDialog = useCallback(
    (creditId: string) => {
      const credit = credits.find(c => c.id === creditId);
      if (credit) {
        setCreditToAction(credit);
        setIsDeactivateDialogOpen(true);
      }
    },
    [credits]
  );

  const handleDelete = openCancellationDialog;
  const handleDeactivate = openCancellationDialog;

  const handleCancelCreditConfirm = async (reason: string): Promise<CreditCancellationResult> => {
    if (!creditToAction) throw new Error("No hay crédito seleccionado.");
    setIsSubmitting(true);
    const toastId = sonnerToast.loading("Cancelando crédito...");
    try {
      await cancelCreditWithAdjustment(creditToAction.id, reason);
      const result: CreditCancellationResult = {
        creditId: creditToAction.id,
        creditReferenceCode: (creditToAction as any).referenceCode ?? null,
        status: "cancelled",
        remainingBalance: Number(creditToAction.remainingBalance || 0),
        vehicleReleased: Boolean(creditToAction.vehicleId),
        clientReleased: Boolean(creditToAction.clientId),
      };
      sonnerToast.success("Crédito cancelado", {
        id: toastId,
        description: `Historial conservado. Ref: ${result.creditReferenceCode || "—"} · Saldo: ${formatCurrency(result.remainingBalance)}`,
      });
      await refreshData();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hubo un error al cancelar el crédito.";
      sonnerToast.error("Error", { id: toastId, description: message });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (data: CreditFormValues) => {
    setIsSubmitting(true);
    const toastId = sonnerToast.loading(editingCredit ? "Actualizando crédito..." : "Creando crédito...");
    try {
      const availability = checkCreditAvailability(credits, {
        vehicleId: data.vehicleId,
        clientId: data.clientId,
        excludeCreditId: editingCredit?.id,
      });
      if (!availability.available) {
        const isVehicleError = availability.error?.includes("vehículo");
        sonnerToast.error(isVehicleError ? "Vehículo no disponible" : "Cliente con crédito activo", {
          id: toastId,
          description: availability.error,
        });
        setIsSubmitting(false);
        return;
      }

      const creditData = buildCreditData(data, currentUser?.companyId, editingCredit?.createdAt);
      const totalAmount = creditData.totalAmount;

      if (editingCredit?.id) {
        await updateCredit(editingCredit.id, creditData);
        sonnerToast.success("Crédito actualizado", { id: toastId });
      } else {
        const creditId = await createCreditWithFinancialRecord(creditData, creditData.companyId);
        if (creditId) {
          await updateVehicle(data.vehicleId, buildVehicleCreditLockPayload(data.clientId, creditId));
        }
        sonnerToast.success("Crédito creado", {
          id: toastId,
          description: `Se sumó ${formatCurrency(totalAmount)} al balance del cliente.`,
        });
      }
      handleCloseModal();
      await refreshData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Hubo un error al guardar el crédito.";
      sonnerToast.error("Error", { id: toastId, description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () =>
      getCreditColumns({
        clients,
        vehicles,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onDeactivate: handleDeactivate,
        onViewDetails: handleViewDetails,
      }),
    [clients, vehicles, handleEdit, handleDelete, handleDeactivate, handleViewDetails]
  );

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="fe-module-header">
          <div>
            <div className="fe-module-eyebrow">
              Finanzas
            </div>
            <h1 className="fe-module-title">Créditos</h1>
            <p className="fe-module-subtitle">Portafolio, morosidad y gestión de créditos</p>
          </div>
          <div className="fe-module-actions gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <CreditCard className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <Button
              data-add-button="true"
              onClick={handleCreateNew}
              className="h-11 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
            >
              <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Agregar crédito
            </Button>
          </div>
        </header>

        <CreditPortfolioDashboard creditMetrics={creditMetrics} portfolioAnalytics={portfolioAnalytics} />

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Gestión de créditos</h2>
            <p className="mt-0.5 text-xs text-white/40">
              {totalResults} resultado{totalResults !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <ResponsiveTable
              columns={columns}
              data={filteredCredits}
              searchPlaceholder="Buscar por cliente, vehículo, estado..."
              noResultsText="No se encontraron créditos."
              loading={loadingData}
              mobileCardRenderer={credit => (
                <CreditMobileCard
                  credit={credit}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDeactivate={handleDeactivate}
                  onViewDetails={handleViewDetails}
                />
              )}
            />
          </div>
        </section>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCredit ? "Editar crédito" : "Agregar crédito"}
        description={
          editingCredit ? "Actualiza los detalles del crédito." : "Configura un nuevo crédito paso a paso."
        }
      >
        <CreditForm
          key={editingCredit?.id || "new-credit"}
          onSubmit={handleSubmit}
          initialData={editingCredit || undefined}
          isSubmitting={isSubmitting}
          onClose={handleCloseModal}
        />
      </FormModal>

      {creditToAction && (
        <CreditCancellationDialog
          open={isDeactivateDialogOpen}
          onOpenChange={open => {
            if (!open) {
              setIsDeactivateDialogOpen(false);
              setTimeout(() => setCreditToAction(null), 300);
            } else {
              setIsDeactivateDialogOpen(true);
            }
          }}
          clientName={(() => {
            const client = clients.find(c => c.id === creditToAction.clientId);
            return client ? `${client.firstname} ${client.lastname}` : "Cliente desconocido";
          })()}
          creditReferenceCode={(creditToAction as any).referenceCode ?? null}
          vehicleLabel={(() => {
            const vehicle = vehicles.find(v => v.id === creditToAction.vehicleId);
            return vehicle?.plate || null;
          })()}
          outstandingBalance={Number(creditToAction.remainingBalance || 0)}
          creditStatus={creditToAction.status}
          onConfirm={handleCancelCreditConfirm}
        />
      )}
    </div>
  );
}
