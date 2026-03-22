
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Vehicle, Client, Partner } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { getVehicleColumns } from './columns';
import { FormModal } from '@/components/common/form-modal';
import { VehicleForm, type VehicleFormHandles, type VehicleFormValues } from './components/vehicle-form';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Eye, FileText, DollarSign, Edit, Trash2, Download } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useVehicleSearch, type VehicleWithMetrics } from '@/hooks/use-vehicle-search';
import { FleetDashboard } from './components/fleet-dashboard';
import { VehicleAdvancedFilters } from './components/vehicle-advanced-filters';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getStatusVariant } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { sanitizeAndFormatData } from '@/lib/utils';
import { useStorage } from '@/hooks/use-storage';
import { canAddVehicle, getVehicleLimitMessage, type PlanType } from '@/config/plans';


const statusTranslations: Record<Vehicle['status'], string> = {
  active: 'Activo',
  rented: 'Rentado',
  inactive: 'Inactivo',
  maintenance: 'Mantenimiento',
  sold: 'Vendido',
};

const VehicleMobileCard = ({ vehicle, onEdit, onDelete, onNavigate }: { vehicle: VehicleWithMetrics, onEdit: (v: Vehicle) => void, onDelete: (v: Vehicle) => void, onNavigate: (path: string) => void }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h3 className="font-semibold">{vehicle.plate} - {vehicle.make} {vehicle.model}</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <div><strong>Rendimiento:</strong> <Badge variant="secondary">{vehicle.performanceRating || 'N/A'}</Badge></div>
          <div><strong>Beneficio Neto:</strong> <span className="font-medium">{formatCurrency(vehicle.netProfit || 0)}</span></div>
          <div><strong>Estado:</strong> <Badge variant={getStatusVariant(vehicle.status)}>{statusTranslations[vehicle.status] || vehicle.status}</Badge></div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}`)}><Eye className="mr-2 h-4 w-4"/>Ver Detalles</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(vehicle)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDelete(vehicle)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </Card>
);

export default function VehiclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    rawVehicles,
    rawCompanies,
    vehicleMetrics, // Directly consume memoized metrics
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
    // Primero cerrar el modal
    setIsVehicleModalOpen(false);
    // Resetear el estado DESPUÉS de que la animación de cierre termine
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
        // Validar límite de vehículos según el plan (solo al crear, no al editar)
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

        // Function to handle file upload and get URL
        const handleFileUpload = async (fileOrUrl: string | File | undefined | null, currentUrl?: string): Promise<string | null> => {
            if (fileOrUrl === null || fileOrUrl === undefined) {
                if (currentUrl) await deleteFileByUrl(currentUrl).catch(console.warn);
                return null;
            }
            if (typeof fileOrUrl === 'string') return fileOrUrl; // It's an existing URL, no change
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
  

  if (loadingData && rawVehicles.length === 0) {
    return <p>Cargando vehículos...</p>;
  }

  return (
    <div className="space-y-6">
      <FleetDashboard vehicles={rawVehicles} vehicleMetrics={vehicleMetrics || []} />
      <VehicleAdvancedFilters 
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        onSearch={debouncedSetQuery}
        totalResults={totalResults}
        partners={partners}
        clients={clients}
        isLoading={loadingData}
      />
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight">Gestión de Flota</h2>
              <Button data-add-button="true" onClick={() => handleOpenVehicleModal()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Vehículo
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            data={filteredVehicles}
            columns={columns}
            loading={loadingData}
            searchPlaceholder="Buscar por placa, marca, modelo..."
            noResultsText="No se encontraron vehículos."
            mobileCardRenderer={(vehicle) => (
              <VehicleMobileCard
                vehicle={vehicle}
                onEdit={handleOpenVehicleModal}
                onDelete={handleDeleteRequest}
                onNavigate={(path) => router.push(path)}
              />
            )}
          />
        </CardContent>
      </Card>

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
