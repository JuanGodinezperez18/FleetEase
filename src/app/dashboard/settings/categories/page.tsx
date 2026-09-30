"use client";

import React, { useState, useMemo, useCallback, useRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Wand2,
  Tags,
} from 'lucide-react';
import { useData } from '@/hooks/use-data';
import type { FinancialCategory, Company } from '@/types';
import { DataTable } from '@/components/common/data-table';
import { FormModal } from '@/components/common/form-modal';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-provider';
import { toast as sonnerToast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';

const baseCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  type: z.enum(['income', 'expense', 'payment'], {
    required_error: 'Debe seleccionar un tipo.',
  }),
  affects: z.enum(['client_balance', 'partner_balance', 'none'], {
    required_error: 'Debe seleccionar a quién afecta.',
  }),
  description: z.string().optional(),
  companyId: z.string().optional().nullable(),
});

type CategoryFormValues = z.infer<typeof baseCategorySchema>;
interface CategoryFormHandles {
  submit: () => void;
}

const affectsOptions: { value: CategoryFormValues['affects']; label: string }[] = [
  { value: 'client_balance', label: 'Balance de cliente' },
  { value: 'partner_balance', label: 'Balance de socio' },
  { value: 'none', label: 'Ninguno / contabilidad interna' },
];

const TYPE_BADGE: Record<string, string> = {
  income: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  payment: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  expense: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
};

const TYPE_LABEL: Record<string, string> = {
  income: 'Ingreso',
  payment: 'Pago',
  expense: 'Gasto',
};

const inputClass = 'h-[var(--fe-control-height)]';
const labelClass = 'text-xs font-medium text-[var(--fe-text-muted)]';
const selectTriggerClass = 'h-[var(--fe-control-height)]';

const CategoryForm = React.forwardRef<
  CategoryFormHandles,
  {
    onSubmit: (data: CategoryFormValues) => void;
    initialData?: FinancialCategory | null;
    companies: Company[];
  }
