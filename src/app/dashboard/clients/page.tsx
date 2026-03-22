

"use client";

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, MoreHorizontal, Eye, Edit, Trash2, FileText, Filter } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import type { Client, Company, Vehicle, ClientWithMetrics } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { FormModal } from '@/components/common/form-modal';
import { ClientForm, type ClientFormValues } from './components/client-form';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RowSelectionState } from '@tanstack/react-table';
import { useAuth } from '@/contexts/auth-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useStorage, type StorageFolderPath } from '@/hooks/use-storage';
import { ExportDialog } from './components/export-dialog';

const ClientMobileCard = ({ client, onEdit, onDelete, onNavigate }: { client: any, onEdit: (c: Client) => void, onDelete: (c: Client) => void, onNavigate: (path: string) => void }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h3 className="font-medium">{client.firstname} {client.lastname}</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>📧 {client.email}</p>
          <p>📞 {client.phone}</p>
          <p>💰 Balance: <span className="font-medium">{formatCurrency(client.balance || 0)}</span></p>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(client)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/clients/${client.id}/documents`)}>
                <FileText className="mr-2 h-4 w-4" /> Ver Documentos
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/clients/${client.id}/transactions`)}>
                <Eye className="mr-2 h-4 w-4" /> Ver Transacciones
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(client)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </Card>
);

