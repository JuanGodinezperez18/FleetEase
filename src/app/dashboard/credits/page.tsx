
"use client";
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useData } from '@/hooks/use-data';
import { getCreditColumns } from './columns';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2, XCircle } from 'lucide-react';
import { FormModal } from '@/components/common/form-modal';
import { CreditForm, CreditFormValues } from './components/credit-form';
import type { Credit, Client, Vehicle } from '@/types';
import { toast as sonnerToast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCreditAnalytics } from '@/hooks/use-credits-analytics';
import { useCreditsSearch, type CreditWithMetrics } from '@/hooks/use-credits-search';
import { CreditPortfolioDashboard } from './components/credit-portfolio-dashboard';
import { CreditAdvancedFilters } from './components/credit-advanced-filters';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';


const CreditMobileCard = ({ credit, onEdit, onDelete, onDeactivate, onViewDetails }: { credit: CreditWithMetrics, onEdit: (c: Credit) => void, onDelete: (id: string) => void, onDeactivate: (id: string) => void, onViewDetails: (id: string) => void }) => {
  
  const getPaymentBehaviorBadge = (level: CreditWithMetrics['paymentBehavior']) => {
      if (!level) return <Badge variant="outline">N/A</Badge>;
      switch (level) {
          case 'Puntual': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Puntual</Badge>;
          case 'Ligero Retraso': return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600">Retraso Ligero</Badge>;
          case 'Retraso Severo': return <Badge variant="destructive">Retraso Severo</Badge>;
          default: return <Badge variant="outline">{level}</Badge>;
      }
  };

  const status = credit.status;
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  switch(status) {
      case 'active': variant = 'default'; break;
      case 'completed': variant = 'secondary'; break;
      case 'defaulted': variant = 'destructive'; break;
      case 'inactive': variant = 'outline'; break;
  }
  const progress = credit.totalAmount > 0 ? ((credit.paidAmount || 0) / credit.totalAmount) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{credit.clientName}</h3>
            <Badge variant={variant} className={status === 'active' ? 'bg-green-500' : ''}>{status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div><strong>Comportamiento:</strong> {getPaymentBehaviorBadge(credit.paymentBehavior)}</div>
            <p><strong>Saldo:</strong> {formatCurrency(credit.remainingBalance || 0)}</p>
            <div className="w-full">
              <span className="text-xs">{formatCurrency(credit.paidAmount || 0)} / {formatCurrency(credit.totalAmount)}</span>
              <Progress value={progress} className="h-2 mt-1" />
            </div>
            {credit.estimatedCompletionDate && <p><strong>Fin Est.:</strong> {formatDate(credit.estimatedCompletionDate)}</p>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onViewDetails(credit.id)}>Ver Detalles</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(credit)}>Editar</DropdownMenuItem>
            {credit.status === 'active' && <DropdownMenuItem onSelect={() => onDeactivate(credit.id)} className="text-orange-600 focus:text-orange-700">Cancelar Crédito</DropdownMenuItem>}
            <DropdownMenuItem onSelect={() => onDelete(credit.id)} className="text-destructive focus:text-destructive">Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};


