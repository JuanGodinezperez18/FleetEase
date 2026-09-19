"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useData } from "@/hooks/use-data";
import type { Vehicle, MileageLog } from "@/types";
import { ResponsiveTable } from "@/components/common/ResponsiveTable";
import { FormModal } from "@/components/common/form-modal";
import MileageLogForm, { type MileageLogFormValues } from "./components/mileage-log-form";
import { getMileageColumns } from "./columns";
import { useMileageAnalytics } from "@/hooks/use-mileage-analytics";
import { useMileageSearch, type VehicleWithMileageAndMetrics } from "@/hooks/use-mileage-search";
import { MaintenanceDashboard } from "./components/maintenance-dashboard";
import { MileageAdvancedFilters } from "./components/mileage-advanced-filters";
import { toast } from "sonner";
import { MileageHistoryModal } from "./components/mileage-history-modal";
import { MileageMobileCard } from "./components/mileage-mobile-card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Gauge } from "lucide-react";
import { DEFAULT_MAINTENANCE_INTERVAL_KM } from "@/lib/financial-metrics";

export default function MileageTrackingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    vehicles,
    companies,
    selectedCompanyId,
    loadingData,
    getVehicleById,
    mileageLogs,
    financialRecords,
    addMileageLog,
    updateMileageLog,
    refreshData,
  } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedVehicleForLog, setSelectedVehicleForLog] = useState<Vehicle | null>(null);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = useCallback(
    (vehicleId?: string) => {
      const vehicle = vehicleId ? getVehicleById(vehicleId) : null;
      setSelectedVehicleForLog(vehicle || null);
      setIsModalOpen(true);
    },
    [getVehicleById]
  );

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setTimeout(() => setSelectedVehicleForLog(null), 300);
  }, [isSubmitting]);

  const handleMileageSubmit = useCallback(
    async (data: MileageLogFormValues) => {
      setIsSubmitting(true);
      const toastId = toast.loading("Guardando registro...");

      const handleUpdateExisting = async (existingLogId: string, newData: MileageLogFormValues) => {
        toast.loading("Actualizando registro existente...", { id: toastId });
        try {
          await updateMileageLog(existingLogId, { mileage: newData.mileage });
          toast.success("Registro actualizado", {
            id: toastId,
            description: `Kilometraje actualizado a ${newData.mileage.toLocaleString()} km.`,
          });
          handleCloseModal();
          await refreshData();
        } catch (error) {
          toast.error("Error al actualizar", {
            id: toastId,
            description: error instanceof Error ? error.message : "No se pudo actualizar el registro.",
          });
        }
      };

      try {
        await addMileageLog(data as Omit<MileageLog, "id" | "uid" | "createdAt">);
        toast.success("Registro guardado", {
          id: toastId,
          description: "Kilometraje actualizado para el vehículo.",
        });
        handleCloseModal();
        await refreshData();
      } catch (error) {
        if (error instanceof Error && error.message.includes("Ya existe un registro")) {
          const existingLog = mileageLogs.find(log => log.vehicleId === data.vehicleId && log.date === data.date);
          if (existingLog) {
            toast.warning("Ya existe un registro para esta fecha", {
              id: toastId,
              description: "¿Deseas actualizar el registro existente?",
              action: {
                label: "Actualizar",
                onClick: () => handleUpdateExisting(existingLog.id, data),
              },
              cancel: {
                label: "Cancelar",
                onClick: () => toast.dismiss(toastId),
              },
            });
          } else {
            toast.error("Error de duplicado", { id: toastId, description: error.message });
          }
        } else {
          toast.error("Error al guardar", {
            id: toastId,
            description:
              error instanceof Error ? error.message : "No se pudo guardar el registro de kilometraje.",
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [addMileageLog, handleCloseModal, mileageLogs, refreshData, updateMileageLog]
  );

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      handleOpenModal();
      router.replace("/dashboard/mileage", { scroll: false });
    }
  }, [searchParams, router, handleOpenModal]);

  const handleOpenHistory = useCallback((vehicleId: string) => {
    setSelectedVehicleForHistory(vehicleId);
    setIsHistoryModalOpen(true);
  }, []);

  const activeVehicles = useMemo(() => {
    const companyIntervals = new Map(companies.map(company => [company.id, company.maintenanceInterval]));

    return vehicles
      .filter(v => v.status !== "sold")
      .map(vehicle => {
        const companyInterval = vehicle.companyId ? companyIntervals.get(vehicle.companyId) : undefined;
        const effectiveInterval =
          companyInterval && companyInterval > 0 ? companyInterval : vehicle.maintenanceInterval;

        return effectiveInterval && effectiveInterval > 0
          ? { ...vehicle, maintenanceInterval: effectiveInterval }
          : vehicle;
      });
  }, [vehicles, companies]);

  const selectedCompany = useMemo(
    () => companies.find(company => company.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const maintenanceInterval =
    selectedCompany?.maintenanceInterval && selectedCompany.maintenanceInterval > 0
      ? selectedCompany.maintenanceInterval
      : DEFAULT_MAINTENANCE_INTERVAL_KM;

  const { vehicleMetrics } = useMileageAnalytics(activeVehicles, mileageLogs, financialRecords, companies);

  const vehiclesWithAllMetrics: VehicleWithMileageAndMetrics[] = useMemo(() => {
    const metricsMap = new Map(vehicleMetrics.map(m => [m.vehicleId, m]));
    return activeVehicles.map(v => ({
      ...v,
      ...metricsMap.get(v.id),
    })) as VehicleWithMileageAndMetrics[];
  }, [activeVehicles, vehicleMetrics]);

  const { filters, filteredVehicles, updateFilter, resetFilters, debouncedSetQuery, totalResults } =
    useMileageSearch(vehiclesWithAllMetrics);

  const handleCloseHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(false);
    setSelectedVehicleForHistory(null);
  }, []);

  const columns = useMemo(
    () => getMileageColumns(handleOpenModal, handleOpenHistory, vehicleMetrics),
    [vehicleMetrics, handleOpenModal, handleOpenHistory]
  );

  if (loadingData && !vehicles.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <p className="text-sm">Cargando datos...</p>
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
              Kilometraje
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Mantenimiento cada {maintenanceInterval.toLocaleString()} km
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <Gauge className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <Button
              data-add-button="true"
              onClick={() => handleOpenModal()}
              disabled={isSubmitting}
              className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
            >
              <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Registrar kilometraje
            </Button>
          </div>
        </header>

        <MaintenanceDashboard vehicles={vehiclesWithAllMetrics} vehicleMetrics={vehicleMetrics} />

        <MileageAdvancedFilters
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          onSearch={debouncedSetQuery}
          totalResults={totalResults}
          companies={companies}
          isLoading={loadingData}
        />

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Control de kilometraje</h2>
            <p className="mt-0.5 text-xs text-white/40">
              {totalResults} vehículo{totalResults !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <ResponsiveTable
              data={[...filteredVehicles].sort(
                (a, b) => (a.kmToNextMaintenance ?? Infinity) - (b.kmToNextMaintenance ?? Infinity)
              )}
              columns={columns}
              loading={loadingData}
              searchPlaceholder="Buscar por placa..."
              noResultsText="No se encontraron vehículos."
              mobileCardRenderer={vehicle => (
                <MileageMobileCard
                  vehicle={vehicle}
                  onOpenModal={handleOpenModal}
                  onOpenHistory={handleOpenHistory}
                />
              )}
            />
          </div>
        </section>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          selectedVehicleForLog
            ? `Registrar · ${selectedVehicleForLog.plate}`
            : "Registrar kilometraje"
        }
      >
        <MileageLogForm
          companies={companies}
          initialVehicleId={selectedVehicleForLog?.id}
          onSubmit={handleMileageSubmit}
          onClose={handleCloseModal}
          isSubmitting={isSubmitting}
        />
      </FormModal>

      <MileageHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        vehicleId={selectedVehicleForHistory}
        mileageLogs={mileageLogs}
      />
    </div>
  );
}
