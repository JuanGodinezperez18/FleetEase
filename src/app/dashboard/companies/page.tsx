

"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Download } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import type { Company } from '@/types';
import { FormModal } from '@/components/common/form-modal';
import { CompanyForm, type CompanyFormValues } from './components/company-form';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getColumns } from './columns';
import { useAuth } from '@/contexts/auth-provider';
import { useStorage } from '@/hooks/use-storage';
import { toast } from 'sonner';
import { CompanyStats } from './components/company-stats';
import { useCompanySearch } from '@/hooks/use-company-search';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { sanitizeAndFormatData } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface CompanyWithMetrics extends Company {
  vehicleCount?: number;
  userCount?: number;
}

// React 19: No memo() needed - compiler handles optimization
function CompanyMobileCard({ company, onEdit, onDelete }: {
  company: CompanyWithMetrics;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  return (
    <Card className="p-4">
        <div className="flex items-start justify-between">
            <div className="space-y-2">
                <h3 className="font-medium">{company.name}</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>📧 {company.email || 'N/A'}</p>
                    <p>📞 {company.phone || 'N/A'}</p>
                    <p>🚗 Vehículos: {company.vehicleCount || 0} / {company.vehicleLimit || '∞'}</p>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEdit(company)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDelete(company)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </Card>
  );
}


export default function CompaniesPage() {
  const { companies, users, vehicles, addCompany, updateCompany, deleteCompany, loadingData, refreshData } = useData();
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
        if(u.companyId && metrics[u.companyId] && !u.isDeleted) {
            metrics[u.companyId].userCount++;
        }
    });

    return metrics;
  }, [companies, vehicles, users]);
  
  const activeCompanies = useMemo(() => 
    companies.filter(c => !c.isDeleted).map(c => ({
        ...c,
        ...companyMetrics[c.id]
    })), 
    [companies, companyMetrics]
  );
  
  const {
    filters,
    filteredCompanies,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults
  } = useCompanySearch(activeCompanies, companyMetrics);

  const handleCardClick = (filterKey: 'contractStatus' | 'status', filterValue: any) => {
    setActiveFilter({ key: filterKey, value: filterValue });
    if (filterKey === 'contractStatus') {
      updateFilter('contractStatus', filterValue);
    }
  };

  const handleOpenModal = useCallback((company?: Company) => {
    if (!canManageCompanies) {
      toast.error("Sin Permisos", {
        description: "Solo los Super Administradores pueden gestionar empresas."
      });
      return;
    }
    setEditingCompany(company || null);
    setIsModalOpen(true);
  }, [canManageCompanies]);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    // Primero cerrar el modal
    setIsModalOpen(false);
    // Resetear el estado DESPUÉS de que la animación de cierre termine
    setTimeout(() => {
      setEditingCompany(null);
    }, 300);
  }, [isSubmitting]);

  const handleSubmit = async (data: CompanyFormValues) => {
    if (!canManageCompanies) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading(editingCompany ? "Actualizando empresa..." : "Agregando empresa...");
    
    try {
      // Check for duplicate name before submitting using Supabase
      let supabaseQuery = supabase.from('companies').select('id').eq('name', data.name).eq('is_deleted', false);
      if (editingCompany) {
        supabaseQuery = supabaseQuery.neq('id', editingCompany.id);
      }
      const { data: existingCompanies, error: queryError } = await supabaseQuery;
      
      if (queryError) throw queryError;
      if (existingCompanies && existingCompanies.length > 0) {
        throw new Error("Ya existe una empresa con este nombre.");
      }

      const oldContractUrl = editingCompany?.contractTemplateUrl;
      let newContractUrl: string | undefined | null = editingCompany?.contractTemplateUrl;
      
      const fileField = data.contractTemplateUrl;

      // 1. Handle file upload/removal
      if (Array.isArray(fileField)) {
        if (fileField.length > 0) {
            const file = fileField[0];
            if (file instanceof File) {
                // New file was uploaded, upload it first
                newContractUrl = await uploadFile(file, 'contract_templates');
            } else if (typeof file === 'string') {
                // It's the existing URL, no change needed
                newContractUrl = file;
            }
        } else if (oldContractUrl) {
            // File was removed
            newContractUrl = null;
        }
      }
      
      const { contractTemplateUrl, ...restOfData } = data;
      const companyPayload = { ...sanitizeAndFormatData(restOfData), contractTemplateUrl: newContractUrl };
      
      // 2. Save data to Supabase (handled by companyService which now includes audit)
      if (editingCompany) {
        await updateCompany(editingCompany.id, companyPayload);
      } else {
        await addCompany({
          ...companyPayload,
          isDeleted: false,
          createdAt: new Date().toISOString()
        } as Omit<Company, 'id'>);
      }

      toast.success(editingCompany ? "Empresa Actualizada" : "Empresa Agregada", {
        id: toastId,
        description: `${data.name} ha sido ${editingCompany ? 'actualizada' : 'agregada'}.`
      });

      // 3. Delete old file only after successful save
      if (oldContractUrl && oldContractUrl !== newContractUrl) {
          await deleteFileByUrl(oldContractUrl).catch(err => {
              console.warn("Failed to delete old contract file, but operation succeeded:", err);
          });
      }
      
      await refreshData();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        id: toastId,
        description: error instanceof Error ? error.message : "Error al guardar la empresa."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = useCallback((company: Company) => {
    if (!canManageCompanies) return;
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  }, [canManageCompanies]);
  
  const handleCloseDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsDeleteDialogOpen(false);
    setTimeout(() => setCompanyToDelete(null), 300);
  }, [isSubmitting]);

  const handleDeleteConfirm = async () => {
    if (!companyToDelete || !canManageCompanies) return;
    
    // Verificar si tiene datos asociados
    const metrics = companyMetrics[companyToDelete.id];
    if (metrics && (metrics.vehicleCount > 0 || metrics.userCount > 0)) {
      toast.error('No se puede eliminar', {
        description: `La empresa tiene ${metrics.vehicleCount} vehículo(s) y ${metrics.userCount} usuario(s) activos. Elimine o reasigne estos datos primero.`
      });
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Eliminando empresa...");
    
    try {
      // Eliminar contrato si existe
      if (companyToDelete.contractTemplateUrl) {
        await deleteFileByUrl(companyToDelete.contractTemplateUrl).catch(console.warn);
      }
      
      await deleteCompany(companyToDelete.id);
      
      toast.success("Empresa Eliminada", {
        id: toastId,
        description: `${companyToDelete.name} ha sido marcada como eliminada.`
      });
      await refreshData();
      handleCloseDeleteDialog();
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        id: toastId,
        description: "No se pudo eliminar la empresa."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    const dataToExport = filteredCompanies.map(c => ({
      'Nombre': c.name,
      'Email': c.email || 'N/A',
      'Teléfono': c.phone || 'N/A',
      'Ciudad': c.city || 'N/A',
      'Estado': c.state || 'N/A',
      'Vehículos': companyMetrics[c.id]?.vehicleCount || 0,
      'Límite': c.vehicleLimit ?? '∞',
      'Usuarios': companyMetrics[c.id]?.userCount || 0,
      'Tiene Contrato': c.contractTemplateUrl ? 'Sí' : 'No',
    }));
    
    // Usar librería xlsx para exportar
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    XLSX.writeFile(wb, `empresas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const columns = useMemo(
    () => getColumns(handleOpenModal, handleDeleteRequest, companyMetrics), 
    [handleOpenModal, handleDeleteRequest, companyMetrics]
  );

  if (loadingData) {
    return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando empresas...</p>
          </div>
        </div>
    );
  }

  if (!canManageCompanies) {
    return (
        <Card>
          <CardHeader>
            <CardTitle>Sin Permisos</CardTitle>
            <CardDescription>
              Solo los usuarios Super Administradores pueden acceder a este módulo.
            </CardDescription>
          </CardHeader>
        </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <CompanyStats companies={activeCompanies} companyMetrics={companyMetrics} onCardClick={handleCardClick} />
        
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <CardTitle>Empresas Registradas</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Empresas
                </Button>
                <Button onClick={() => handleOpenModal()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> 
                  Agregar Empresa
                </Button>
              </div>
            </div>
            <CardDescription>
              Agregue, edite o elimine empresas. Defina límites de vehículos y gestione plantillas de contrato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              columns={columns}
              data={filteredCompanies}
              loading={loadingData}
              searchPlaceholder="Buscar por nombre, correo, teléfono..."
              noResultsText="No se encontraron empresas."
              mobileCardRenderer={(company) => (
                <CompanyMobileCard 
                    company={company}
                    onEdit={handleOpenModal}
                    onDelete={handleDeleteRequest}
                />
              )}
            />
          </CardContent>
        </Card>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCompany ? 'Editar Empresa' : 'Agregar Nueva Empresa'}
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
          currentVehicleCount={editingCompany ? companyMetrics[editingCompany.id]?.vehicleCount : 0}
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
            `Esta acción se puede revertir, pero los usuarios asignados a esta empresa perderán el acceso a sus datos.`
          }
          confirmText="Eliminar"
        />
      )}
    </>
  );
}



