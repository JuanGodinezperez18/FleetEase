"use client";

import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import type { FinancialRecord, Company, FinancialCategory } from "@/types";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { MultipleFileInput } from "@/components/common/multiple-file-input";
import { infallibleNormalizeDate } from "@/lib/date-utils";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import {Building, PackagePlus, Loader2, Trash2, BadgeDollarSign, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal } from '@/components/common/form-modal';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStorage } from "@/hooks/use-storage";
import { PARTNER_PAYMENT_CATEGORY_ID } from '@/contexts/finance-constants';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAutoSave } from '@/hooks/use-auto-save';
import { useFormKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

const newCategoryValue = "createNewCategory";

// ✅ NUEVO: Schema para líneas de gastos
const expenseLineItemSchema = z.object({
  concept: z.string().min(1, "El concepto es obligatorio."),
  amount: z.coerce.number().positive("El monto debe ser mayor que cero."),
});

const expenseSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria."),
  clientId: z.string().optional().nullable(),
  vehicleId: z.string().min(1, "Debe seleccionar un vehículo."),
  // ✅ NUEVO: Array de líneas (mínimo 1 artículo)
  items: z.array(expenseLineItemSchema).min(1, "Debe agregar al menos un artículo."),
  description: z.string().optional(), // Ahora es opcional, se genera de items
  categoryId: z.string().min(1, "La categoría es obligatoria."),
  mileageAtExpense: z.preprocess(
    (val) => (val === '' || val === undefined) ? undefined : Number(String(val).replace(/\\D/g, '')),
    z.number().optional(),
  ),
  evidenceUrls: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  companyId: z.string().optional().nullable(),
  paymentMethod: z.enum(['company_pays_for_partner', 'partner_pays', 'company_absorbs']).default('company_pays_for_partner'),
});

export type ExpensesFormValues = z.infer<typeof expenseSchema>;

const baseNewCategorySchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    affects: z.enum(['client_balance', 'partner_balance', 'none']),
    description: z.string().optional(),
    companyId: z.string().optional().nullable(),
});
type NewCategoryFormValues = z.infer<typeof baseNewCategorySchema>;

interface ExpensesFormProps {
  onSubmit: (data: ExpensesFormValues) => void;
  initialData?: Partial<FinancialRecord> | null;
  companies: Company[];
  expenseCategories: FinancialCategory[];
  isSubmitting: boolean;
  onClose: () => void;
}

export interface ExpensesFormHandles {
  submit: () => void;
}

interface NewCategoryFormHandles {
  submit: () => void;
}

const NONE_SELECT_VALUE = "@none";

