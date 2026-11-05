
"use client";
import { Skeleton } from "@/components/ui/skeleton";

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Partner } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { getColumns } from './columns';
import { FormModal } from '@/components/common/form-modal';
import { PartnerForm, type PartnerFormValues } from './components/partner-form';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { toast as sonnerToast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { usePartnerAnalytics, type PartnerMetric } from '@/hooks/use-partner-analytics';
import { PartnerDashboard } from './components/partner-dashboard';
import { usePartnerSearch } from '@/hooks/use-partner-search';
import { PartnerBalancesModal } from './components/partner-balances-modal';
import { PartnerMobileCard } from './components/partner-mobile-card';

export type PartnerWithMetrics = Partner & Partial<PartnerMetric>;

export default function PartnersPage() {
    const { partners, companies, vehicles, financialRecords, addPartner, updatePartner, deletePartner, loadingData, refreshData, partnerBalances } = useData();
    const { currentUser } = useAuth();
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
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
        setIsModalOpen(false);
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
    }, [canManage, vehicles]);

    const handleDeleteConfirm = async () => {
        if (!partnerToDelete || !canManage) return;

        setIsSubmitting(true);
        const toastId = sonnerToast.loading("Eliminando socio...");

        try {
            await deletePartner(partnerToDelete.id);
            sonnerToast.success("Socio Eliminado", { id: toastId });
            setPartnerToDelete(null);
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
        return (
          <div className="space-y-4 p-4 sm:p-6">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-[14px]" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-[14px]" />
          </div>
        );
    }
    
    return (
        <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
            <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

            <div className="relative z-10 space-y-5 sm:space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
                            Operación
                        </div>
                        <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                            Socios
                        </h1>
                        <p className="mt-1 text-sm text-white/40">
                            {totalResults} en esta vista
                        </p>
                    </div>
                    {canManage && (
                        <Button
                            onClick={() => handleOpenModal()}
                            className="h-11 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
                            Agregar socio
                        </Button>
                    )}
                </header>

                <PartnerDashboard
                    partners={partners}
                    partnerMetrics={partnerMetrics}
                    onBalanceCardClick={() => setIsBalanceModalOpen(true)}
                />

                <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
                    <div className="p-4 sm:p-5">
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
                    </div>
                </section>
            </div>
            
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
