"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Loader2,
  Building2,
  History,
} from 'lucide-react';
import { useData } from '@/hooks/use-data';
import type { Company } from '@/types';
import { FormModal } from '@/components/common/form-modal';
import { CompanyForm, type CompanyFormValues } from './components/company-form';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { getColumns } from './columns';
import { useAuth } from '@/contexts/auth-provider';
import { useStorage } from '@/hooks/use-storage';
import { toast } from 'sonner';
import { CompanyStats } from './components/company-stats';
import { useCompanySearch } from '@/hooks/use-company-search';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { sanitizeAndFormatData } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

interface CompanyWithMetrics extends Company {
  vehicleCount?: number;
  userCount?: number;
}

function CompanyMobileCard({
  company,
  onEdit,
  onDelete,
}: {
  company: CompanyWithMetrics;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  const router = useRouter();
  const limitLabel =
    typeof company.vehicleLimit === 'number' ? String(company.vehicleLimit) : '∞';

  return (
    <article className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.2)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
          <Building2 className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-base font-semibold text-white">
                {company.name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-white/45">
                {company.email || 'Sin correo'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/60">
                  {company.vehicleCount || 0} / {limitLabel} vehículos
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/60">
                  {company.userCount || 0} usuarios
                </span>
                {!company.contractTemplateUrl && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Sin contrato
                  </span>
                )}
              </div>
              {company.phone && (
                <p className="mt-2 text-xs text-white/40">{company.phone}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuItem onSelect={() => onEdit(company)}>
                  <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push(`/dashboard/companies/${company.id}/history`)}
                >
                  <History className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                  Historial
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDelete(company)}
                  className="text-rose-400 focus:bg-rose-500/15 focus:text-rose-300"
                >
                  <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CompaniesPage() {
  const {
    companies,
    users,
    vehicles,
    addCompany,
    updateCompany,
    deleteCompany,
    loadingData,
    refreshData,
  } = useData();
  const { currentUser } = useAuth();
  const { uploadFile, deleteFileByUrl } = useStorage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{ key: string; value: any } | null>(null);

  const canManageCompanies = currentUser?.role === 'superAdmin';

  const companyMetrics = useMemo(() => {
    const metrics: Record<string, { vehicleCount: number; userCount: number }> = {};
    companies.forEach(c => {
      metrics[c.id] = { vehicleCount: 0, userCount: 0 };
    });

    vehicles.forEach(v => {
      if (v.companyId && metrics[v.companyId] && !v.isDeleted) {
        metrics[v.companyId].vehicleCount++;
      }
    });

    users.forEach(u => {
      if (u.companyId && metrics[u.companyId] && !u.isDeleted) {
        metrics[u.companyId].userCount++;
      }
    });

    return metrics;
  }, [companies, vehicles, users]);

  const activeCompanies = useMemo(
    () =>
      companies
        .filter(c => !c.isDeleted)
        .map(c => ({
          ...c,
          ...companyMetrics[c.id],
        })),
    [companies, companyMetrics]
  );

  const {
    filters,
    filteredCompanies,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults,
  } = useCompanySearch(activeCompanies, companyMetrics);

  const handleCardClick = (filterKey: 'contractStatus' | 'status', filterValue: any) => {
    setActiveFilter({ key: filterKey, value: filterValue });
    if (filterKey === 'contractStatus') {
      updateFilter('contractStatus', filterValue);
    }
  };

  const handleOpenModal = useCallback(
    (company?: Company) => {
      if (!canManageCompanies) {
        toast.error('Sin permisos', {
          description: 'Solo los Super Administradores pueden gestionar empresas.',
        });
        return;
      }
      setEditingCompany(company || null);
      setIsModalOpen(true);
    },
    [canManageCompanies]
  );

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setTimeout(() => setEditingCompany(null), 300);
  }, [isSubmitting]);

  const handleSubmit = async (data: CompanyFormValues) => {
    if (!canManageCompanies) return;

    setIsSubmitting(true);
    const toastId = toast.loading(
      editingCompany ? 'Actualizando empresa...' : 'Agregando empresa...'
    );

    try {
      let supabaseQuery = supabase
        .from('companies')
        .select('id')
        .eq('name', data.name)
        .eq('is_deleted', false);
      if (editingCompany) {
        supabaseQuery = supabaseQuery.neq('id', editingCompany.id);
      }
      const { data: existingCompanies, error: queryError } = await supabaseQuery;

      if (queryError) throw queryError;
      if (existingCompanies && existingCompanies.length > 0) {
        throw new Error('Ya existe una empresa con este nombre.');
      }

      const oldContractUrl = editingCompany?.contractTemplateUrl;
      let newContractUrl: string | undefined | null = editingCompany?.contractTemplateUrl;

      const fileField = data.contractTemplateUrl;

      if (Array.isArray(fileField)) {
        if (fileField.length > 0) {
          const file = fileField[0];
          if (file instanceof File) {
            newContractUrl = await uploadFile(file, 'contract_templates');
          } else if (typeof file === 'string') {
            newContractUrl = file;
          }
        } else if (oldContractUrl) {
          newContractUrl = null;
        }
      }

      const { contractTemplateUrl, ...restOfData } = data;
      const companyPayload = {
        ...sanitizeAndFormatData(restOfData),
        contractTemplateUrl: newContractUrl,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, companyPayload);
      } else {
        await addCompany({
          ...companyPayload,
          isDeleted: false,
          createdAt: new Date().toISOString(),
        } as Omit<Company, 'id'>);
      }

      toast.success(editingCompany ? 'Empresa actualizada' : 'Empresa agregada', {
        id: toastId,
        description: `${data.name} ha sido ${editingCompany ? 'actualizada' : 'agregada'}.`,
      });

      if (oldContractUrl && oldContractUrl !== newContractUrl) {
        await deleteFileByUrl(oldContractUrl).catch(err => {
          console.warn('Failed to delete old contract file:', err);
        });
      }

      await refreshData();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        id: toastId,
        description:
          error instanceof Error ? error.message : 'Error al guardar la empresa.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = useCallback(
    (company: Company) => {
      if (!canManageCompanies) return;
      setCompanyToDelete(company);
      setIsDeleteDialogOpen(true);
    },
    [canManageCompanies]
  );

  const handleCloseDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsDeleteDialogOpen(false);
    setTimeout(() => setCompanyToDelete(null), 300);
  }, [isSubmitting]);

  const handleDeleteConfirm = async () => {
    if (!companyToDelete || !canManageCompanies) return;

    const metrics = companyMetrics[companyToDelete.id];
    if (metrics && (metrics.vehicleCount > 0 || metrics.userCount > 0)) {
      toast.error('No se puede eliminar', {
        description: `La empresa tiene ${metrics.vehicleCount} vehículo(s) y ${metrics.userCount} usuario(s) activos. Reasigna estos datos primero.`,
      });
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Eliminando empresa...');

    try {
      if (companyToDelete.contractTemplateUrl) {
        await deleteFileByUrl(companyToDelete.contractTemplateUrl).catch(console.warn);
      }

      await deleteCompany(companyToDelete.id);

      toast.success('Empresa eliminada', {
        id: toastId,
        description: `${companyToDelete.name} ha sido marcada como eliminada.`,
      });
      await refreshData();
      handleCloseDeleteDialog();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        id: toastId,
        description: 'No se pudo eliminar la empresa.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    const dataToExport = filteredCompanies.map(c => ({
      Nombre: c.name,
      Email: c.email || 'N/A',
      Teléfono: c.phone || 'N/A',
      Ciudad: c.city || 'N/A',
      Estado: c.state || 'N/A',
      Vehículos: companyMetrics[c.id]?.vehicleCount || 0,
      Límite: c.vehicleLimit ?? '∞',
      Usuarios: companyMetrics[c.id]?.userCount || 0,
      'Tiene Contrato': c.contractTemplateUrl ? 'Sí' : 'No',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    XLSX.writeFile(wb, `empresas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Empresas exportadas a Excel.');
  };

  const columns = useMemo(
    () => getColumns(handleOpenModal, handleDeleteRequest, companyMetrics),
    [handleOpenModal, handleDeleteRequest, companyMetrics]
  );

  if (loadingData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  if (!canManageCompanies) {
    return (
      <div className="relative min-h-full overflow-hidden rounded-[30px] bg-[#080a0f] p-6 text-white">
        <div className="mx-auto max-w-md rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
            <Building2 className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-lg font-semibold">Sin permisos</h2>
          <p className="mt-2 text-sm text-white/50">
            Solo los Super Administradores pueden acceder al módulo de empresas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Administración
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Empresas
            </h1>
            <p className="mt-1 text-sm text-white/45">
              Límites de flota, contratos y empresas registradas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredCompanies.length === 0}
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Download className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Exportar
            </Button>
            <Button
              onClick={() => handleOpenModal()}
              className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Agregar empresa
            </Button>
          </div>
        </header>

        <CompanyStats
          companies={activeCompanies}
          companyMetrics={companyMetrics}
          onCardClick={handleCardClick}
        />

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-3 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
                Listado
              </p>
              <h2 className="text-base font-semibold text-white">Empresas registradas</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-white/50">
              {totalResults} resultado{totalResults !== 1 ? 's' : ''}
            </span>
          </div>
          <ResponsiveTable
            columns={columns}
            data={filteredCompanies}
            loading={loadingData}
            searchPlaceholder="Buscar por nombre, correo, teléfono..."
            noResultsText="No se encontraron empresas."
            mobileCardRenderer={company => (
              <CompanyMobileCard
                company={company}
                onEdit={handleOpenModal}
                onDelete={handleDeleteRequest}
              />
            )}
          />
        </section>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCompany ? 'Editar empresa' : 'Agregar empresa'}
        description={
          editingCompany
            ? 'Actualiza los detalles de la empresa.'
            : 'Completa el formulario para añadir una nueva empresa.'
        }
      >
        <CompanyForm
          key={editingCompany?.id || 'new-company'}
          onSubmit={handleSubmit}
          initialData={editingCompany}
          isSubmitting={isSubmitting}
          onClose={handleCloseModal}
          companies={companies}
          currentVehicleCount={
            editingCompany ? companyMetrics[editingCompany.id]?.vehicleCount : 0
          }
        />
      </FormModal>

      {companyToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleDeleteConfirm}
          itemName={companyToDelete.name}
          isDeleting={isSubmitting}
          titleText="¿Confirmar eliminación?"
          descriptionText={
            `Esta acción marcará a la empresa ${companyToDelete.name} como eliminada. ` +
            `Se puede revertir, pero los usuarios asignados perderán acceso a sus datos.`
          }
          confirmText="Eliminar"
        />
      )}
    </div>
  );
}