// Sub-component for new category modal (unchanged)
const NewCategoryModal = ({ open, onOpenChange, onCategoryCreated, type, companies }: { open: boolean, onOpenChange: (open: boolean) => void, onCategoryCreated: (category: FinancialCategory) => void, type: 'income' | 'expense', companies: Company[] }) => {
    const { addFinancialCategory } = useFinances();
    const { currentUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<NewCategoryFormHandles>(null);

    const NewCategoryForm = forwardRef<NewCategoryFormHandles, { onSubmit: (data: NewCategoryFormValues) => void }>(({ onSubmit }, ref) => {

        const newCategorySchema = useMemo(() => {
            const schema = baseNewCategorySchema;
            if (currentUser?.role === 'superAdmin') {
                return schema.superRefine((data, ctx) => {
                    if (!data.companyId) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: "Como Super Admin, debe seleccionar una empresa.",
                            path: ['companyId'],
                        });
                    }
                });
            }
            return schema;
        }, [currentUser?.role]);

        const form = useForm<NewCategoryFormValues>({
            resolver: zodResolver(newCategorySchema),
            defaultValues: {
                name: '',
                affects: 'none',
                description: '',
                companyId: currentUser?.companyId || null
            },
        });

        const submitButtonRef = useRef<HTMLButtonElement>(null);

        useImperativeHandle(ref, () => ({
            submit: () => submitButtonRef.current?.click(),
        }));

        const affectsOptions: { value: FinancialCategory['affects']; label: string }[] = [
            { value: 'client_balance', label: 'Balance de Cliente' },
            { value: 'partner_balance', label: 'Balance de Socio' },
            { value: 'none', label: 'Ninguno / Contabilidad Interna' }
        ];

        return (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {currentUser?.role === 'superAdmin' && (
                        <FormField
                            control={form.control}
                            name="companyId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Empresa</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar empresa..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
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

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre de la Categoría</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Ej: Reparaciones, Combustible..." />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="affects"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Afecta a</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {affectsOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descripción (Opcional)</FormLabel>
                                <FormControl>
                                    <Textarea {...field} placeholder="Detalles adicionales..." />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <button ref={submitButtonRef} type="submit" className="hidden" />
                </form>
            </Form>
        );
    });
    NewCategoryForm.displayName = 'NewCategoryForm';

    const handleSubmit = async (data: NewCategoryFormValues) => {
        setIsSubmitting(true);
        try {
            const newCategory = await addFinancialCategory({
                ...data,
                type: type,
                isDefault: false,
            }, true);
            if (newCategory) {
                toast.success('Categoría creada exitosamente');
                onCategoryCreated(newCategory);
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Error creando categoría:', error);
            toast.error('Error al crear la categoría');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormModal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title="Nueva Categoría de Gasto"
            description="Crea una categoría personalizada para organizar tus gastos."
        >
            <NewCategoryForm onSubmit={handleSubmit} ref={formRef} />
        </FormModal>
    );
};

export const ExpensesForm = forwardRef<ExpensesFormHandles, ExpensesFormProps>(
  ({ onSubmit, initialData, companies, expenseCategories, isSubmitting, onClose }, ref) => {
    const { vehicles: rawVehicles } = useVehicles();
    const { clients } = useClients();
    const { partners } = useData();
    const { currentUser } = useAuth();
    const { uploadFile } = useStorage();
    const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
    const [localCategories, setLocalCategories] = useState<FinancialCategory[]>(expenseCategories);

    // ✅ NUEVO: Parsear items de initialData si existen
    const parseItemsFromDescription = (desc?: string): { concept: string; amount: number }[] => {
      if (!desc) return [{ concept: '', amount: 0 }];

      // Si el gasto fue creado con el sistema anterior, solo tiene description
      // Lo convertimos en una línea
      return [{ concept: desc, amount: initialData?.amount || 0 }];
    };

    const initialFormData = useMemo(() => {
      if (initialData) {
        const normalizedDate = infallibleNormalizeDate(initialData.date);
        return {
          date: normalizedDate ? format(normalizedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          vehicleId: initialData.vehicleId || '',
          clientId: initialData.clientId || null,
          items: (initialData as any).items || parseItemsFromDescription(initialData.description),
          description: initialData.description || '',
          categoryId: initialData.categoryId || '',
          mileageAtExpense: initialData.mileageAtExpense,
          evidenceUrls: initialData.evidenceUrls || [],
          companyId: currentUser?.role === 'superAdmin' ? (initialData.companyId || null) : currentUser?.companyId,
          paymentMethod: (initialData.paymentMethod as any) || 'company_pays_for_partner',
        };
      }
      return {
        date: format(new Date(), 'yyyy-MM-dd'),
        vehicleId: '',
        clientId: null,
        items: [{ concept: '', amount: 0 }], // ✅ Iniciar con 1 línea vacía
        description: '',
        categoryId: '',
        mileageAtExpense: undefined,
        evidenceUrls: [],
        companyId: currentUser?.companyId || null,
        paymentMethod: 'company_pays_for_partner' as const,
      };
    }, [initialData, currentUser]);

    const form = useForm<ExpensesFormValues>({
      resolver: zodResolver(expenseSchema),
      defaultValues: initialFormData,
    });

    // ✅ NUEVO: useFieldArray para manejar líneas de artículos
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "items",
    });

    // Auto-save draft functionality (después de que form está declarado)
    const { loadDraft, clearDraft } = useAutoSave({
      data: form.getValues(),
      storageKey: 'expense-form-draft',
      saveDelay: 2000,
      enableToast: true,
      isDirty: form.formState.isDirty,
    });

    // Keyboard shortcuts: Ctrl+Enter (save), Escape (close)
    useFormKeyboardShortcuts({
      onSave: () => {
        if (form.formState.isValid) {
          form.handleSubmit(onSubmit)();
        }
      },
      onClose,
      enabled: true,
    });

    // Cargar borrador si existe
    useEffect(() => {
      if (!initialData) {
        const draft = loadDraft();
        if (draft) {
          form.reset(draft);
          toast.info('Borrador cargado automáticamente');
        }
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ✅ NUEVO: Calcular total automáticamente
    const watchItems = form.watch("items");
    const totalAmount = useMemo(() => {
      return watchItems?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    }, [watchItems]);

    const submitButtonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      submit: () => submitButtonRef.current?.click(),
    }));

    const selectedVehicleId = form.watch('vehicleId');
    const selectedCategoryId = form.watch('categoryId');

    useEffect(() => {
      const vehicle = rawVehicles.find(v => v.id === selectedVehicleId);
      if (vehicle?.clientId) {
        form.setValue('clientId', vehicle.clientId);
      } else {
        form.setValue('clientId', null);
      }
    }, [selectedVehicleId, rawVehicles, form]);

    useEffect(() => {
      const selectedCategory = localCategories.find(cat => cat.id === selectedCategoryId);
      if (selectedCategory?.id === PARTNER_PAYMENT_CATEGORY_ID) {
        form.setValue('clientId', NONE_SELECT_VALUE);
        const selectedVehicle = rawVehicles.find(v => v.id === selectedVehicleId);
        if (!selectedVehicle?.partnerId) {
          toast.error('El vehículo seleccionado no tiene socio asignado');
          form.setValue('categoryId', '');
        }
      }
    }, [selectedCategoryId, localCategories, form, rawVehicles, selectedVehicleId]);

    const handleFormSubmit = async (data: ExpensesFormValues) => {
      try {
        let finalData = { ...data };

        if (data.evidenceUrls && data.evidenceUrls.length > 0) {
          const filesToUpload = data.evidenceUrls.filter(f => f instanceof File) as File[];

          if (filesToUpload.length > 0) {
            const uploadedUrls = await Promise.all(
              filesToUpload.map(file => uploadFile(file, 'financial_receipts', true))
            );
            const existingUrls = (data.evidenceUrls?.filter(f => typeof f === 'string') as string[]) || [];
            finalData.evidenceUrls = [...existingUrls, ...uploadedUrls];
          }
        }

        if (finalData.clientId === NONE_SELECT_VALUE) {
          finalData.clientId = null;
        }

        // ✅ NUEVO: Generar description desde items
        const descriptionFromItems = finalData.items
          .map((item, idx) => `${idx + 1}. ${item.concept}: $${item.amount.toFixed(2)}`)
          .join(' | ');

        finalData.description = descriptionFromItems;

        // Limpiar borrador antes de submit
        clearDraft();
        
        onSubmit(finalData);
        
        // Anunciar éxito a screen readers
        toast.success('Gasto guardado exitosamente');
      } catch (error) {
        console.error('Error uploading files:', error);
        toast.error('Error al subir archivos');
      }
    };

    const selectedVehicle = rawVehicles.find(v => v.id === selectedVehicleId);

    return (
      <>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {currentUser?.role === 'superAdmin' && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar empresa..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehículo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rawVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.make} {vehicle.model} - {vehicle.plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ✅ NUEVO: Sección de Artículos/Refacciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Artículos / Refacciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`items.${index}.concept`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Concepto</FormLabel>}
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={`Ej: Filtro de aceite, Mano de obra...`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="w-32">
                      <FormField
                        control={form.control}
                        name={`items.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Monto</FormLabel>}
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                placeholder="0.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={index === 0 ? "mt-8" : ""}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ concept: '', amount: 0 })}
                  className="w-full"
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Agregar Artículo
                </Button>

                <Separator />

                {/* ✅ Total Calculado */}
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-semibold flex items-center gap-2">
                    <BadgeDollarSign className="h-5 w-5" />
                    Total:
                  </span>
                  <span className="text-2xl font-bold">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {localCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                        <SelectItem value={newCategoryValue}>
                          + Crear nueva categoría
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {field.value === newCategoryValue && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsNewCategoryModalOpen(true);
                          form.setValue('categoryId', '');
                        }}
                      >
                        Crear
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mileageAtExpense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kilometraje al momento del gasto (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value || ''}
                      placeholder={selectedVehicle?.currentMileage ? `Actual: ${selectedVehicle.currentMileage.toLocaleString()} km` : ''}
                    />
                  </FormControl>
                  <FormDescription>
                    {selectedVehicle?.currentMileage && `Kilometraje actual del vehículo: ${selectedVehicle.currentMileage.toLocaleString()} km`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="evidenceUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidencia (Opcional)</FormLabel>
                  <FormControl>
                    <MultipleFileInput
                      initialValue={field.value || []}
                      onFilesSelected={field.onChange}
                      accept="image/*,application/pdf"
                      folder="financial_receipts"
                    />
                  </FormControl>
                  <FormDescription>
                    Sube fotos de facturas, tickets o comprobantes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button ref={submitButtonRef} type="submit" className="hidden" />
          </form>
        </Form>

        <NewCategoryModal
          open={isNewCategoryModalOpen}
          onOpenChange={setIsNewCategoryModalOpen}
          onCategoryCreated={(newCategory) => {
            setLocalCategories([...localCategories, newCategory]);
            form.setValue('categoryId', newCategory.id);
            setIsNewCategoryModalOpen(false);
          }}
          type="expense"
          companies={companies}
        />
      </>
    );
  }
);

ExpensesForm.displayName = 'ExpensesForm';
