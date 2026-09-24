
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Vehicle } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { getVehicleColumns } from './columns';
import { FormModal } from '@/components/common/form-modal';
import { VehicleForm, type VehicleFormHandles, type VehicleFormValues } from './components/vehicle-form';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { useVehicleSearch } from '@/hooks/use-vehicle-search';
import { FleetDashboard } from './components/fleet-dashboard';
import { sanitizeAndFormatData } from '@/lib/utils';
import { useStorage } from '@/hooks/use-storage';
import { canAddVehicle, getVehicleLimitMessage, type PlanType } from '@/config/plans';
import { VehicleMobileCard } from './components/vehicle-mobile-card';

export default function VehiclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    rawVehicles,
    rawCompanies,
    vehicleMetrics,
    clients,
    partners,
    credits,
    loadingData,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  } = useData();
  
  const { currentUser } = useAuth();
  const { uploadFile, deleteFileByUrl } = useStorage();
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerFormCompanyId, setPartnerFormCompanyId] = useState('');
  
  const vehicleFormRef = useRef<VehicleFormHandles>(null);

  const handleOpenVehicleModal = useCallback((vehicle?: Vehicle) => {
    setEditingVehicle(vehicle || null);
    setIsVehicleModalOpen(true);
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    const vehicleId = searchParams.get('vehicleId');
    if (action === 'new') {
      handleOpenVehicleModal();
      router.replace('/dashboard/vehicles', { scroll: false });
    } else if (action === 'edit' && vehicleId) {
      const vehicleToEdit = rawVehicles.find(v => v.id === vehicleId);
      if (vehicleToEdit) {
        handleOpenVehicleModal(vehicleToEdit);
        router.replace('/dashboard/vehicles', { scroll: false });
      }
    }
  }, [searchParams, router, handleOpenVehicleModal, rawVehicles]);

  const vehiclesWithAllData = useMemo(() => {
    if (!vehicleMetrics) return rawVehicles.map(v => ({...v}));
    const metricsMap = new Map(vehicleMetrics.map(m => [m.vehicleId, m]));
    return rawVehicles.map(vehicle => ({
      ...vehicle,
      ...metricsMap.get(vehicle.id),
    }));
  }, [rawVehicles, vehicleMetrics]);
  
  const { 
    filters,
    filteredVehicles,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults,
  } = useVehicleSearch(vehiclesWithAllData);

  const handleCloseVehicleModal = useCallback(() => {
    if (isSubmitting) return;
    setIsVehicleModalOpen(false);
    setTimeout(() => {
      setEditingVehicle(null);
    }, 300);
  }, [isSubmitting]);

  const handleOpenPartnerModal = useCallback((companyId: string) => {
    setPartnerFormCompanyId(companyId);
    setIsPartnerModalOpen(true);
  }, []);

  const handleVehicleFormSubmit = async (data: VehicleFormValues) => {
    setIsSubmitting(true);
    const toastId = toast.loading(editingVehicle ? "Actualizando vehículo..." : "Agregando vehículo...");

    try {
        if (!editingVehicle && rawCompanies && rawCompanies.length > 0) {
            const company = rawCompanies[0];
            const plan = (company.plan as PlanType) || 'starter';
            const currentVehicleCount = rawVehicles.length;
            
            if (!canAddVehicle(plan, currentVehicleCount)) {
                const limitMessage = getVehicleLimitMessage(plan, currentVehicleCount);
                toast.error('Límite de vehículos alcanzado', { 
                    id: toastId,
                    description: limitMessage
                });
                setIsSubmitting(false);
                return;
            }
        }

        const handleFileUpload = async (fileOrUrl: string | File | undefined | null, currentUrl?: string): Promise<string | null> => {
            if (fileOrUrl === null || fileOrUrl === undefined) {
                if (currentUrl) await deleteFileByUrl(currentUrl).catch(console.warn);
                return null;
            }
            if (typeof fileOrUrl === 'string') return fileOrUrl;
            if (fileOrUrl instanceof File) {
                const newUrl = await uploadFile(fileOrUrl, 'vehicle_images', true, editingVehicle?.id);
                if (currentUrl) await deleteFileByUrl(currentUrl).catch(console.warn);
                return newUrl;
            }
            return null;
        };

        const [imageUrl, circulationCardUrl, insurancePolicyDocumentUrl] = await Promise.all([
            handleFileUpload(data.imageUrl?.[0], editingVehicle?.imageUrl as string | undefined),
            handleFileUpload(data.circulationCardUrl?.[0], editingVehicle?.circulationCardUrl as string | undefined),
            handleFileUpload(data.insurancePolicyDocumentUrl?.[0], editingVehicle?.insurancePolicyDocumentUrl as string | undefined)
        ]);

        const { imageUrl: img, circulationCardUrl: ccu, insurancePolicyDocumentUrl: ipdu, ...restOfData } = data;
        const sanitizedData = sanitizeAndFormatData(restOfData);

        const payload: Partial<Vehicle> = {
            ...sanitizedData,
            imageUrl,
            circulationCardUrl,
            insurancePolicyDocumentUrl,
        };

        if (editingVehicle) {
            await updateVehicle(editingVehicle.id, payload);
            toast.success('Vehículo actualizado', { id: toastId });
        } else {
            await addVehicle(payload as Omit<Vehicle, 'id'>);
            toast.success('Vehículo agregado', { id: toastId });
        }
        handleCloseVehicleModal();
    } catch (error) {
        console.error('Error al guardar el vehículo:', error);
        toast.error('Error al guardar el vehículo', { id: toastId, description: error instanceof Error ? error.message : "Error desconocido." });
    } finally {
        setIsSubmitting(false);
    }
};

  const handleDeleteRequest = useCallback((vehicle: Vehicle) => {
    if (vehicle.clientId) {
      toast.error('No se puede eliminar', {
        description: 'Este vehículo está asignado a un cliente. Desasígnelo primero.'
      });
      return;
    }
    const hasActiveCredit = credits.some(c => c.vehicleId === vehicle.id && c.status === 'active');
    if (hasActiveCredit) {
      toast.error('No se puede eliminar', {
        description: 'Este vehículo tiene un crédito activo. Desactívelo primero.'
      });
      return;
    }
    setVehicleToDelete(vehicle);
  }, [credits]);

  const handleDeleteVehicleConfirm = async () => {
    if (!vehicleToDelete) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading("Eliminando vehículo...");

    try {
      await deleteVehicle(vehicleToDelete.id);
      toast.success('Vehículo eliminado correctamente', { id: toastId });
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Error al eliminar el vehículo:', error);
      toast.error('Error al eliminar el vehículo', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () =>
      getVehicleColumns({
        onEdit: handleOpenVehicleModal,
        onDelete: (id: string) => {
          const v = rawVehicles.find(v => v.id === id);
          if (v) handleDeleteRequest(v);
        },
        onNavigate: (path: string) => router.push(path),
        clients,
        partners
      }),
    [router, clients, partners, handleOpenVehicleModal, handleDeleteRequest, rawVehicles]
  );

  const clientMap = useMemo(
    () => new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`])),
    [clients]
  );
  
  if (loadingData && rawVehicles.length === 0) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-[20px] border border-white/[0.07] bg-[#0e1117]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-[20px] border border-white/[0.07] bg-[#0e1117]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="fe-module-header">
          <div>
            <div className="fe-module-eyebrow">
              Operación
            </div>
            <h1 className="fe-module-title">
              Vehículos
            </h1>
            <p className="fe-module-subtitle">
              {totalResults} en esta vista
            </p>
          </div>
          <div className="fe-module-actions">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/vehicles/assignments')}
              className="h-10 rounded-xl border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Asignaciones
            </Button>
            <Button
              data-add-button="true"
              onClick={() => handleOpenVehicleModal()}
              className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
            >
              <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Agregar vehículo
            </Button>
          </div>
        </header>

        <FleetDashboard vehicles={rawVehicles} vehicleMetrics={vehicleMetrics || []} />

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="p-4 sm:p-5">
            <ResponsiveTable
              data={filteredVehicles}
              columns={columns}
              loading={loadingData}
              searchPlaceholder="Buscar por placa, marca, modelo..."
              noResultsText="No se encontraron vehículos."
              mobileCardRenderer={(vehicle) => (
                <VehicleMobileCard
                  vehicle={vehicle}
                  driverName={vehicle.clientId ? clientMap.get(vehicle.clientId) : undefined}
                  onEdit={handleOpenVehicleModal}
                  onDelete={handleDeleteRequest}
                  onNavigate={(path) => router.push(path)}
                />
              )}
            />
          </div>
        </section>
      </div>

      <FormModal
        isOpen={isVehicleModalOpen}
        onClose={handleCloseVehicleModal}
        title={editingVehicle ? 'Editar Vehículo' : 'Agregar Vehículo'}
      >
        <VehicleForm
          key={editingVehicle?.id || 'new-vehicle'}
          initialData={editingVehicle}
          onSubmit={handleVehicleFormSubmit}
          onSuccess={handleCloseVehicleModal}
          onOpenPartnerModal={handleOpenPartnerModal}
          isSubmitting={isSubmitting}
          onClose={handleCloseVehicleModal}
        />
      </FormModal>

      <DeleteConfirmationDialog
        isOpen={!!vehicleToDelete}
        onClose={() => setVehicleToDelete(null)}
        onConfirm={handleDeleteVehicleConfirm}
        itemName={`${vehicleToDelete?.make} ${vehicleToDelete?.model}`}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
