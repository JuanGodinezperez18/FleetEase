
"use client";

import React, { useState, useMemo, useCallback, useRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Wand2 } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import type { FinancialCategory, Company } from '@/types';
import { DataTable } from '@/components/common/data-table';
import { FormModal } from '@/components/common/form-modal';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-provider';
import { toast as sonnerToast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';

const baseCategorySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  type: z.enum(['income', 'expense', 'payment'], { required_error: "Debe seleccionar un tipo." }),
  affects: z.enum(['client_balance', 'partner_balance', 'none'], { required_error: "Debe seleccionar a quién afecta." }),
  description: z.string().optional(),
  companyId: z.string().optional().nullable(),
});

type CategoryFormValues = z.infer<typeof baseCategorySchema>;
interface CategoryFormHandles { submit: () => void; }

const affectsOptions: { value: FinancialCategory['affects']; label: string }[] = [
    { value: 'client_balance', label: 'Balance de Cliente' },
    { value: 'partner_balance', label: 'Balance de Socio' },
    { value: 'none', label: 'Ninguno / Contabilidad Interna' }
];

const CategoryForm = React.forwardRef<CategoryFormHandles, { onSubmit: (data: CategoryFormValues) => void; initialData?: FinancialCategory | null, companies: Company[] }>(({ onSubmit, initialData, companies }, ref) => {
  const { currentUser } = useAuth();
  const { financialCategories } = useData();

  const categorySchema = useMemo(() => {
    return baseCategorySchema.superRefine((data, ctx) => {
      if (currentUser?.role === 'superAdmin' && !data.companyId && !initialData?.isDefault) { // Allow default categories to have no companyId
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Como Super Admin, debe seleccionar una empresa para categorías no globales.",
          path: ["companyId"],
        });
      }

      // Validación de duplicados
      const duplicateExists = financialCategories.some(cat => 
        cat.name.toLowerCase() === data.name.toLowerCase() &&
        cat.companyId === data.companyId &&
        cat.id !== initialData?.id // Excluir si estamos editando la misma categoría
      );
      
      if (duplicateExists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ya existe una categoría con este nombre en esta empresa.",
          path: ["name"],
        });
      }
    });
  }, [currentUser?.role, financialCategories, initialData]);
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'expense',
      affects: initialData?.affects || 'none',
      description: initialData?.description || '',
      companyId: initialData?.companyId || currentUser?.companyId || null,
    },
  });

  React.useEffect(() => {
      if (!form.getValues('companyId') && currentUser?.role !== 'superAdmin' && currentUser?.companyId) {
          form.setValue('companyId', currentUser.companyId);
      }
  }, [currentUser, form]);

  useImperativeHandle(ref, () => ({
    submit: form.handleSubmit(onSubmit),
  }));

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {currentUser?.role === 'superAdmin' && (
            <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={initialData?.isDefault}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar empresa (o dejar en blanco para 'Global')" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="">Global (para todas las empresas)</SelectItem>
                            {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre de la Categoría</FormLabel>
            <FormControl><Input {...field} placeholder="Ej: Mantenimiento Especial" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="payment">Pago</SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="affects" render={({ field }) => (
            <FormItem>
              <FormLabel>Afecta a</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar a quién afecta..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {affectsOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción (Opcional)</FormLabel>
            <FormControl><Textarea {...field} placeholder="Describe para qué se usa esta categoría y cómo afecta los saldos." /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </form>
    </Form>
  );
});
CategoryForm.displayName = "CategoryForm";


export default function CategoriesPage() {
  const { financialCategories, addFinancialCategory, updateFinancialCategory, deleteFinancialCategory, financialRecords, loadingData, companies, refreshData } = useData();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FinancialCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<CategoryFormHandles>(null);

  const canManage = currentUser?.role === 'superAdmin' || currentUser?.role === 'admin';

  const handleOpenModal = useCallback((category?: FinancialCategory) => {
    if (!canManage) return;
    setEditingCategory(category || null);
    setIsModalOpen(true);
  }, [canManage]);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    // Primero cerrar el modal
    setIsModalOpen(false);
    // Resetear el estado DESPUÉS de que la animación de cierre termine
    setTimeout(() => {
      setEditingCategory(null);
    }, 300);
  }, [isSubmitting]);

  const handleSubmit = async (data: CategoryFormValues) => {
    if (!canManage) return;
    setIsSubmitting(true);
    const toastId = sonnerToast.loading(editingCategory ? "Actualizando..." : "Creando...");
    try {
      const payload: Partial<Omit<FinancialCategory, 'id'>> = {
          name: data.name,
          type: data.type,
          affects: data.affects,
          description: data.description || undefined,
          companyId: data.companyId || currentUser?.companyId,
      };

      if (editingCategory) {
        await updateFinancialCategory(editingCategory.id, payload);
        sonnerToast.success("Categoría Actualizada", { id: toastId });
      } else {
        await addFinancialCategory(payload as Omit<FinancialCategory, 'id'>);
        sonnerToast.success("Categoría Creada", { id: toastId });
      }
      await refreshData();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "No se pudo guardar la categoría.";
      sonnerToast.error("Error al Guardar", { id: toastId, description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDefaultCategories = async () => {
    if (currentUser?.role !== 'superAdmin') return;
    
    setIsSubmitting(true);
    const toastId = sonnerToast.loading("Verificando y creando categorías de sistema...");

    try {
        const defaultCategoriesToCreate = [
            { name: 'Gasto por Administración', type: 'expense', affects: 'partner_balance', description: 'Comisión de la empresa por administrar la flota del socio.' },
            { name: 'Pérdida / Cuentas Incobrables', type: 'expense', affects: 'none', description: 'Para registrar deudas de clientes que no se pudieron cobrar.' },
        ];
        
        const existingNames = new Set(financialCategories.filter(c => c.isDefault).map(c => c.name));
        const categoriesToAdd = defaultCategoriesToCreate.filter(c => !existingNames.has(c.name));

        if (categoriesToAdd.length === 0) {
            sonnerToast.success("Categorías Verificadas", { id: toastId, description: "Todas las categorías de sistema ya existen." });
            return;
        }

        const addPromises = categoriesToAdd.map(cat => addFinancialCategory({
            ...cat,
            isDefault: true,
            companyId: null
        } as Omit<FinancialCategory, 'id'>));

        await Promise.all(addPromises);
        
        sonnerToast.success("Categorías Creadas", { id: toastId, description: `${categoriesToAdd.length} nueva(s) categoría(s) de sistema han sido creadas.` });
        await refreshData();

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "No se pudo completar la operación.";
        sonnerToast.error("Error al Crear Categorías", { id: toastId, description: errorMessage });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDeleteRequest = useCallback((category: FinancialCategory) => {
    if (!canManage || category.isDefault) {
      sonnerToast.warning("Acción no permitida", { description: "Las categorías por defecto no se pueden eliminar." });
      return;
    };
    
    const usageCount = financialRecords.filter(
      record => record.categoryId === category.id && !record.isDeleted
    ).length;
    
    if (usageCount > 0) {
      sonnerToast.error("Categoría en uso", {
        description: `Esta categoría está siendo usada en ${usageCount} registro(s) financiero(s) y no puede ser eliminada. Por favor, reasigne los registros a otra categoría antes de intentar eliminarla.`,
        duration: 8000,
      });
      return;
    }

    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  }, [canManage, financialRecords]);

  const handleCloseDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  }, [isSubmitting]);

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete || !canManage) return;
    setIsSubmitting(true);
    const toastId = sonnerToast.loading("Eliminando categoría...");
    try {
      await deleteFinancialCategory(categoryToDelete.id);
      sonnerToast.success("Categoría Eliminada", { id: toastId });
      await refreshData();
      handleCloseDeleteDialog();
    } catch (error) {
      console.error(error);
      sonnerToast.error("Error al eliminar", { id: toastId, description: "No se pudo eliminar la categoría." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<FinancialCategory>[] = useMemo(() => [
    { 
      accessorKey: 'name', 
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      )
    },
    { 
      accessorKey: 'type', 
      header: 'Tipo', 
      cell: ({ row }) => <Badge variant={row.original.type === 'income' ? 'default' : (row.original.type === 'payment' ? 'secondary' : 'destructive')} className={
        row.original.type === 'income' ? 'bg-green-100 text-green-800' :
        row.original.type === 'payment' ? 'bg-blue-100 text-blue-800' :
        'bg-red-100 text-red-800'
      }>{row.original.type.charAt(0).toUpperCase() + row.original.type.slice(1)}</Badge> 
    },
    { 
      accessorKey: 'affects', 
      header: 'Afecta Balance', 
      cell: ({ row }) => {
        const affectLabel = affectsOptions.find(opt => opt.value === row.original.affects)?.label || 'N/A';
        return <Badge variant="outline">{affectLabel}</Badge>;
    }},
    { 
      accessorKey: 'description', 
      header: 'Descripción', 
      cell: ({row}) => <span className="text-xs text-muted-foreground">{row.original.description}</span> 
    },
    { 
      accessorKey: 'isDefault', 
      header: 'Sistema', 
      cell: ({ row }) => row.original.isDefault ? <Badge variant="outline">Sí</Badge> : 'No' 
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const category = row.original;
        if(category.isDefault || !canManage) return null;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenModal(category)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteRequest(category)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }
  ], [handleOpenModal, handleDeleteRequest, canManage]);

  if (loadingData && !financialCategories.length) {
    return <p>Cargando categorías...</p>;
  }

  if (!canManage) {
    return (
        <Card><CardHeader><CardTitle>Sin Permisos</CardTitle><CardDescription>No tienes permiso para gestionar categorías.</CardDescription></CardHeader></Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Categorías Financieras</CardTitle>
              <CardDescription>Crea y gestiona las categorías para los registros financieros de la aplicación.</CardDescription>
            </div>
            <div className="flex gap-2">
              {currentUser?.role === 'superAdmin' && (
                  <Button variant="outline" onClick={handleCreateDefaultCategories} disabled={isSubmitting}>
                      <Wand2 className="mr-2 h-4 w-4" /> Crear Categorías de Sistema
                  </Button>
              )}
              <Button onClick={() => handleOpenModal()}><PlusCircle className="mr-2 h-4 w-4" /> Agregar Categoría</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={financialCategories.sort((a,b) => a.name.localeCompare(b.name))}
            searchPlaceholder="Buscar por nombre..."
            noResultsText="No se encontraron categorías."
            loading={loadingData}
          />
        </CardContent>
      </Card>
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        description="Define los detalles y el comportamiento de la categoría."
      >
        <CategoryForm key={editingCategory?.id || 'new-category'} ref={formRef} onSubmit={handleSubmit} initialData={editingCategory} companies={companies} />
        <DialogFooter className="pt-4">
            <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={() => formRef.current?.submit()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
        </DialogFooter>
      </FormModal>
      {categoryToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleDeleteConfirm}
          itemName={categoryToDelete.name}
          isDeleting={isSubmitting}
          descriptionText={`¿Estás seguro de que quieres eliminar la categoría "${categoryToDelete.name}"? Esta acción no se puede deshacer.`}
        />
      )}
    </>
  );
}