>(({ onSubmit, initialData, companies }, ref) => {
  const { currentUser } = useAuth();
  const { financialCategories } = useData();

  const categorySchema = useMemo(() => {
    return baseCategorySchema.superRefine((data, ctx) => {
      if (
        currentUser?.role === 'superAdmin' &&
        !data.companyId &&
        !initialData?.isDefault
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Como Super Admin, debe seleccionar una empresa para categorías no globales.',
          path: ['companyId'],
        });
      }

      const duplicateExists = financialCategories.some(
        cat =>
          cat.name.toLowerCase() === data.name.toLowerCase() &&
          cat.companyId === data.companyId &&
          cat.id !== initialData?.id
      );

      if (duplicateExists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ya existe una categoría con este nombre en esta empresa.',
          path: ['name'],
        });
      }
    });
  }, [currentUser?.role, financialCategories, initialData]);

  const form = useForm<CategoryFormValues, any, CategoryFormValues>({
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
    if (
      !form.getValues('companyId') &&
      currentUser?.role !== 'superAdmin' &&
      currentUser?.companyId
    ) {
      form.setValue('companyId', currentUser.companyId);
    }
  }, [currentUser, form]);

  useImperativeHandle(ref, () => ({
    submit: form.handleSubmit(onSubmit),
  }));

  return (
    <Form {...form}>
      <form onSubmit={e => e.preventDefault()} className="space-y-4">
        {currentUser?.role === 'superAdmin' && (
          <FormField
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Empresa</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ''}
                  disabled={initialData?.isDefault}
                >
                  <FormControl>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Empresa o global" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Global (todas las empresas)</SelectItem>
                    {companies.map(company => (
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Nombre</FormLabel>
              <FormControl>
                <Input
                  className={inputClass}
                  {...field}
                  placeholder="Ej: Mantenimiento especial"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Tipo" />
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
            )}
          />
          <FormField
            control={form.control}
            name="affects"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Afecta a</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Balance" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {affectsOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Descripción (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[80px] rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30"
                  {...field}
                  placeholder="Uso de la categoría y efecto en saldos"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
});
CategoryForm.displayName = 'CategoryForm';

export default function CategoriesPage() {
  const {
    financialCategories,
    addFinancialCategory,
    updateFinancialCategory,
    deleteFinancialCategory,
    financialRecords,
    loadingData,
    companies,
    refreshData,
  } = useData();
  const { currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FinancialCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<CategoryFormHandles>(null);

  const canManage = currentUser?.role === 'superAdmin' || currentUser?.role === 'admin';

  const sortedCategories = useMemo(
    () => [...financialCategories].sort((a, b) => a.name.localeCompare(b.name)),
    [financialCategories]
  );

  const handleOpenModal = useCallback(
    (category?: FinancialCategory) => {
      if (!canManage) return;
      setEditingCategory(category || null);
      setIsModalOpen(true);
    },
    [canManage]
  );

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setTimeout(() => setEditingCategory(null), 300);
  }, [isSubmitting]);

  const handleSubmit = async (data: CategoryFormValues) => {
    if (!canManage) return;
    setIsSubmitting(true);
    const toastId = sonnerToast.loading(editingCategory ? 'Actualizando...' : 'Creando...');
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
        sonnerToast.success('Categoría actualizada', { id: toastId });
      } else {
        await addFinancialCategory(payload as Omit<FinancialCategory, 'id'>);
        sonnerToast.success('Categoría creada', { id: toastId });
      }
      await refreshData();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : 'No se pudo guardar la categoría.';
      sonnerToast.error('Error al guardar', { id: toastId, description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDefaultCategories = async () => {
    if (currentUser?.role !== 'superAdmin') return;

    setIsSubmitting(true);
    const toastId = sonnerToast.loading('Verificando categorías de sistema...');

    try {
      const defaultCategoriesToCreate = [
        {
          name: 'Gasto por Administración',
          type: 'expense' as const,
          affects: 'partner_balance' as const,
          description: 'Comisión de la empresa por administrar la flota del socio.',
        },
        {
          name: 'Pérdida / Cuentas Incobrables',
          type: 'expense' as const,
          affects: 'none' as const,
          description: 'Deudas de clientes que no se pudieron cobrar.',
        },
      ];

      const existingNames = new Set(
        financialCategories.filter(c => c.isDefault).map(c => c.name)
      );
      const categoriesToAdd = defaultCategoriesToCreate.filter(c => !existingNames.has(c.name));

      if (categoriesToAdd.length === 0) {
        sonnerToast.success('Categorías verificadas', {
          id: toastId,
          description: 'Todas las categorías de sistema ya existen.',
        });
        return;
      }

      await Promise.all(
        categoriesToAdd.map(cat =>
          addFinancialCategory({
            ...cat,
            isDefault: true,
            companyId: null,
          } as Omit<FinancialCategory, 'id'>)
        )
      );

      sonnerToast.success('Categorías creadas', {
        id: toastId,
        description: `${categoriesToAdd.length} categoría(s) de sistema creadas.`,
      });
      await refreshData();
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : 'No se pudo completar la operación.';
      sonnerToast.error('Error al crear categorías', {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = useCallback(
    (category: FinancialCategory) => {
      if (!canManage || category.isDefault) {
        sonnerToast.warning('Acción no permitida', {
          description: 'Las categorías por defecto no se pueden eliminar.',
        });
        return;
      }

      const usageCount = financialRecords.filter(
        record => record.categoryId === category.id && !record.isDeleted
      ).length;

      if (usageCount > 0) {
        sonnerToast.error('Categoría en uso', {
          description: `Usada en ${usageCount} registro(s). Reasigna antes de eliminar.`,
          duration: 8000,
        });
        return;
      }

      setCategoryToDelete(category);
      setIsDeleteDialogOpen(true);
    },
    [canManage, financialRecords]
  );

  const handleCloseDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  }, [isSubmitting]);

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete || !canManage) return;
    setIsSubmitting(true);
    const toastId = sonnerToast.loading('Eliminando categoría...');
    try {
      await deleteFinancialCategory(categoryToDelete.id);
      sonnerToast.success('Categoría eliminada', { id: toastId });
      await refreshData();
      handleCloseDeleteDialog();
    } catch (error) {
      console.error(error);
      sonnerToast.error('Error al eliminar', {
        id: toastId,
        description: 'No se pudo eliminar la categoría.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<FinancialCategory>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nombre',
        cell: ({ row }) => (
          <span className="font-medium text-white/90">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[row.original.type] || TYPE_BADGE.expense}`}
          >
            {TYPE_LABEL[row.original.type] || row.original.type}
          </span>
        ),
      },
      {
        accessorKey: 'affects',
        header: 'Afecta',
        cell: ({ row }) => {
          const affectLabel =
            affectsOptions.find(opt => opt.value === row.original.affects)?.label || 'N/A';
          return (
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/60">
              {affectLabel}
            </span>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Descripción',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[240px] text-xs text-white/45">
            {row.original.description || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'isDefault',
        header: 'Sistema',
        cell: ({ row }) =>
          row.original.isDefault ? (
            <span className="rounded-full border border-[#d7ff3f]/20 bg-[#d7ff3f]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d7ff3f]">
              Sí
            </span>
          ) : (
            <span className="text-xs text-white/35">No</span>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const category = row.original;
          if (category.isDefault || !canManage) return null;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 rounded-lg p-0 text-white/40 hover:bg-white/[0.06] hover:text-white"
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6}>
                  <DropdownMenuItem onClick={() => handleOpenModal(category)}>
                    <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteRequest(category)}
                    className="text-rose-400 focus:bg-rose-500/15 focus:text-rose-300"
                  >
                    <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleOpenModal, handleDeleteRequest, canManage]
  );

  if (loadingData && !financialCategories.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[18px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="relative min-h-full overflow-hidden rounded-[18px] bg-[#080a0f] p-6 text-white">
        <div className="mx-auto max-w-md rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
            <Tags className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-lg font-semibold">Sin permisos</h2>
          <p className="mt-2 text-sm text-white/50">
            No tienes permiso para gestionar categorías financieras.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Administración
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Categorías
            </h1>
            <p className="mt-1 text-sm text-white/45">
              Tipos de ingreso, gasto y pago del sistema
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUser?.role === 'superAdmin' && (
              <Button
                variant="outline"
                onClick={handleCreateDefaultCategories}
                disabled={isSubmitting}
                className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <Wand2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                Categorías de sistema
              </Button>
            )}
            <Button
              onClick={() => handleOpenModal()}
              className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Agregar categoría
            </Button>
          </div>
        </header>

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-3 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
                Listado
              </p>
              <h2 className="text-base font-semibold text-white">Categorías financieras</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-white/50">
              {sortedCategories.length} total
            </span>
          </div>
          <DataTable
            columns={columns}
            data={sortedCategories}
            searchPlaceholder="Buscar por nombre..."
            noResultsText="No se encontraron categorías."
            loading={loadingData}
          />
        </section>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
        description="Define el tipo y cómo afecta los saldos."
      >
        <CategoryForm
          key={editingCategory?.id || 'new-category'}
          ref={formRef}
          onSubmit={handleSubmit}
          initialData={editingCategory}
          companies={companies}
        />
        <DialogFooter className="gap-2 border-t border-white/[0.06] pt-4">
          <Button
            variant="outline"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => formRef.current?.submit()}
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
          >
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
            )}
            {isSubmitting ? 'Guardando...' : 'Guardar'}
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
          descriptionText={`¿Eliminar la categoría "${categoryToDelete.name}"? Esta acción no se puede deshacer fácilmente."`}
        />
      )}
    </div>
  );
}
