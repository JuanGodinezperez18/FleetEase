"use client";

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Trash2, Filter } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import type { Client, Company, Vehicle, ClientWithMetrics } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { FormModal } from '@/components/common/form-modal';
import { ClientForm, type ClientFormValues } from './components/client-form';
import { ClientOffboardingDialog, type ClientOffboardingResult } from '@/components/dashboard/client-offboarding-dialog';
import { offboardClientWithWriteOff } from '@/lib/client-offboarding';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getColumns } from './columns';
import { toast } from 'sonner';
import { useAdvancedClientSearch } from '@/hooks/use-advanced-client-search';
import { ClientDashboard } from './components/client-dashboard';
import { AdvancedSearchPanel } from './components/advanced-filters';
import { useExportData, type ExportOptions } from '@/hooks/use-export-data';
import { ClientListModal } from '@/components/dashboard/components/client-list-modal';
import { sanitizeAndFormatData, formatCurrency } from '@/lib/utils';
import { useDOMSafeModal } from '@/components/common/dom-safe-wrapper';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RowSelectionState } from '@tanstack/react-table';
import { useAuth } from '@/contexts/auth-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useStorage, type StorageFolderPath } from '@/hooks/use-storage';
import { ExportDialog } from './components/export-dialog';
import { ClientMobileCard } from './components/client-mobile-card';

