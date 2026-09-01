
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
import { CreditCancellationDialog, type CreditCancellationResult } from '@/components/dashboard/credit-cancellation-dialog';
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
import { checkCreditAvailability, buildCreditData, buildVehicleCreditLockPayload } from '@/lib/credit-creation';


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
            {credit.status === 'active' && (
              <DropdownMenuItem onSelect={() => onDeactivate(credit.id)} className="text-destructive focus:text-destructive">
                Cancelar crédito
              </DropdownMenuItem>
            )}
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
    cancelCredit, 
    cancelCreditWithAdjustment,
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

  const openCancellationDialog = useCallback((creditId: string) => {
    const credit = credits.find(c => c.id === creditId);
    if (credit) {
      setCreditToAction(credit);
      setIsDeactivateDialogOpen(true);
    }
  }, [credits]);

  // Compat: rutas antiguas "eliminar" se redirigen a cancelación no destructiva
  const handleDelete = openCancellationDialog;
  const handleDeactivate = openCancellationDialog;

  const handleCancelCreditConfirm = async (reason: string): Promise<CreditCancellationResult> => {
    if (!creditToAction) {
      throw new Error('No hay crédito seleccionado.');
    }

    setIsSubmitting(true);
    const toastId = sonnerToast.loading("Cancelando crédito...");

    try {
      await cancelCreditWithAdjustment(creditToAction.id, reason);

      const result: CreditCancellationResult = {
        creditId: creditToAction.id,
        creditReferenceCode: (creditToAction as any).referenceCode ?? null,
        status: 'cancelled',
        remainingBalance: Number(creditToAction.remainingBalance || 0),
        vehicleReleased: Boolean(creditToAction.vehicleId),
        clientReleased: Boolean(creditToAction.clientId),
      };

      sonnerToast.success("Crédito cancelado", {
        id: toastId,
        description: `Historial conservado. Ref: ${result.creditReferenceCode || '—'} · Saldo: ${formatCurrency(result.remainingBalance)}`,
      });

      await refreshData();
      return result;
    } catch (error) {
      console.error("Error cancelling credit:", error);
      const message = error instanceof Error ? error.message : "Hubo un error al cancelar el crédito.";
      sonnerToast.error("Error", { id: toastId, description: message });
      throw error;
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
      // Validar disponibilidad (1 crédito activo por vehículo/cliente) con
      // la misma regla que usa la acción rápida del dashboard.
      const availability = checkCreditAvailability(credits, {
        vehicleId: data.vehicleId,
        clientId: data.clientId,
        excludeCreditId: editingCredit?.id,
      });
      if (!availability.available) {
        const isVehicleError = availability.error?.includes('vehículo');
        sonnerToast.error(isVehicleError ? 'Vehículo No Disponible' : 'Cliente con Crédito Activo', {
          id: toastId,
          description: availability.error,
        });
        setIsSubmitting(false);
        return;
      }

      const creditData = buildCreditData(
        data,
        currentUser?.companyId,
        editingCredit?.createdAt
      );
      const totalAmount = creditData.totalAmount;

      if (editingCredit?.id) {
        console.log('✏️ Modo edición - Actualizando crédito:', editingCredit.id);
        await updateCredit(editingCredit.id, creditData);
        sonnerToast.success("Crédito Actualizado", { id: toastId });
      } else {
        console.log('➕ Modo creación - Llamando a createCreditWithFinancialRecord...');
        console.log('📞 Argumentos:', { creditData, companyId: creditData.companyId });
        
        const creditId = await createCreditWithFinancialRecord(
            creditData, 
            creditData.companyId
        );

        console.log('✅ Crédito creado con ID:', creditId);

        if (creditId) {
          console.log('🔒 Bloqueando vehículo:', data.vehicleId);
          await updateVehicle(data.vehicleId, buildVehicleCreditLockPayload(data.clientId, creditId));
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

      {creditToAction && (
        <CreditCancellationDialog
          open={isDeactivateDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsDeactivateDialogOpen(false);
              setTimeout(() => setCreditToAction(null), 300);
            } else {
              setIsDeactivateDialogOpen(true);
            }
          }}
          clientName={
            (() => {
              const client = clients.find(c => c.id === creditToAction.clientId);
              return client ? `${client.firstname} ${client.lastname}` : 'Cliente desconocido';
            })()
          }
          creditReferenceCode={(creditToAction as any).referenceCode ?? null}
          vehicleLabel={
            (() => {
              const vehicle = vehicles.find(v => v.id === creditToAction.vehicleId);
              return vehicle?.plate || null;
            })()
          }
          outstandingBalance={Number(creditToAction.remainingBalance || 0)}
          creditStatus={creditToAction.status}
          onConfirm={handleCancelCreditConfirm}
        />
      )}
    </div>
  );
}