export default function CreditsPage() {
  const { 
    credits, 
    clients, 
    vehicles, 
    companies, 
    financialRecords, 
    loadingData, 
    addCredit, 
    updateCredit, 
    deleteCredit, 
    cancelCredit, 
    updateVehicle, 
    refreshData, 
    createCreditWithFinancialRecord 
  } = useData();
  
  const { currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [creditToAction, setCreditToAction] = useState<Credit | null>(null);
  
  const { creditMetrics, portfolioAnalytics } = useCreditAnalytics(credits, clients, vehicles, financialRecords);
  
  const clientNames: Record<string, string> = useMemo(() => 
    Object.fromEntries(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`])),
    [clients]
  );

  const creditsWithMetrics: CreditWithMetrics[] = useMemo(() => {
    const metricsMap = new Map(creditMetrics.map(m => [m.creditId, m]));
    return credits
      .filter(c => !c.isDeleted)
      .map(credit => ({
        ...credit,
        ...metricsMap.get(credit.id),
        clientName: clientNames[credit.clientId] || 'Cliente Desconocido',
      }));
  }, [credits, creditMetrics, clientNames]);
  
  const {
    filters,
    filteredCredits,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults,
  } = useCreditsSearch(creditsWithMetrics);

  const handleCreateNew = useCallback(() => {
    setEditingCredit(null);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleCreateNew();
      router.replace('/dashboard/credits', { scroll: false });
    }
  }, [searchParams, router, handleCreateNew]);

  const handleEdit = useCallback((credit: Credit) => {
    setEditingCredit(credit);
    setIsModalOpen(true);
  }, []);
  
  const handleViewDetails = useCallback((creditId: string) => {
    router.push(`/dashboard/credits/${creditId}`);
  }, [router]);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    // Primero cerrar el modal
    setIsModalOpen(false);
    // Resetear el estado DESPUÉS de que la animación de cierre termine
    setTimeout(() => {
      setEditingCredit(null);
    }, 300);
  }, [isSubmitting]);

  const handleDelete = useCallback((creditId: string) => {
    const credit = credits.find(c => c.id === creditId);
    if (credit) {
      setCreditToAction(credit);
      setIsDeleteDialogOpen(true);
    }
  }, [credits]);

  const handleDeactivate = useCallback((creditId: string) => {
    const credit = credits.find(c => c.id === creditId);
    if (credit) {
      setCreditToAction(credit);
      setIsDeactivateDialogOpen(true);
    }
  }, [credits]);
  
  const confirmDelete = async () => {
    if (!creditToAction) return;
    
    const creditPayments = financialRecords.filter(fr =>
      fr.creditId === creditToAction.id && !fr.isDeleted
    );
    
    if (creditPayments.length > 0) {
      sonnerToast.error('No se puede eliminar', {
        description: `Este crédito tiene ${creditPayments.length} pago(s) registrado(s). No se puede eliminar.`
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsSubmitting(true);
    const toastId = sonnerToast.loading("Eliminando crédito...");
    try {
      await deleteCredit(creditToAction.id);
      sonnerToast.success("Crédito Eliminado", { id: toastId });
      setIsDeleteDialogOpen(false);
      setCreditToAction(null);
    } catch (error) {
      console.error("Error deleting credit:", error);
      sonnerToast.error("Error", { id: toastId, description: "Hubo un error al eliminar el crédito." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!creditToAction) return;

    setIsSubmitting(true);
    const toastId = sonnerToast.loading("Cancelando crédito...");

    try {
      await cancelCredit(creditToAction.id);

      sonnerToast.success("Crédito Cancelado", {
        id: toastId,
        description: `Se generó una Nota de Crédito por ${formatCurrency(creditToAction.remainingBalance || 0)} para ajustar el saldo del cliente.`
      });

      setIsDeactivateDialogOpen(false);
      setCreditToAction(null);
      await refreshData();
    } catch (error) {
      console.error("Error deactivating credit:", error);
      sonnerToast.error("Error", {
        id: toastId,
        description: error instanceof Error ? error.message : "Hubo un error al cancelar el crédito."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (data: CreditFormValues) => {
    console.log('🚀 ========== INICIO handleSubmit ==========');
    console.log('📦 Datos recibidos del formulario:', data);
    
    setIsSubmitting(true);
    const toastId = sonnerToast.loading(editingCredit ? "Actualizando crédito..." : "Creando crédito...");
    
    try {
      // Validar que exista un vehículo disponible
      const existingCreditForVehicle = credits.find(c => 
        c.vehicleId === data.vehicleId && 
        c.status === 'active' && 
        !c.isDeleted &&
        c.id !== editingCredit?.id
      );
      
      if (existingCreditForVehicle) {
        const client = clients.find(cl => cl.id === existingCreditForVehicle.clientId);
        console.log('❌ Vehículo ya tiene crédito activo');
        sonnerToast.error('Vehículo No Disponible', {
          id: toastId,
          description: `Este vehículo ya tiene un crédito activo con ${client?.firstname || 'otro cliente'}`
        });
        setIsSubmitting(false);
        return;
      }
      
      // Validar que el cliente no tenga créditos activos
      const clientActiveCreditsCount = credits.filter(c =>
        c.clientId === data.clientId &&
        c.status === 'active' &&
        !c.isDeleted &&
        c.id !== editingCredit?.id
      ).length;

      if (clientActiveCreditsCount > 0) {
        console.log('❌ Cliente ya tiene crédito activo');
        sonnerToast.error('Cliente con Crédito Activo', {
          id: toastId,
          description: 'Este cliente ya tiene un crédito activo. Complete o desactive el anterior primero.'
        });
        setIsSubmitting(false);
        return;
      }
      
      const weeklyPayment = Number(data.weeklyPayment) || 0;
      const totalPayments = Number(data.numberOfPayments) || 0;
      const totalAmount = weeklyPayment * totalPayments;
      
      console.log('💰 Cálculos:', { weeklyPayment, totalPayments, totalAmount });

      // IMPORTANTE: Obtener el companyId correcto
      const companyIdToUse = data.companyId || currentUser?.companyId || null;
      
      if (!companyIdToUse) {
        console.error('❌ No se pudo determinar el companyId');
        sonnerToast.error('Error', {
          id: toastId,
          description: 'No se pudo determinar la empresa. Por favor, selecciona una empresa.'
        });
        setIsSubmitting(false);
        return;
      }
      
      console.log('🏢 CompanyId a usar:', companyIdToUse);

      const creditData: Omit<Credit, 'id'| 'isDeleted'> & { companyId?: string | null, createdAt?: string, updatedAt?: string } = {
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        startDate: data.startDate,
        totalAmount,
        weeklyPayment,
        numberOfPayments: totalPayments,
        paidAmount: 0,
        remainingBalance: totalAmount,
        status: 'active',
        paymentsMade: 0,
        companyId: companyIdToUse,
        createdAt: editingCredit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('📋 Datos del crédito preparados:', creditData);
      
      if (editingCredit?.id) {
        console.log('✏️ Modo edición - Actualizando crédito:', editingCredit.id);
        await updateCredit(editingCredit.id, creditData);
        sonnerToast.success("Crédito Actualizado", { id: toastId });
      } else {
        console.log('➕ Modo creación - Llamando a createCreditWithFinancialRecord...');
        console.log('📞 Argumentos:', { creditData, companyId: companyIdToUse });
        
        const creditId = await createCreditWithFinancialRecord(
            creditData, 
            companyIdToUse
        );

        console.log('✅ Crédito creado con ID:', creditId);

        if (creditId) {
          console.log('🔒 Bloqueando vehículo:', data.vehicleId);
          await updateVehicle(data.vehicleId, {
            lockedByCredit: true,
            associatedCreditId: creditId,
            updatedAt: new Date().toISOString()
          });
          console.log('✅ Vehículo bloqueado correctamente');
        }
        
        sonnerToast.success("Crédito Creado", { 
          id: toastId, 
          description: `Se sumó ${formatCurrency(totalAmount)} al balance del cliente.` 
        });
      }
      
      console.log('🔄 Cerrando modal y refrescando datos...');
      handleCloseModal();
      await refreshData();
      console.log('✅ Datos refrescados correctamente');
      console.log('🎉 ========== FIN handleSubmit EXITOSO ==========');
      
    } catch (error) {
      console.error("❌ ========== ERROR EN handleSubmit ==========");
      console.error("Error completo:", error);
      console.error("Stack trace:", (error as Error).stack);
      
      const errorMessage = error instanceof Error ? error.message : "Hubo un error al guardar el crédito.";
      sonnerToast.error("Error", { id: toastId, description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => getCreditColumns({ clients, vehicles, onEdit: handleEdit, onDelete: handleDelete, onDeactivate: handleDeactivate, onViewDetails: handleViewDetails }), 
    [clients, vehicles, handleEdit, handleDelete, handleDeactivate, handleViewDetails]
  );

  const getCreditNameForDialog = (credit: Credit | null) => {
    if (!credit) return '';
    const client = clients.find(c => c.id === credit.clientId);
    const vehicle = vehicles.find(v => v.id === credit.vehicleId);
    const clientName = client ? `${client.firstname} ${client.lastname}` : 'Cliente desconocido';
    return `el crédito de ${clientName} para el vehículo ${vehicle?.plate || 'desconocido'}`;
  }

  return (
    <div className="space-y-6">
      <CreditPortfolioDashboard creditMetrics={creditMetrics} portfolioAnalytics={portfolioAnalytics} />

      <CreditAdvancedFilters
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        onSearch={debouncedSetQuery}
        totalResults={totalResults}
        clients={clients}
        vehicles={vehicles}
        isLoading={loadingData}
      />

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg">Gestión de Créditos</CardTitle>
                <CardDescription>Administra, filtra y analiza todos los créditos activos.</CardDescription>
              </div>
              <Button data-add-button="true" onClick={handleCreateNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar Crédito
              </Button>
            </div>
        </CardHeader>
        <CardContent>
            <ResponsiveTable
                columns={columns}
                data={filteredCredits}
                searchPlaceholder="Buscar por cliente, vehículo, estado..."
                noResultsText="No se encontraron créditos."
                loading={loadingData}
                mobileCardRenderer={(credit) => (
                  <CreditMobileCard 
                    credit={credit}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDeactivate={handleDeactivate}
                    onViewDetails={handleViewDetails}
                  />
                )}
            />
        </CardContent>
      </Card>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCredit ? 'Editar Crédito' : 'Agregar Nuevo Crédito'}
        description={editingCredit ? 'Actualiza los detalles del crédito.' : 'Sigue los pasos para configurar un nuevo crédito.'}
      >
        <CreditForm
            key={editingCredit?.id || 'new-credit'}
            onSubmit={handleSubmit}
            initialData={editingCredit || undefined}
            isSubmitting={isSubmitting}
            onClose={handleCloseModal}
        />
      </FormModal>

      <DeleteConfirmationDialog
        isOpen={isDeactivateDialogOpen}
        onClose={() => setIsDeactivateDialogOpen(false)}
        onConfirm={confirmDeactivate}
        itemName={getCreditNameForDialog(creditToAction)}
        isDeleting={isSubmitting}
        titleText="¿Confirmar cancelación de crédito?"
        descriptionText={`Esta acción:
• Marcará ${getCreditNameForDialog(creditToAction)} como cancelado
• Generará una Nota de Crédito por ${formatCurrency(creditToAction?.remainingBalance || 0)} para ajustar el saldo del cliente
• Liberará el vehículo asociado
• Cancelará los pagos pendientes del cronograma

Esta acción NO se puede deshacer.`}
        confirmText="Cancelar Crédito"
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        itemName={getCreditNameForDialog(creditToAction)}
        isDeleting={isSubmitting}
        titleText="¿Confirmar eliminación?"
        descriptionText={`Esta acción eliminará permanentemente ${getCreditNameForDialog(creditToAction)}. Esta acción no se puede deshacer.`}
        confirmText="Eliminar Permanentemente"
      />
    </div>
  );
}