export default function ClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    clients, 
    vehicles, 
    companies, 
    loadingData, 
    credits,
    clientMetrics,
    addClient,
    updateClient,
    clientBalances,
    refreshData,
  } = useData();

  const { currentUser } = useAuth();
  const { uploadFile, deleteFileByUrl } = useStorage();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [clientsToDelete, setClientsToDelete] = useState<ClientWithMetrics[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { isOpen: isListModalOpen, setIsOpen: setIsListModalOpen } = useDOMSafeModal();
  const [modalData, setModalData] = React.useState<{title: string, clients: any[]}>({ title: '', clients: [] });
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const handleOpenModalWithClient = useCallback((client?: Omit<Client, 'licenseStatus'>) => {
    setEditingClient(client as Client || null);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleOpenModalWithClient();
      router.replace('/dashboard/clients', { scroll: false });
    }
  }, [searchParams, router, handleOpenModalWithClient]);

  const allClientsWithData: ClientWithMetrics[] = useMemo(() => {
    const metricsMap = new Map(clientMetrics.map(cm => [cm.clientId, cm]));
    const balancesMap = new Map(clientBalances.map(cb => [cb.id, cb.balance]));
    return clients.map(client => ({
      ...client,
      balance: balancesMap.get(client.id) || 0,
      ...metricsMap.get(client.id)
    }));
  }, [clients, clientMetrics, clientBalances]);
  
  const {
    filters,
    filteredClients: filteredAndSortedClients,
    updateFilter,
    resetFilters,
    activeFiltersCount
  } = useAdvancedClientSearch(allClientsWithData, Object.fromEntries(clientBalances.map(cb => [cb.id, cb.balance])));
  
  const { exportToExcel, isExporting } = useExportData();

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingClient(null);
    }, 300);
  }, []);

  // NOTE: handleFormSubmit, handleDeleteRequest, handleBulkDelete, handleOffboardConfirm
  // and handleExport are preserved below via page-handlers — see full file in artifacts.
  // This intermediate push restores a working shell; full handlers follow in next commit if truncated.

  const handleDeleteRequest = useCallback((client: Omit<Client, 'licenseStatus'>) => {
    const activeCredits = credits.filter(
      c => c.clientId === client.id && c.status === 'active' && !c.isDeleted
    );
    if (activeCredits.length > 0) {
      toast.error('No se puede dar de baja', {
        description: `El cliente tiene ${activeCredits.length} crédito(s) activo(s). Finalice o cancele los créditos antes de dar de baja.`
      });
      return;
    }
    setClientsToDelete([client as ClientWithMetrics]);
    setIsDeleteDialogOpen(true);
  }, [credits]);

  const handleBulkDelete = () => {
    const selectedClientIds = Object.keys(rowSelection);
    const clientsToProcess = filteredAndSortedClients.filter(client => selectedClientIds.includes(client.id));
    const clientsWithActiveCredits = clientsToProcess.filter(client => 
        credits.some(c => c.clientId === client.id && c.status === 'active' && !c.isDeleted)
    );
    if (clientsWithActiveCredits.length > 0) {
        toast.error('Operación Bloqueada', {
            description: `${clientsWithActiveCredits.length} de los clientes seleccionados tienen créditos activos y no pueden darse de baja.`,
        });
        const clientsWithoutCredits = clientsToProcess.filter(client => !clientsWithActiveCredits.some(cwc => cwc.id === client.id));
        if (clientsWithoutCredits.length > 0) {
            setClientsToDelete(clientsWithoutCredits);
            setIsDeleteDialogOpen(true);
        }
    } else {
        setClientsToDelete(clientsToProcess);
        setIsDeleteDialogOpen(true);
    }
  };
  
  const handleCloseDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsDeleteDialogOpen(false);
    setTimeout(() => setClientsToDelete([]), 300);
  }, [isSubmitting]);

  const primaryOffboardClient = clientsToDelete[0];
  const totalOutstandingBalance = clientsToDelete.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

  const handleOffboardConfirm = async (reason: string): Promise<ClientOffboardingResult> => {
    if (clientsToDelete.length === 0) {
      throw new Error('No hay clientes seleccionados para dar de baja.');
    }
    setIsSubmitting(true);
    const toastId = toast.loading(
      clientsToDelete.length === 1
        ? 'Dando de baja al cliente...'
        : `Dando de baja a ${clientsToDelete.length} clientes...`
    );
    try {
      let lastResult: ClientOffboardingResult | null = null;
      for (const client of clientsToDelete) {
        lastResult = await offboardClientWithWriteOff(client.id, reason);
      }
      if (!lastResult) {
        throw new Error('La baja no devolvió información de trazabilidad.');
      }
      toast.success(
        clientsToDelete.length === 1 ? 'Cliente dado de baja' : 'Clientes dados de baja',
        {
          id: toastId,
          description:
            clientsToDelete.length === 1
              ? `Historial conservado. Ref: ${lastResult.clientReferenceCode || '—'} · Pérdida: ${formatCurrency(lastResult.amountWrittenOff)}`
              : `${clientsToDelete.length} cliente(s) procesados. Historial y trazabilidad conservados.`,
        }
      );
      setRowSelection({});
      await refreshData();
      return lastResult;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'No se pudo completar la baja.';
      toast.error('Error al dar de baja', { id: toastId, description: message });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const columns = useMemo(
    () => getColumns(vehicles, 'active', handleOpenModalWithClient, handleDeleteRequest), 
    [vehicles, handleOpenModalWithClient, handleDeleteRequest]
  );
  
  const handleCardClick = useCallback((cardType: 'debtors' | 'criticalClients') => {
    const clientsToShow = allClientsWithData.filter(c => {
      if (c.status !== 'active' || c.isDeleted) return false;
      if (cardType === 'debtors') return c.balance > 0;
      if (cardType === 'criticalClients') return c.balance > 6000;
      return false;
    }).sort((a,b) => b.balance - a.balance);
    const title = cardType === 'debtors' ? 'Clientes con Saldo Deudor' : 'Clientes Críticos (Deuda > $6,000)';
    setModalData({ title, clients: clientsToShow });
    setIsListModalOpen(true);
  }, [allClientsWithData, setIsListModalOpen]);
  
  const handleExport = useCallback((options: ExportOptions) => {
    const selectedClientIds = Object.keys(rowSelection);
    const dataToExportSource = selectedClientIds.length > 0
      ? filteredAndSortedClients.filter(client => selectedClientIds.includes(client.id))
      : filteredAndSortedClients;
    const metricsMap = new Map(clientMetrics.map(cm => [cm.clientId, cm]));
    const dataToExport = dataToExportSource.map(c => {
      let vehicleInfo = 'N/A';
      if (options.includeVehicles && c.assignedVehicleId) {
        vehicleInfo = vehicles.find(v => v.id === c.assignedVehicleId)?.plate || 'N/A';
      }
      const clientMetric = metricsMap.get(c.id);
      let clientData: any = {
        'Nombre': `${c.firstname} ${c.lastname}`,
        'Email': c.email,
        'Teléfono': c.phone,
        'Estado': c.status === 'active' ? 'Activo' : 'Inactivo',
        'Riesgo de Pago': clientMetric?.paymentBehavior || 'N/A',
        'Nivel de Actividad': clientMetric?.activityLevel || 'N/A',
        'Estado de Licencia': clientMetric?.licenseStatus || 'N/A',
      };
      if (options.includeBalance) clientData['Saldo Actual'] = formatCurrency(c.balance);
      if (options.includeVehicles) clientData['Vehículo Asignado'] = vehicleInfo;
      return clientData;
    });
    exportToExcel(dataToExport, { filename: options.filename, type: options.type });
  }, [filteredAndSortedClients, vehicles, exportToExcel, rowSelection, clientMetrics]);

  const handleExportTemplate = () => {
      toast.info("Función no disponible", { description: "La descarga de plantillas estará disponible próximamente." });
  };

  const handleFormSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    const toastId = toast.loading(editingClient ? "Actualizando cliente..." : "Agregando cliente...");
    try {
        const companyId = data.companyId || currentUser?.companyId;
        if (!companyId) throw new Error("La empresa del cliente no pudo ser determinada.");
        if (data.email) {
          let q = supabase.from('clients').select('id').eq('email', data.email).eq('company_id', companyId).eq('is_deleted', false);
          if (editingClient) q = q.neq('id', editingClient.id);
          const { data: existing, error } = await q;
          if (error) throw error;
          if (existing && existing.length > 0) throw new Error("Ya existe un cliente con este correo electrónico en esta empresa.");
        }
        if (data.phone) {
          let q = supabase.from('clients').select('id').eq('phone', data.phone).eq('company_id', companyId).eq('is_deleted', false);
          if (editingClient) q = q.neq('id', editingClient.id);
          const { data: existing, error } = await q;
          if (error) throw error;
          if (existing && existing.length > 0) throw new Error("Ya existe un cliente con este número de teléfono en esta empresa.");
        }
        if (data.licenseNumber) {
          let q = supabase.from('clients').select('id').eq('license_number', data.licenseNumber).eq('company_id', companyId).eq('is_deleted', false);
          if (editingClient) q = q.neq('id', editingClient.id);
          const { data: existing, error } = await q;
          if (error) throw error;
          if (existing && existing.length > 0) throw new Error("Ya existe un cliente con este número de licencia en esta empresa.");
        }
      const { photoUrl: photoField, ineUrl: ineField, licenseImageUrl: licenseField, ...restOfData } = data;
      let clientToProcess: Client;
      const filesToUploadAfterCreation: { field: keyof Client; file: File }[] = [];
      if (editingClient) {
        clientToProcess = editingClient;
      } else {
        const newClientPayload = { ...sanitizeAndFormatData(restOfData), companyId };
        clientToProcess = await addClient(newClientPayload as Omit<Client, 'id' | 'isDeleted' | 'createdAt'>);
        if (photoField instanceof File) filesToUploadAfterCreation.push({ field: 'photoUrl', file: photoField });
        if (ineField instanceof File) filesToUploadAfterCreation.push({ field: 'ineUrl', file: ineField });
        if (licenseField instanceof File) filesToUploadAfterCreation.push({ field: 'licenseImageUrl', file: licenseField });
      }
      const finalPayload: Partial<Client> = { ...sanitizeAndFormatData(restOfData), companyId };
      if (editingClient) {
        const folder: StorageFolderPath = 'driver_documents';
        if (photoField instanceof File) {
          const photoUrl = await uploadFile(photoField, folder, true, clientToProcess.id);
          if (photoUrl) {
            finalPayload.photoUrl = photoUrl;
            if (clientToProcess.photoUrl && typeof clientToProcess.photoUrl === 'string') await deleteFileByUrl(clientToProcess.photoUrl);
          }
        }
        if (ineField instanceof File) {
          const ineUrl = await uploadFile(ineField, folder, true, clientToProcess.id);
          if (ineUrl) {
            finalPayload.ineUrl = ineUrl;
            if (clientToProcess.ineUrl && typeof clientToProcess.ineUrl === 'string') await deleteFileByUrl(clientToProcess.ineUrl);
          }
        }
        if (licenseField instanceof File) {
          const licenseImageUrl = await uploadFile(licenseField, folder, true, clientToProcess.id);
          if (licenseImageUrl) {
            finalPayload.licenseImageUrl = licenseImageUrl;
            if (clientToProcess.licenseImageUrl && typeof clientToProcess.licenseImageUrl === 'string') await deleteFileByUrl(clientToProcess.licenseImageUrl);
          }
        }
        await updateClient(clientToProcess.id, finalPayload);
      }
    if (filesToUploadAfterCreation.length > 0) {
      const folder: StorageFolderPath = 'driver_documents';
      const finalFilePayload: Record<string, string> = {};
      for (const { field, file } of filesToUploadAfterCreation) {
        try {
          const newUrl = await uploadFile(file, folder, true, clientToProcess.id);
          if (newUrl) finalFilePayload[field as string] = newUrl;
        } catch (error) {
          console.error(`Error al subir ${field}:`, error);
          toast.error(`Error al subir el archivo: ${field}`);
        }
      }
      if (Object.keys(finalFilePayload).length > 0) {
        await updateClient(clientToProcess.id, finalFilePayload as Partial<Client>);
      }
    }
        toast.success(editingClient ? "Cliente Actualizado" : "Cliente Agregado", { id: toastId });
        await new Promise(resolve => setTimeout(resolve, 100));
        handleCloseModal();
    } catch (error: any) {
        console.error("[ClientPage] Error en handleFormSubmit:", error);
        let errorMessage = "Ocurrió un error inesperado.";
        if (error instanceof Error) errorMessage = error.message;
        else if (error.details) errorMessage = error.details;
        else if (typeof error === 'string') errorMessage = error;
        toast.error("Error al guardar", { id: toastId, description: errorMessage });
    } finally {
        setTimeout(() => { setIsSubmitting(false); }, 400);
    }
  };
  
  const showDashboard = filters.searchTerm === '' && filters.debtRange === null && activeFiltersCount === 0;
  const selectedCount = Object.keys(rowSelection).length;

  if (loadingData && !clients.length) {
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
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Operación
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">Clientes</h1>
            <p className="mt-1 text-sm text-white/40">
              {selectedCount > 0 ? `${selectedCount} seleccionado(s)` : `${filteredAndSortedClients.length} en esta vista`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
                  {selectedCount > 0 ? (
                    <>
                      <Button variant="outline" onClick={() => handleExport({filename: 'seleccion_clientes'})}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar ({selectedCount})
                      </Button>
                       <Button variant="destructive" onClick={handleBulkDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Dar de baja ({selectedCount})
                      </Button>
                    </>
                  ) : (
                    <>
                      <ExportDialog
                        clients={filteredAndSortedClients}
                        onExport={handleExport}
                        onExportTemplate={handleExportTemplate}
                        isExporting={isExporting}
                      >
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Exportar
                        </Button>
                      </ExportDialog>
                      <Button
                        data-add-button="true"
                        onClick={() => handleOpenModalWithClient()}
                        className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
                        Agregar cliente
                      </Button>
                    </>
                  )}
          </div>
        </header>

        {showDashboard && (
          <ClientDashboard clients={clients} clientMetrics={clientMetrics} onCardClick={handleCardClick} />
        )}

        <Accordion type="single" collapsible className="w-full" defaultValue="">
          <AccordionItem value="filters" className="border-white/[0.07]">
            <AccordionTrigger className="rounded-2xl border border-white/[0.07] bg-[#0e1117] px-4 py-3 hover:no-underline data-[state=open]:rounded-b-none">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Filter className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
                <span className="font-semibold">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge className="border-[#d7ff3f]/20 bg-[#d7ff3f]/10 text-[10px] text-[#d7ff3f]">{activeFiltersCount}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="rounded-b-2xl border border-t-0 border-white/[0.07] bg-[#0e1117] px-3 pb-3">
              <AdvancedSearchPanel
                filters={filters}
                updateFilter={updateFilter}
                resetFilters={resetFilters}
                activeFiltersCount={activeFiltersCount}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="p-4 sm:p-5">
             <ResponsiveTable
              data={filteredAndSortedClients}
              columns={columns}
              loading={loadingData}
              searchPlaceholder="Buscar por nombre, teléfono, vehículo..."
              noResultsText="No se encontraron clientes con los filtros aplicados."
              rowSelection={rowSelection}
              setRowSelection={setRowSelection}
              mobileCardRenderer={(client) => {
                const vehicle = client.assignedVehicleId
                  ? vehicles.find((v) => v.id === client.assignedVehicleId)
                  : undefined;
                return (
                  <ClientMobileCard
                    client={{ ...client, assignedVehiclePlate: vehicle?.plate }}
                    onEdit={handleOpenModalWithClient}
                    onDelete={handleDeleteRequest}
                    onNavigate={(path) => router.push(path)}
                  />
                );
              }}
            />
          </div>
        </section>
      </div>

      <ClientListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title={modalData.title}
        clients={modalData.clients}
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingClient ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
        description={
          editingClient
            ? 'Actualiza los detalles del cliente.'
            : 'Completa el formulario para añadir un nuevo cliente.'
        }
      >
        <ClientForm
          key={editingClient?.id || 'new-client'}
          onSubmit={handleFormSubmit}
          initialData={editingClient}
          vehicles={vehicles}
          companies={companies}
          isSubmitting={isSubmitting}
          onClose={handleCloseModal}
        />
      </FormModal>

      {primaryOffboardClient && (
        <ClientOffboardingDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseDeleteDialog();
            else setIsDeleteDialogOpen(true);
          }}
          clientName={
            clientsToDelete.length > 1
              ? `${clientsToDelete.length} clientes seleccionados`
              : `${primaryOffboardClient.firstname} ${primaryOffboardClient.lastname}`
          }
          clientReferenceCode={
            clientsToDelete.length === 1
              ? (primaryOffboardClient as any).referenceCode ?? null
              : null
          }
          outstandingBalance={totalOutstandingBalance}
          onConfirm={handleOffboardConfirm}
        />
      )}
    </div>
  );
}
