

"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Partner, Company, FinancialRecord, Vehicle } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { getColumns } from './columns';
import { FormModal } from '@/components/common/form-modal';
import { PartnerForm, type PartnerFormValues } from './components/partner-form';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Download } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { toast as sonnerToast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { usePartnerAnalytics, type PartnerMetric } from '@/hooks/use-partner-analytics';
import { PartnerDashboard } from './components/partner-dashboard';
import { usePartnerSearch } from '@/hooks/use-partner-search';
import { PartnerAdvancedFilters } from './components/partner-advanced-filters';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { PartnerBalancesModal } from './components/partner-balances-modal';


export type PartnerWithMetrics = Partner & Partial<PartnerMetric>;

// React 19: No memo() needed - compiler handles optimization
function PartnerMobileCard({ partner, onEdit, onDelete, onNavigate }: {
  partner: PartnerWithMetrics;
  onEdit: (c: Partner) => void;
  onDelete: (c: Partner) => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <Card className="p-4">
        <div className="flex items-start justify-between">
            <div className="space-y-2">
                <h3 className="font-medium">{partner.firstname} {partner.lastname}</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>📧 {partner.email || 'N/A'}</p>
                    <p>📞 {partner.phone || 'N/A'}</p>
                    <p>🚗 Vehículos: {partner.vehicleCount || 0}</p>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/partners/${partner.id}`)}>Ver Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onEdit(partner)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDelete(partner)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </Card>
  );
}

export default function PartnersPage() {
    const { partners, companies, vehicles, financialRecords, addPartner, updatePartner, deletePartner, loadingData, refreshData, partnerBalances } = useData();
    const { currentUser } = useAuth();
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);

    const canManage = currentUser?.role === 'superAdmin' || currentUser?.role === 'admin';
    
    const { partnerMetrics } = usePartnerAnalytics(partners, vehicles, financialRecords);

    const partnersWithMetrics = useMemo(() => {
        const metricsMap = new Map(partnerMetrics.map(m => [m.partnerId, m]));
        return partners.map(partner => ({
            ...partner,
            ...metricsMap.get(partner.id),
        }));
    }, [partners, partnerMetrics]);

    const { 
        filters,
        filteredPartners,
        updateFilter,
        resetFilters,
        debouncedSetQuery,
        totalResults
     } = usePartnerSearch(partnersWithMetrics);

    const handleOpenModal = useCallback((partner?: Partner) => {
        if (!canManage) {
            sonnerToast.error("Sin Permisos", { description: "Solo administradores pueden gestionar socios." });
            return;
        }
        setEditingPartner(partner || null);
        setIsModalOpen(true);
    }, [canManage]);

    const handleCloseModal = useCallback(() => {
        if (isSubmitting) return;
        // Primero cerrar el modal
        setIsModalOpen(false);
        // Resetear el estado DESPUÉS de que la animación de cierre termine
        setTimeout(() => {
            setEditingPartner(null);
        }, 300);
    }, [isSubmitting]);

    const handleSubmit = async (data: PartnerFormValues) => {
        if (!canManage) return;

        setIsSubmitting(true);
        const toastId = sonnerToast.loading(editingPartner ? "Actualizando socio..." : "Agregando socio...");

        try {
            const payload = {
                ...data,
                companyId: data.companyId ?? currentUser?.companyId,
            };

            if (editingPartner) {
                await updatePartner(editingPartner.id, payload);
                sonnerToast.success("Socio Actualizado", { id: toastId });
            } else {
                await addPartner(payload as Omit<Partner, 'id'|'isDeleted'|'createdAt'>);
                sonnerToast.success("Socio Agregado", { id: toastId });
            }
            refreshData();
            handleCloseModal();
        } catch (error) {
            console.error(error);
            sonnerToast.error("Error", { id: toastId, description: error instanceof Error ? error.message : "Error al guardar el socio." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRequest = useCallback((partner: Partner) => {
        if (!canManage) return;

        const isPartnerInUse = vehicles.some(v => v.partnerId === partner.id && !v.isDeleted);
        if (isPartnerInUse) {
            sonnerToast.error("Socio en uso", {
                description: "Este socio tiene vehículos asignados y no puede ser eliminado."
            });
            return;
        }
        setPartnerToDelete(partner);
        setIsDeleteDialogOpen(true);
    }, [canManage, vehicles]);

    const handleDeleteConfirm = async () => {
        if (!partnerToDelete || !canManage) return;

        setIsSubmitting(true);
        const toastId = sonnerToast.loading("Eliminando socio...");

        try {
            await deletePartner(partnerToDelete.id);
            sonnerToast.success("Socio Eliminado", { id: toastId });
            setPartnerToDelete(null);
            setIsDeleteDialogOpen(false);
            refreshData();
        } catch (error) {
            console.error(error);
            sonnerToast.error("Error", { id: toastId, description: "No se pudo eliminar el socio." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = useMemo(() => getColumns(handleOpenModal, handleDeleteRequest), [handleOpenModal, handleDeleteRequest]);
    
    const partnerBalanceData = useMemo(() => {
        return partnerBalances.map(pb => {
            const partner = partners.find(p => p.id === pb.id);
            return {
                id: pb.id,
                name: partner ? `${partner.firstname} ${partner.lastname}` : 'Desconocido',
                balance: pb.balance
            };
        });
    }, [partnerBalances, partners]);

    if (loadingData && !partners.length) {
        return <p>Cargando socios...</p>;
    }
    
    return (
        <div className="space-y-6">
            <PartnerDashboard partners={partners} partnerMetrics={partnerMetrics} onBalanceCardClick={() => setIsBalanceModalOpen(true)} />
            <PartnerAdvancedFilters 
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
                    <div className="flex justify-between items-center">
                        <CardTitle>Socios de la Flota</CardTitle>
                        {canManage && (
                            <Button onClick={() => handleOpenModal()}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Socio
                            </Button>
                        )}
                    </div>
                    <CardDescription>
                        Administra a los propietarios de los vehículos de tu flota.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveTable
                        data={filteredPartners}
                        columns={columns}
                        loading={loadingData}
                        searchPlaceholder="Buscar socio..."
                        noResultsText="No se encontraron socios."
                        mobileCardRenderer={(partner) => (
                          <PartnerMobileCard 
                            partner={partner}
                            onEdit={handleOpenModal}
                            onDelete={handleDeleteRequest}
                            onNavigate={(path) => router.push(path)}
                          />
                        )}
                    />
                </CardContent>
            </Card>
            
            <PartnerBalancesModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                balances={partnerBalanceData}
            />

            <FormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingPartner ? 'Editar Socio' : 'Agregar Socio'}
                description={editingPartner ? 'Actualiza los detalles del socio.' : 'Añade un nuevo socio a la flota.'}
            >
                <PartnerForm
                    key={editingPartner?.id || 'new-partner'}
                    onSubmit={handleSubmit}
                    initialData={editingPartner}
                    companies={companies}
                    isSubmitting={isSubmitting}
                    onClose={handleCloseModal}
                />
            </FormModal>

            <DeleteConfirmationDialog
                isOpen={!!partnerToDelete}
                onClose={() => setPartnerToDelete(null)}
                onConfirm={handleDeleteConfirm}
                itemName={`${partnerToDelete?.firstname} ${partnerToDelete?.lastname}`}
                isDeleting={isSubmitting}
            />
        </div>
    );
}
