

"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Vehicle, VehicleWithMileage, MileageLog } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { FormModal } from '@/components/common/form-modal';
import MileageLogForm, { type MileageLogFormValues } from './components/mileage-log-form';
import { getMileageColumns } from './columns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMileageAnalytics } from '@/hooks/use-mileage-analytics';
import { useMileageSearch, type VehicleWithMileageAndMetrics } from '@/hooks/use-mileage-search';
import { MaintenanceDashboard } from './components/maintenance-dashboard';
import { MileageAdvancedFilters } from './components/mileage-advanced-filters';
import { toast } from 'sonner';
import { MileageHistoryModal } from './components/mileage-history-modal';
import { MileageMobileCard } from './components/mileage-mobile-card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

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

  useEffect(() => {
    console.log(`[MileagePage] Datos cargados: ${mileageLogs.length} registros de kilometraje.`);
  }, [mileageLogs]);

  const handleOpenModal = useCallback((vehicleId?: string) => {
    const vehicle = vehicleId ? getVehicleById(vehicleId) : null;
    setSelectedVehicleForLog(vehicle || null);
    setIsModalOpen(true);
  }, [getVehicleById]);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedVehicleForLog(null);
    }, 300);
  }, [isSubmitting]);

  const handleMileageSubmit = useCallback(async (data: MileageLogFormValues) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Guardando registro...");

    const handleUpdateExisting = async (existingLogId: string, newData: MileageLogFormValues) => {
      toast.loading("Actualizando registro existente...", { id: toastId });
      try {
        await updateMileageLog(existingLogId, { mileage: newData.mileage });
        toast.success("Registro Actualizado", {
          id: toastId,
          description: `Kilometraje actualizado a ${newData.mileage.toLocaleString()} km.`
        });
        handleCloseModal();
        await refreshData();
      } catch (error) {
        toast.error("Error al actualizar", {
          id: toastId,
          description: error instanceof Error ? error.message : "No se pudo actualizar el registro."
        });
      }
    };

    try {
      await addMileageLog(data as Omit<MileageLog, 'id' | 'uid' | 'createdAt'>);
      toast.success("Registro Guardado", {
        id: toastId,
        description: `Kilometraje actualizado para el vehículo.`
      });
      handleCloseModal();
      await refreshData();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Ya existe un registro')) {
        const existingLog = mileageLogs.find(log => log.vehicleId === data.vehicleId && log.date === data.date);
        if (existingLog) {
          toast.warning('Ya existe un registro para esta fecha', {
            id: toastId,
            description: '¿Deseas actualizar el registro existente con el nuevo kilometraje?',
            action: {
              label: 'Actualizar',
              onClick: () => handleUpdateExisting(existingLog.id, data)
            },
            cancel: {
              label: 'Cancelar',
              onClick: () => toast.dismiss(toastId)
            }
          });
        } else {
          toast.error('Error de duplicado', { id: toastId, description: error.message });
        }
      } else {
        console.error("Error saving mileage log:", error);
        toast.error('Error al Guardar', {
          id: toastId,
          description: error instanceof Error ? error.message : "No se pudo guardar el registro de kilometraje."
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [addMileageLog, handleCloseModal, mileageLogs, refreshData, updateMileageLog]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleOpenModal();
      router.replace('/dashboard/mileage', { scroll: false });
    }
  }, [searchParams, router, handleOpenModal]);

  const handleOpenHistory = useCallback((vehicleId: string) => {
    console.log(`[MileagePage] Abriendo historial para vehículo ID: ${vehicleId}`);
    setSelectedVehicleForHistory(vehicleId);
    setIsHistoryModalOpen(true);
  }, []);

  // El intervalo de mantenimiento es una configuración de la empresa.
  // El módulo de kilometraje debe usarla en tiempo real, no un valor fijo
  // ni una copia antigua guardada en cada vehículo.
  const activeVehicles = useMemo(() => {
    const companyIntervals = new Map(
      companies.map(company => [company.id, company.maintenanceInterval])
    );

    return vehicles
      .filter(v => v.status !== 'sold')
      .map(vehicle => {
        const companyInterval = vehicle.companyId
          ? companyIntervals.get(vehicle.companyId)
          : undefined;
        const effectiveInterval = companyInterval && companyInterval > 0
          ? companyInterval
          : vehicle.maintenanceInterval;

        return effectiveInterval && effectiveInterval > 0
          ? { ...vehicle, maintenanceInterval: effectiveInterval }
          : vehicle;
      });
  }, [vehicles, companies]);

  const selectedCompany = useMemo(
    () => companies.find(company => company.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const maintenanceInterval = selectedCompany?.maintenanceInterval || 5000;

  const { vehicleMetrics } = useMileageAnalytics(activeVehicles, mileageLogs, financialRecords);

  const vehiclesWithAllMetrics: VehicleWithMileageAndMetrics[] = useMemo(() => {
    const metricsMap = new Map(vehicleMetrics.map(m => [m.vehicleId, m]));
    return activeVehicles.map(v => ({
      ...v,
      ...metricsMap.get(v.id)
    })) as VehicleWithMileageAndMetrics[];
  }, [activeVehicles, vehicleMetrics]);

  const {
    filters,
    filteredVehicles,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults
  } = useMileageSearch(vehiclesWithAllMetrics);

  const handleCloseHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(false);
    setSelectedVehicleForHistory(null);
  }, []);

  const handleFormSubmit = useMemo(() => handleMileageSubmit, [handleMileageSubmit]);

  const columns = useMemo(
    () => getMileageColumns(handleOpenModal, handleOpenHistory, vehicleMetrics),
    [vehicleMetrics, handleOpenModal, handleOpenHistory]
  );

  if (loadingData && !vehicles.length) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  console.log(`[MileagePage] Renderizando. Pasando ${mileageLogs.length} logs al modal.`);

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-grow">
              <CardTitle>Control de Kilometraje</CardTitle>
              <CardDescription>
                Controle los próximos mantenimientos programados cada {maintenanceInterval.toLocaleString()} km.
              </CardDescription>
            </div>
            <Button
              data-add-button="true"
              onClick={() => handleOpenModal()}
              disabled={isSubmitting}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Kilometraje
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            data={filteredVehicles.sort((a, b) => (a.kmToNextMaintenance ?? Infinity) - (b.kmToNextMaintenance ?? Infinity))}
            columns={columns}
            loading={loadingData}
            searchPlaceholder="Buscar por placa..."
            noResultsText="No se encontraron vehículos que coincidan con los filtros."
            mobileCardRenderer={(vehicle) => (
              <MileageMobileCard vehicle={vehicle} onOpenModal={handleOpenModal} onOpenHistory={handleOpenHistory} />
            )}
          />
        </CardContent>
      </Card>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Nuevo Registro de Kilometraje"
        description={
          selectedVehicleForLog
            ? `Registrar nuevo kilometraje para ${selectedVehicleForLog.make} ${selectedVehicleForLog.model} (${selectedVehicleForLog.plate})`
            : "Registrar nuevo kilometraje para un vehículo."
        }
      >
        <MileageLogForm
          key={selectedVehicleForLog?.id || 'new-log'}
          onSubmit={handleFormSubmit}
          initialVehicleId={selectedVehicleForLog?.id}
          companies={companies}
          isSubmitting={isSubmitting}
          onClose={handleCloseModal}
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