export default function ClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    clients, 
    vehicles, 
    companies, 
    loadingData, 
    credits,
    clientMetrics, // Consume memoized metrics
    addClient,
    updateClient,
    deleteClient,
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
      // Limpia el parámetro de la URL para evitar que se abra de nuevo al recargar
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
    // Resetear el estado DESPUÉS de que la animación de cierre termine
    setTimeout(() => {
      setEditingClient(null);
    }, 300);
  }, []);

  const handleFormSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    const toastId = toast.loading(editingClient ? "Actualizando cliente..." : "Agregando cliente...");
  
    try {
        const clientsRef = collection(db, 'clients');
        const companyId = data.companyId || currentUser?.companyId;
        if (!companyId) throw new Error("La empresa del cliente no pudo ser determinada.");
  
        // Uniqueness validations
        if (data.email) {
          const q = query(clientsRef, where('email', '==', data.email), where('companyId', '==', companyId));
          const snapshot = await getDocs(q);
          if (!snapshot.empty && snapshot.docs.some(doc => doc.id !== editingClient?.id)) {
            throw new Error("Ya existe un cliente con este correo electrónico en esta empresa.");
          }
        }
        if (data.phone) {
          const q = query(clientsRef, where('phone', '==', data.phone), where('companyId', '==', companyId));
          const snapshot = await getDocs(q);
          if (!snapshot.empty && snapshot.docs.some(doc => doc.id !== editingClient?.id)) {
            throw new Error("Ya existe un cliente con este número de teléfono en esta empresa.");
          }
        }
        if (data.licenseNumber) {
          const q = query(clientsRef, where('licenseNumber', '==', data.licenseNumber), where('companyId', '==', companyId));
          const snapshot = await getDocs(q);
          if (!snapshot.empty && snapshot.docs.some(doc => doc.id !== editingClient?.id)) {
            throw new Error("Ya existe un cliente con este número de licencia en esta empresa.");
          }
        }
        
      const { 
        photoUrl: photoField, 
        ineUrl: ineField, 
        licenseImageUrl: licenseField, 
        ...restOfData 
      } = data;
  
      let clientToProcess: Client;
      const filesToUploadAfterCreation: { field: keyof Client; file: File }[] = [];
  
      if (editingClient) {
        // Editando cliente existente
        clientToProcess = editingClient;
      } else {
        // Creando nuevo cliente
        const newClientPayload = {
          ...sanitizeAndFormatData(restOfData),
          companyId
        };
    
        clientToProcess = await addClient(newClientPayload as Omit<Client, 'id' | 'isDeleted' | 'createdAt'>);
    
        // Para nuevos clientes, encolar archivos para subir después
        if (photoField instanceof File) {
          filesToUploadAfterCreation.push({ field: 'photoUrl', file: photoField });
        }
        if (ineField instanceof File) {
          filesToUploadAfterCreation.push({ field: 'ineUrl', file: ineField });
        }
        if (licenseField instanceof File) {
          filesToUploadAfterCreation.push({ field: 'licenseImageUrl', file: licenseField });
        }
      }
  
      // Preparar payload final
      const finalPayload: Partial<Client> = {
        ...sanitizeAndFormatData(restOfData),
        companyId,
      };
  
      // Subir archivos para clientes existentes
      if (editingClient) {
        const folder: StorageFolderPath = 'driver_documents';
    
        // Subir foto
        if (photoField instanceof File) {
          const photoUrl = await uploadFile(photoField, folder, true, clientToProcess.id);
          if (photoUrl) {
            finalPayload.photoUrl = photoUrl;
            // Eliminar archivo antiguo
            if (clientToProcess.photoUrl && typeof clientToProcess.photoUrl === 'string') {
              await deleteFileByUrl(clientToProcess.photoUrl);
            }
          }
        }
    
        // Subir INE
        if (ineField instanceof File) {
          const ineUrl = await uploadFile(ineField, folder, true, clientToProcess.id);
          if (ineUrl) {
            finalPayload.ineUrl = ineUrl;
            // Eliminar archivo antiguo
            if (clientToProcess.ineUrl && typeof clientToProcess.ineUrl === 'string') {
              await deleteFileByUrl(clientToProcess.ineUrl);
            }
          }
        }
    
        // Subir licencia
        if (licenseField instanceof File) {
          const licenseImageUrl = await uploadFile(licenseField, folder, true, clientToProcess.id);
          if (licenseImageUrl) {
            finalPayload.licenseImageUrl = licenseImageUrl;
            // Eliminar archivo antiguo
            if (clientToProcess.licenseImageUrl && typeof clientToProcess.licenseImageUrl === 'string') {
              await deleteFileByUrl(clientToProcess.licenseImageUrl);
            }
          }
        }
    
        await updateClient(clientToProcess.id, finalPayload);
      }
  
    // Manejar subida de archivos para nuevos clientes
    if (filesToUploadAfterCreation.length > 0) {
      const folder: StorageFolderPath = 'driver_documents';
      const finalFilePayload: Record<string, string> = {};
    
      for (const { field, file } of filesToUploadAfterCreation) {
        try {
          const newUrl = await uploadFile(file, folder, true, clientToProcess.id);
          if (newUrl) {
            finalFilePayload[field as string] = newUrl;
          }
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
  
        // Esperar un poco para que React Query actualice
        await new Promise(resolve => setTimeout(resolve, 100));
  
        handleCloseModal();
  
    } catch (error: any) {
        console.error("[ClientPage] Error en handleFormSubmit:", error);
  
        let errorMessage = "Ocurrió un error inesperado.";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error.details) {
            errorMessage = error.details;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
  
        toast.error("Error al guardar", { id: toastId, description: errorMessage });
    } finally {
        // Resetear isSubmitting DESPUÉS de que el modal se cierra
        setTimeout(() => {
            setIsSubmitting(false);
        }, 400); // 300ms animación modal + 100ms buffer
    }
  };

  const handleDeleteRequest = useCallback((client: Omit<Client, 'licenseStatus'>) => {
    const activeCredits = credits.filter(
      c => c.clientId === client.id && c.status === 'active' && !c.isDeleted
    );
    
    if (activeCredits.length > 0) {
      toast.error('No se puede eliminar', {
        description: `El cliente tiene ${activeCredits.length} crédito(s) activo(s). Finalice o desactive los créditos antes de eliminar.`
      });
      return;
    }
    
    setClientsToDelete([client]);
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
            description: `${clientsWithActiveCredits.length} de los clientes seleccionados tienen créditos activos y no pueden ser eliminados.`,
        });
        const clientsWithoutCredits = clientsToProcess.filter(client => !clientsWithActiveCredits.some(cwc => cwc.id === client.id));
        if(clientsWithoutCredits.length > 0) {
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

  const handleDeleteConfirm = async () => {
    if (clientsToDelete.length === 0) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading(`Eliminando ${clientsToDelete.length} cliente(s)...`);
    
    try {
      await Promise.all(clientsToDelete.map(client => deleteClient(client.id)));
      toast.success("Clientes Eliminados", {
        id: toastId,
        description: `${clientsToDelete.length} cliente(s) han sido marcados como eliminados.`
      });
      setRowSelection({}); 
      handleCloseDeleteDialog();
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        id: toastId,
        description: "No se pudieron eliminar todos los clientes seleccionados."
      });
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
      if (c.status !== 'active' || c.isDeleted) {
        return false;
      }
      
      if (cardType === 'debtors') {
        return c.balance > 0;
      }
      if (cardType === 'criticalClients') {
        return c.balance > 6000;
      }
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
  
      if (options.includeBalance) {
        clientData['Saldo Actual'] = formatCurrency(c.balance);
      }
      if (options.includeVehicles) {
        clientData['Vehículo Asignado'] = vehicleInfo;
      }
      
      return clientData;
    });
  
    exportToExcel(dataToExport, { filename: options.filename, type: options.type });
  }, [filteredAndSortedClients, vehicles, exportToExcel, rowSelection, clientMetrics]);

  const handleExportTemplate = () => {
      toast.info("Función no disponible", { description: "La descarga de plantillas estará disponible próximamente." });
  };
  
  const showDashboard = filters.searchTerm === '' && filters.debtRange === null && activeFiltersCount === 0;
  const selectedCount = Object.keys(rowSelection).length;

  if (loadingData && !clients.length) {
    return <p>Cargando clientes...</p>;
  }

  return (
    <div className="space-y-6">
        {showDashboard && <ClientDashboard clients={clients} clientMetrics={clientMetrics} onCardClick={handleCardClick} />}

        <Accordion type="single" collapsible className="w-full" defaultValue="filters">
            <AccordionItem value="filters">
                <AccordionTrigger className="px-4 py-2 bg-card rounded-t-lg border-b">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        <span className="font-semibold">Búsqueda Avanzada</span>
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary">{activeFiltersCount} activos</Badge>
                        )}
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                     <AdvancedSearchPanel
                        filters={filters}
                        updateFilter={updateFilter}
                        resetFilters={resetFilters}
                        activeFiltersCount={activeFiltersCount}
                    />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg">Gestión de Clientes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Administra la información y el estado de tus clientes. {selectedCount > 0 && `${selectedCount} seleccionado(s).`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                  {selectedCount > 0 ? (
                    <>
                      <Button variant="outline" onClick={() => handleExport({filename: 'seleccion_clientes'})}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar ({selectedCount})
                      </Button>
                       <Button variant="destructive" onClick={handleBulkDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar ({selectedCount})
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
                      
                      {showDashboard && (
                        <Button data-add-button="true" onClick={() => handleOpenModalWithClient()}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Agregar Cliente
                        </Button>
                      )}
                    </>
                  )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
             <ResponsiveTable
              data={filteredAndSortedClients}
              columns={columns}
              loading={loadingData}
              searchPlaceholder="Buscar por nombre, teléfono, vehículo..."
              noResultsText="No se encontraron clientes con los filtros aplicados."
              rowSelection={rowSelection}
              setRowSelection={setRowSelection}
              mobileCardRenderer={(client) => (
                <ClientMobileCard 
                  client={client}
                  onEdit={handleOpenModalWithClient}
                  onDelete={handleDeleteRequest}
                  onNavigate={(path) => router.push(path)}
                />
              )}
            />
          </CardContent>
        </Card>
      
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

      {clientsToDelete.length > 0 && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleDeleteConfirm}
          itemName={clientsToDelete.length > 1 ? `${clientsToDelete.length} clientes` : `${clientsToDelete[0].firstname} ${clientsToDelete[0].lastname}`}
          titleText={`¿Confirmar eliminación de ${clientsToDelete.length} cliente(s)?`}
          descriptionText={
            `Esta acción marcará al/los cliente(s) como eliminado(s). Se desasignará de cualquier vehículo asignado.`
          }
          confirmText="Eliminar"
          isDeleting={isSubmitting}
        />
      )}
    </div>
  );
}





    