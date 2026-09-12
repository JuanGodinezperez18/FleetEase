
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, useRef, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import type { FinancialRecord, Company, FinancialCategory } from "@/types";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultipleFileInput } from "@/components/common/multiple-file-input";
import { infallibleNormalizeDate } from "@/lib/date-utils";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { Building, PlusCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal } from '@/components/common/form-modal';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStorage } from "@/hooks/use-storage";
import { PARTNER_PAYMENT_CATEGORY_ID } from '@/contexts/finance-constants';

const newCategoryValue = "createNewCategory";

const expenseSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria."),
  clientId: z.string().optional().nullable(),
  vehicleId: z.string().min(1, "Debe seleccionar un vehículo."),
  amount: z.coerce.number({
    required_error: "El monto es obligatorio.",
    invalid_type_error: "El monto debe ser un número."
  }).positive("El monto debe ser mayor que cero."),
  description: z.string().min(1, "La descripción es obligatoria."),
  categoryId: z.string().min(1, "La categoría es obligatoria."),
  mileageAtExpense: z.preprocess(
    (val) => (val === '' || val === undefined) ? undefined : Number(String(val).replace(/\D/g, '')),
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

// Sub-component for new category modal
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre de la nueva categoría</FormLabel>
                            <FormControl><Input {...field} placeholder="Ej: Gestoría Vehicular" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <FormField
                        control={form.control}
                        name="affects"
                        render={({ field }) => (
                        <FormItem>
                          <FormLabel>Afecta a</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Seleccione a quién afecta..." />
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
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción (Opcional)</FormLabel>
                            <FormControl><Textarea {...field} placeholder="Explica cómo se usa esta categoría." /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <Button type="submit" ref={submitButtonRef} className="hidden" />
                </form>
            </Form>
        );
    });
    NewCategoryForm.displayName = 'NewCategoryForm';
    
    const handleSubmit = async (data: NewCategoryFormValues) => {
        setIsSubmitting(true);
        try {
            const newCategoryData: Omit<FinancialCategory, 'id'> = { 
                name: data.name, 
                type, 
                affects: data.affects, 
                description: data.description,
                companyId: data.companyId || currentUser?.companyId,
            };
            const newCategory = await addFinancialCategory(newCategoryData, true); // true to get the object back
            if (newCategory) {
                toast.success(`Categoría "${newCategory.name}" creada.`);
                onCategoryCreated(newCategory);
            }
            onOpenChange(false);
        } catch (error) {
            const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Error desconocido");
            toast.error("Error al crear categoría", { description: getErrorMessage(error) });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormModal isOpen={open} onClose={() => onOpenChange(false)} title={`Crear Nueva Categoría de ${type === 'income' ? 'Ingreso' : 'Gasto'}`}>
            <NewCategoryForm ref={formRef} onSubmit={handleSubmit} />
        </FormModal>
    );
};


const ExpensesForm = forwardRef<ExpensesFormHandles, ExpensesFormProps>(
  ({ onSubmit, initialData, companies, expenseCategories, isSubmitting, onClose }, ref) => {
    const { vehicles } = useVehicles();
    const { clients } = useClients();
    const { selectedCompanyId: globalCompanyId } = useData();
    const { currentUser } = useAuth();
    const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
    
    const defaultValues = useMemo(() => {
        const companyCtx = initialData?.companyId || (currentUser?.role !== 'superAdmin' ? currentUser?.companyId : globalCompanyId) || null;
        
        return {
            date: initialData?.date ? format(infallibleNormalizeDate(initialData.date)!, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            clientId: initialData?.clientId || NONE_SELECT_VALUE,
            vehicleId: initialData?.vehicleId || '',
            amount: initialData?.amount ?? undefined,
            description: initialData?.description || '',
            categoryId: initialData?.categoryId || '',
            mileageAtExpense: initialData?.mileageAtExpense ?? undefined,
            evidenceUrls: initialData?.evidenceUrls ?? [],
            companyId: companyCtx,
            paymentMethod: (initialData?.paymentMethod as any) || 'company_pays_for_partner',
        };
    }, [initialData, currentUser, globalCompanyId]);

    const form = useForm<ExpensesFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues,
    });

    const { control, handleSubmit, watch, setValue, reset, formState: { isDirty } } = form;
    
    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    const selectedClientId = watch('clientId');
    const formCompanyId = watch('companyId');
    const selectedVehicleId = watch('vehicleId');

    // When client is selected, determine the company and update the form
    useEffect(() => {
        if (currentUser?.role === 'superAdmin' && selectedClientId && selectedClientId !== NONE_SELECT_VALUE) {
            const client = clients.find(c => c.id === selectedClientId);
            if (client && client.companyId && client.companyId !== formCompanyId) {
                setValue('companyId', client.companyId);
                // Reset vehicle if company changes due to client selection
                if(vehicles.find(v => v.id === watch('vehicleId'))?.companyId !== client.companyId) {
                    setValue('vehicleId', '');
                }
            }
        }
    }, [selectedClientId, clients, formCompanyId, setValue, currentUser?.role, vehicles, watch]);
    
    const activeClients = useMemo(() => {
        if (currentUser?.role === 'superAdmin') {
             // For superAdmins, show clients from the selected company context, or all if none selected
            return formCompanyId ? clients.filter(c => c.companyId === formCompanyId && c.status === 'active' && !c.isDeleted) : clients.filter(c => c.status === 'active' && !c.isDeleted);
        }
        return clients.filter(c => c.companyId === currentUser?.companyId && c.status === 'active' && !c.isDeleted);
    }, [clients, currentUser, formCompanyId]);
    
    const selectableVehicles = useMemo(() => {
        const companyIdToFilter = formCompanyId || currentUser?.companyId;
        if (!companyIdToFilter) return []; // No vehicles if no company context
        return vehicles.filter(v => v.companyId === companyIdToFilter && (v.status === 'active' || v.status === 'rented') && !v.isDeleted);
    }, [vehicles, formCompanyId, currentUser?.companyId]);
    
    const availableVehicles = useMemo(() => {
        if (!selectedClientId || selectedClientId === NONE_SELECT_VALUE) {
            return selectableVehicles;
        }
        // If a client is selected, show ONLY their assigned vehicles
        return selectableVehicles.filter(v => v.clientId === selectedClientId);
    }, [selectedClientId, selectableVehicles]);
    
    const selectableCategories = useMemo(() => {
      const companyIdToFilter = formCompanyId || currentUser?.companyId;
  
      const categories = expenseCategories.filter(cat => {
          if (cat.type !== 'expense' || cat.id === PARTNER_PAYMENT_CATEGORY_ID) {
              return false;
          }
          if (currentUser?.role !== 'superAdmin') {
              return cat.isDefault || cat.companyId === companyIdToFilter;
          }
          if (companyIdToFilter) {
              return cat.isDefault || cat.companyId === companyIdToFilter;
          }
          return cat.isDefault;
      });
  
      const categoryMap = new Map<string, FinancialCategory>();
      categories.forEach(cat => {
          if (!categoryMap.has(cat.name) || !cat.isDefault) {
              categoryMap.set(cat.name, cat);
          }
      });
  
      return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [expenseCategories, formCompanyId, currentUser]);


    const selectedVehicle = useMemo(() => {
        return selectedVehicleId ? vehicles.find(v => v.id === selectedVehicleId) : null;
    }, [selectedVehicleId, vehicles]);

    useEffect(() => {
        if (selectedVehicle && form.getValues('mileageAtExpense') === undefined) {
            setValue('mileageAtExpense', selectedVehicle.currentMileage);
        }
    }, [selectedVehicle, setValue, form]);

    return (
        <>
            <Form {...form}>
                <form id="expenses-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-1">
                    {currentUser?.role === 'superAdmin' && (
                      <FormField
                        control={form.control}
                        name="companyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empresa</FormLabel>
                                <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value ?? ''} 
                                    disabled={isSubmitting || (!!selectedClientId && selectedClientId !== NONE_SELECT_VALUE)}
                                >
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
                                    <FormLabel>Fecha del Gasto</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            {...field}
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField 
                            control={control} 
                            name="amount" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Importe del Gasto</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />

                        <FormField 
                            control={control} 
                            name="clientId" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cliente (Opcional)</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(value === NONE_SELECT_VALUE ? null : value)} value={field.value ?? NONE_SELECT_VALUE} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="-- Ninguno --" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={NONE_SELECT_VALUE}>-- Ninguno --</SelectItem>
                                            {activeClients.map(client => <SelectItem key={client.id} value={client.id}>{`${client.firstname} ${client.lastname}`}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />

                        <FormField 
                            control={control} 
                            name="vehicleId" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Vehículo</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione un vehículo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableVehicles.map(vehicle => <SelectItem key={vehicle.id} value={vehicle.id}>{`${vehicle.make} ${vehicle.model} (${vehicle.plate})`}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />

                        <FormField 
                            control={control} 
                            name="description" 
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Carga de gasolina" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={control} 
                            name="categoryId" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            if (value === newCategoryValue) {
                                                setIsNewCategoryModalOpen(true);
                                            } else {
                                                field.onChange(value);
                                            }
                                        }}
                                        value={field.value ?? ''}
                                        disabled={isSubmitting}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione una categoría" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {selectableCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                            {(currentUser?.role === 'superAdmin' || currentUser?.role === 'admin') && (
                                                <SelectItem value={newCategoryValue} className="text-primary focus:bg-primary/10 focus:text-primary">
                                                   <span className="flex items-center"><PlusCircle className="mr-2 h-4 w-4" /> Crear nueva categoría...</span>
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                         <FormField 
                            control={control} 
                            name="paymentMethod" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pagado por</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar método de pago" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="company_pays_for_partner">Empresa (Afecta a Socio)</SelectItem>
                                            <SelectItem value="partner_pays">Socio (No afecta balance)</SelectItem>
                                            <SelectItem value="company_absorbs">Empresa (Afecta a Empresa)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={control} 
                            name="mileageAtExpense" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kilometraje (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Ej: 120500" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                                    </FormControl>
                                    {selectedVehicle && <p className="text-xs text-muted-foreground mt-1">Último: {selectedVehicle.currentMileage.toLocaleString()} km</p>}
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                    </div>
                    
                    <FormField
                        control={form.control}
                        name="evidenceUrls"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Adjuntar Archivos (Facturas, Tickets, etc.)</FormLabel>
                                <FormControl>
                                    <MultipleFileInput
                                        initialValue={field.value as (string | File)[]}
                                        onFilesSelected={(files) => field.onChange(files)}
                                        disabled={isSubmitting}
                                        folder="financial_receipts"
                                        entityId={initialData?.id || form.getValues('vehicleId')}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </form>
          </Form>
          <NewCategoryModal
            open={isNewCategoryModalOpen}
            onOpenChange={setIsNewCategoryModalOpen}
            onCategoryCreated={(newCategory) => {
              form.setValue('categoryId', newCategory.id, { shouldValidate: true });
            }}
            type="expense"
            companies={companies}
          />
        </>
    );
});

ExpensesForm.displayName = "ExpensesForm";
export default ExpensesForm;

    