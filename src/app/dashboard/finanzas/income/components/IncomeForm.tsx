
      
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, useRef, useCallback } from "react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import type { FinancialRecord, Company, FinancialCategory } from "@/types";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { infallibleNormalizeDate } from "@/lib/date-utils";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { PlusCircle, Loader2, DollarSign, AlertCircle, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal } from '@/components/common/form-modal';
import { Textarea } from "@/components/ui/textarea";
import { SECURITY_DEPOSIT_CATEGORY, PARTNER_PAYMENT_CATEGORY_ID } from '@/contexts/finance-constants';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogFooter } from "@/components/ui/dialog";


const newCategoryValue = "createNewCategory";

const createIncomeSchema = (currentUserRole?: string) => z.object({
  date: z.string().min(1, "La fecha es obligatoria."),
  description: z.string().min(1, "La descripción es obligatoria"),
  amount: z.coerce.number({
    required_error: "El monto es obligatorio.",
    invalid_type_error: "El monto debe ser un número."
  }).positive("El monto debe ser mayor que cero."),
  clientId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  categoryId: z.string().min(1, "La categoría es obligatoria."),
  companyId: z.string().optional().nullable(),
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Uso de Depósito en Garantía', 'Tarjeta', 'Cheque', 'credito', 'Retiro sin tarjeta']).optional(),
  type: z.enum(['income', 'payment']),
}).superRefine((data, ctx) => {
  if (currentUserRole === 'superAdmin' && !data.companyId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Como Super Admin, debe seleccionar una empresa.',
      path: ['companyId'],
    });
  }
  const categoryIdIsPartnerPayment = data.categoryId === PARTNER_PAYMENT_CATEGORY_ID;
  if(categoryIdIsPartnerPayment && !data.partnerId) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe seleccionar un socio para esta categoría.',
        path: ['partnerId'],
    });
  }
  if (!categoryIdIsPartnerPayment && !data.clientId) {
      ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe seleccionar un cliente para esta categoría.',
          path: ['clientId'],
      });
  }
});

export type IncomeFormValues = z.infer<ReturnType<typeof createIncomeSchema>>;

interface IncomeFormProps {
  onSubmit: (data: IncomeFormValues, category?: FinancialCategory) => Promise<void>;
  initialData?: Partial<FinancialRecord> | null;
  companies: Company[];
  incomeAndPaymentCategories: FinancialCategory[];
  isSubmitting: boolean;
  onClose: () => void;
}

interface NewCategoryFormHandles {
  submit: () => void;
}

const baseNewCategorySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  affects: z.enum(['client_balance', 'partner_balance', 'none']),
  description: z.string().optional(),
  companyId: z.string().optional().nullable(),
});

type NewCategoryFormValues = z.infer<typeof baseNewCategorySchema>;

const NewCategoryModal = ({ open, onOpenChange, onCategoryCreated, type, companies }: { open: boolean, onOpenChange: (open: boolean) => void, onCategoryCreated: (category: FinancialCategory) => void, type: 'income' | 'expense' | 'payment', companies: Company[] }) => {
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
    }, []);

    const form = useForm<NewCategoryFormValues>({
      resolver: zodResolver(newCategorySchema),
      defaultValues: {
        name: '',
        affects: 'client_balance',
        description: '',
        companyId: currentUser?.companyId || null,
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
                        <SelectValue placeholder="Seleccione una empresa" />
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
                <FormLabel>Nombre de la nueva categoría</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: Pago de renta" />
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
                      <SelectValue />
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

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (Opcional)</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Descripción de la categoría" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button type="submit" ref={submitButtonRef} className="hidden" />
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
        type: type as any,
        affects: data.affects,
        description: data.description,
        companyId: data.companyId || currentUser?.companyId,
      };

      const newCategory = await addFinancialCategory(newCategoryData, true);

      if (newCategory) {
        toast.success(`Categoría \"${newCategory.name}\" creada.`);
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
    <FormModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={`Crear Nueva Categoría de ${type === 'income' ? 'Ingreso' : 'Gasto'}`}
    >
      <NewCategoryForm ref={formRef} onSubmit={handleSubmit} />
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
        <Button onClick={() => formRef.current?.submit()} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogFooter>
    </FormModal>
  );
};

const IncomeForm: React.FC<IncomeFormProps> = ({ onSubmit, initialData, companies, incomeAndPaymentCategories, isSubmitting, onClose }) => {
  const { clients, credits } = useClients();
  const { vehicles } = useVehicles();
  const { financialCategories, creditPaymentSchedules } = useFinances();
  const { partners, clientBalances, partnerBalances, vehicleAssignmentLogs } = useData();
  const { currentUser } = useAuth();
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);

  const showNoClientsWarning = clients.length === 0 && !initialData;

  const incomeSchema = useMemo(() => createIncomeSchema(currentUser?.role), [currentUser?.role]);

  const getInitialFormValues = useCallback((data: Partial<FinancialRecord> | null): IncomeFormValues => {
    const companyId = data?.companyId || currentUser?.companyId || (companies[0]?.id) || undefined;
    const categoryInfo = data?.categoryId ? incomeAndPaymentCategories.find(c => c.id === data.categoryId) : undefined;

    const defaults: IncomeFormValues = {
      date: format(new Date(), 'yyyy-MM-dd'),
      description: "",
      amount: undefined as unknown as number,
      clientId: null,
      partnerId: null,
      vehicleId: null,
      categoryId: "",
      companyId: companyId ?? null,
      paymentMethod: 'Efectivo',
      type: 'income',
    };

    if (data) {
      const normalizedDate = infallibleNormalizeDate(data.date);
      return {
        date: normalizedDate ? format(normalizedDate, 'yyyy-MM-dd') : defaults.date,
        description: data.description || "",
        amount: data.amount ?? undefined as unknown as number,
        clientId: data.clientId || null,
        partnerId: data.partnerId || null,
        vehicleId: data.vehicleId || null,
        categoryId: data.categoryId || "",
        companyId: companyId ?? null,
        paymentMethod: (data.paymentMethod as any) || 'Efectivo',
        type: (categoryInfo?.type === 'payment' ? 'payment' : 'income') as 'income' | 'payment',
      };
    }

    return defaults;
  }, [currentUser?.companyId, companies, incomeAndPaymentCategories]);

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: getInitialFormValues(initialData || null),
  });

  useEffect(() => {
    form.reset(getInitialFormValues(initialData || null));
  }, [initialData, form, getInitialFormValues]);

  const selectedClientId = form.watch("clientId");
  const selectedPartnerId = form.watch("partnerId");
  const selectedCompanyId = form.watch("companyId");
  const amount = form.watch("amount");
  const selectedCategoryId = form.watch("categoryId");
  const paymentMethod = form.watch("paymentMethod");
  const recordType = form.watch("type");

  const isPartnerPayment = selectedCategoryId === PARTNER_PAYMENT_CATEGORY_ID;
  const selectedCategory = useMemo(
    () => selectableCategories.find(category => category.id === selectedCategoryId),
    [selectableCategories, selectedCategoryId]
  );
  const isWeeklyRent = useMemo(
    () => selectedCategory?.name?.trim().toLowerCase() === 'renta semanal',
    [selectedCategory]
  );

  const paymentMethods = useMemo(() => {
    const allMethods = [
      { value: "Efectivo", label: "Efectivo" },
      { value: "Transferencia", label: "Transferencia" },
      { value: "Uso de Depósito en Garantía", label: "Uso de Depósito en Garantía" },
      { value: "Tarjeta", label: "Tarjeta" },
      { value: "Cheque", label: "Cheque" },
      { value: "Retiro sin tarjeta", label: "Retiro sin tarjeta" },
    ];
    if (isPartnerPayment) {
      return allMethods.filter(m => m.value !== 'Uso de Depósito en Garantía' && m.value !== 'Tarjeta');
    }
    return allMethods.filter(m => m.value !== 'Retiro sin tarjeta');
  }, [isPartnerPayment]);

  const activeCredit = useMemo(() => {
    return credits.find(c => c.clientId === selectedClientId && c.status === 'active' && !c.isDeleted);
  }, [credits, selectedClientId]);

  useEffect(() => {
    if (paymentMethod === 'Uso de Depósito en Garantía') {
      const client = clients.find(c => c.id === selectedClientId);
      const deposit = client?.securityDeposit || 0;
      const amountValue = form.getValues('amount') || 0;

      if (amountValue > deposit) {
        form.setError('amount', { type: 'manual', message: `El monto excede el depósito disponible de ${formatCurrency(deposit)}.` });
      } else {
        form.clearErrors('amount');
      }
    } else {
      form.clearErrors('amount');
    }
  }, [amount, paymentMethod, selectedClientId, clients, form]);

  const selectableCategories = useMemo(() => {
    let categoriesForCompany: FinancialCategory[] = [];
    const companyIdToFilter = selectedCompanyId || currentUser?.companyId || companies[0]?.id || undefined;
    if (currentUser?.role === 'superAdmin') {
      categoriesForCompany = companyIdToFilter ? incomeAndPaymentCategories.filter(cat => cat.isDefault || cat.companyId === companyIdToFilter) : incomeAndPaymentCategories;
    } else {
      categoriesForCompany = incomeAndPaymentCategories.filter(cat => cat.isDefault || cat.companyId === companyIdToFilter);
    }
    const availableCategories = Array.from(new Map(categoriesForCompany.map(cat => [cat.name, cat])).values());
    return availableCategories.sort((a, b) => a.name.localeCompare(b.name));
  }, [incomeAndPaymentCategories, selectedCompanyId, currentUser, companies]);

  const activeClients = useMemo(() => {
    const baseClients = clients.filter(c => c.status === 'active' && !c.isDeleted);
    const creditRelatedCategories = ['Pago de Crédito', 'Pago Enganche de Crédito', 'Depósito de Crédito'];
    const isCreditRelated = creditRelatedCategories.some(catName => selectableCategories.find(cat => cat.name === catName)?.id === selectedCategoryId);
    let result = baseClients;
    if (isCreditRelated) {
      result = baseClients.filter(client => credits.some(credit => credit.clientId === client.id && credit.status === 'active' && !credit.isDeleted));
    }
    return result;
  }, [clients, selectedCategoryId, selectableCategories, credits]);

  const activePartners = useMemo(() => {
    if (isPartnerPayment) return partners.filter(p => !p.isDeleted);
    return [];
  }, [partners, isPartnerPayment]);
  
  useEffect(() => {
    const creditRelatedCategories = ['Pago de Crédito', 'Pago Enganche de Crédito', 'Depósito de Crédito'];
    const categoryInfo = selectableCategories.find(c => c.id === selectedCategoryId);
    if (categoryInfo) {
      form.setValue('type', categoryInfo.type as 'income' | 'payment');
      if (categoryInfo.id === PARTNER_PAYMENT_CATEGORY_ID) {
        form.setValue('clientId', null);
        form.setValue('partnerId', null);
        form.setValue('vehicleId', null);
      } else if (creditRelatedCategories.some(catName => categoryInfo.name === catName)) {
        form.setValue('partnerId', null);
      }
    }
  }, [selectedCategoryId, selectableCategories, form]);

  // La asignación activa es la fuente de verdad para relacionar cliente y vehículo.
  // Se usa el registro más reciente abierto (unassignedAt = null) de la misma empresa.
  const assignedVehicle = useMemo(() => {
    if (!selectedClientId) return null;

    const companyId = selectedCompanyId || currentUser?.companyId;
    const activeAssignments = (vehicleAssignmentLogs || [])
      .filter(log =>
        log.clientId === selectedClientId &&
        !log.unassignedAt &&
        !log.isDeleted &&
        (!companyId || log.companyId === companyId)
      )
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    const assignment = activeAssignments[0];
    if (!assignment) return null;

    return vehicles.find(vehicle => vehicle.id === assignment.vehicleId) || null;
  }, [selectedClientId, selectedCompanyId, currentUser?.companyId, vehicleAssignmentLogs, vehicles]);

  const filteredVehicles = useMemo(() => {
    if (!selectedClientId) return [];
    return vehicles.filter(v => v.clientId === selectedClientId);
  }, [selectedClientId, vehicles]);

  // Al elegir cliente, cargar automáticamente el vehículo de su asignación activa.
  // No se depende de vehicles.clientId para la asignación actual; se mantiene solo
  // como compatibilidad visual con datos históricos que aún tengan ese campo.
  useEffect(() => {
    if (!selectedClientId) {
      form.setValue('vehicleId', null, { shouldValidate: true });
      return;
    }

    if (assignedVehicle?.id) {
      form.setValue('vehicleId', assignedVehicle.id, { shouldValidate: true, shouldDirty: false });
    } else if (!initialData) {
      form.setValue('vehicleId', null, { shouldValidate: true });
    }
  }, [selectedClientId, assignedVehicle?.id, initialData, form]);

  useEffect(() => {
    const currentVehicleId = form.getValues('vehicleId');
    if (currentVehicleId && assignedVehicle && currentVehicleId !== assignedVehicle.id) {
      form.setValue('vehicleId', assignedVehicle.id, { shouldValidate: true, shouldDirty: false });
    }
  }, [assignedVehicle?.id, form]);

  const handleFormSubmit = async (data: IncomeFormValues) => {
    const category = selectableCategories.find(c => c.id === data.categoryId);
    if (!category) return toast.error('Categoría inválida');

    // Renta semanal siempre debe quedar ligada al vehículo actualmente asignado.
    if (category.name.trim().toLowerCase() === 'renta semanal' && !data.vehicleId) {
      return toast.error('El cliente seleccionado no tiene un vehículo asignado activo', {
        description: 'Primero registra la asignación del vehículo al cliente.'
      });
    }

    try {
      if (isPartnerPayment) {
        const partner = partners.find(p => p.id === data.partnerId);
        if (!partner) return toast.error('Socio no válido');
      } else {
        const client = clients.find(c => c.id === data.clientId);
        if (client && client.status !== 'active') {
          return toast.error('Cliente Inactivo', { description: 'No se pueden registrar transacciones para clientes inactivos.' });
        }
      }

      await onSubmit(data, category);
    } catch (error) {
      console.error('❌ Error en handleFormSubmit al llamar onSubmit:', error);
      toast.error('Error al procesar el formulario', { description: error instanceof Error ? error.message : 'Intenta de nuevo.' });
    }
  };

  const nextPendingPayment = useMemo(() => {
    if (!activeCredit) return null;
    return creditPaymentSchedules
      .filter(s => s.creditId === activeCredit.id && s.status === 'pending')
      .sort((a, b) => a.paymentNumber - b.paymentNumber)[0];
  }, [activeCredit, creditPaymentSchedules]);

  return (
    <>
      {showNoClientsWarning && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Hay Clientes Disponibles</AlertTitle>
          <AlertDescription>
            <p className="mb-2">No se encontraron clientes para crear ingresos.</p>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          {currentUser?.role === 'superAdmin' && (
            <FormField control={form.control} name="companyId" render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting || (!!selectedClientId && selectedClientId !== null)}>
                  <FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger></FormControl>
                  <SelectContent>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}

          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmitting} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="categoryId" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={(value) => value === newCategoryValue ? setIsNewCategoryModalOpen(true) : field.onChange(value)} value={field.value ?? ''} disabled={isSubmitting}>
                <FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger></FormControl>
                <SelectContent>
                  {selectableCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {(currentUser?.role === 'superAdmin' || currentUser?.role === 'admin') && <SelectItem value={newCategoryValue} className="text-primary focus:bg-primary/10 focus:text-primary"><span className="flex items-center"><PlusCircle className="mr-2 h-4 w-4" /> Crear nueva categoría...</span></SelectItem>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {isPartnerPayment ? (
            <FormField control={form.control} name="partnerId" render={({ field }) => (
              <FormItem><FormLabel>Socio</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}><FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccione un socio" /></SelectTrigger></FormControl><SelectContent>{activePartners.map((p) => <SelectItem key={p.id} value={p.id}>{`${p.firstname} ${p.lastname}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
          ) : (
            <>
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}><FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccione un cliente" /></SelectTrigger></FormControl><SelectContent>{activeClients.map((c) => <SelectItem key={c.id} value={c.id}>{`${c.firstname} ${c.lastname}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehículo {isWeeklyRent ? '' : '(Opcional)'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting || !!assignedVehicle?.id}>
                    <FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder={assignedVehicle ? 'Vehículo asignado automáticamente' : 'Seleccione un vehículo'} /></SelectTrigger></FormControl>
                    <SelectContent>{filteredVehicles.map((v) => <SelectItem key={v.id} value={v.id}>{`${v.make} ${v.model} (${v.plate})`}</SelectItem>)}</SelectContent>
                  </Select>
                  {assignedVehicle && <p className="text-xs text-muted-foreground">Asignación activa: {assignedVehicle.make} {assignedVehicle.model} ({assignedVehicle.plate})</p>}
                  {isWeeklyRent && !assignedVehicle && selectedClientId && <p className="text-xs text-destructive">Este cliente no tiene una asignación activa.</p>}
                  <FormMessage />
                </FormItem>
              )} />
            </>
          )}

          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem><FormLabel>Importe</FormLabel><FormControl><Input type="number" step="0.01" className="border-2 border-input focus:border-primary rounded-lg" {...field} value={field.value === undefined ? '' : field.value} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} disabled={isSubmitting} placeholder="0.00" /></FormControl><FormMessage /></FormItem>
          )} />

          {(selectedClientId || selectedPartnerId) && selectedCategoryId && (amount || 0) > 0 && (() => {
            const category = financialCategories.find(c => c.id === selectedCategoryId);
            let currentBalance = 0;
            let entityName = '';
            let entityType: 'cliente' | 'socio' = 'cliente';
            let initialBalance = 0;
            if (isPartnerPayment && selectedPartnerId) {
              const partnerBalanceInfo = partnerBalances.find(pb => pb.id === selectedPartnerId);
              const partner = partners.find(p => p.id === selectedPartnerId);
              currentBalance = partnerBalanceInfo?.balance ?? 0;
              initialBalance = partner?.initialBalance ?? 0;
              entityName = partner ? `${partner.firstname} ${partner.lastname}` : 'Socio desconocido';
              entityType = 'socio';
            } else if (!isPartnerPayment && selectedClientId) {
              const clientBalanceInfo = clientBalances.find(cb => cb.id === selectedClientId);
              const client = clients.find(c => c.id === selectedClientId);
              currentBalance = clientBalanceInfo?.balance ?? 0;
              entityName = client ? `${client.firstname} ${client.lastname}` : 'Cliente desconocido';
              entityType = 'cliente';
            }
            if (!entityName) return null;
            const currentCreditBalance = activeCredit?.remainingBalance || 0;
            let newBalance = currentBalance;
            let newCreditBalance = currentCreditBalance;
            let impactDescription = '';
            const amountValue = parseFloat(String(amount) || '0');
            if (category?.id === SECURITY_DEPOSIT_CATEGORY) impactDescription = `Aumenta el depósito de garantía de ${entityName}. No afecta su balance.`;
            else if (category?.name === 'Pago de Crédito') { newBalance = currentBalance - amountValue; newCreditBalance = Math.max(0, currentCreditBalance - amountValue); impactDescription = `Disminuye el balance de ${entityName} y el saldo del crédito.`; }
            else if (category?.id === PARTNER_PAYMENT_CATEGORY_ID) { newBalance = currentBalance - amountValue; impactDescription = `Disminuye el saldo a pagar a ${entityName}.`; }
            else if (category?.type === 'payment') { newBalance = currentBalance - amountValue; impactDescription = `Disminuye el balance de ${entityName}.`; }
            else if (category?.type === 'income') { newBalance = currentBalance + amountValue; impactDescription = `Aumenta el balance de ${entityName}.`; }
            else return null;
            return (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-3"><DollarSign className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold">Vista Previa del Impacto</h3></div>
                <div className="grid grid-cols-2 gap-4 pb-3 border-b">
                  {entityType === 'socio' && <div className="space-y-1"><p className="text-sm text-muted-foreground">Saldo Inicial ({entityType})</p><p className="text-xl font-bold">{formatCurrency(initialBalance)}</p></div>}
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Balance Actual ({entityType})</p><p className="text-xl font-bold">{formatCurrency(currentBalance)}</p></div>
                  {activeCredit && entityType === 'cliente' && <div className="space-y-1"><p className="text-sm text-muted-foreground">Saldo del Crédito</p><p className="text-lg font-semibold">{formatCurrency(currentCreditBalance)}</p></div>}
                  {activeCredit && entityType === 'cliente' && nextPendingPayment && <div className="space-y-1 pt-2 border-t col-span-2"><p className="text-sm text-muted-foreground">Siguiente Pago del Crédito</p><div className="flex items-center justify-between"><span className="text-sm">Pago #{nextPendingPayment.paymentNumber}</span><span className="font-medium">{formatCurrency(nextPendingPayment.amount)}</span></div><p className="text-xs text-muted-foreground">Vence: {format(new Date(nextPendingPayment.dueDate), 'dd/MM/yyyy', { locale: es })}</p></div>}
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md"><AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" /><div><p className="text-sm font-medium text-blue-900 dark:text-blue-100">{impactDescription}</p><p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Categoría: {category?.name}</p></div></div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Nuevo Balance</p><div className="flex items-baseline gap-2"><p className={cn("text-xl font-bold", newBalance > currentBalance ? 'text-green-600' : newBalance < currentBalance ? 'text-red-600' : 'text-foreground')}>{formatCurrency(newBalance)}</p>{newBalance !== currentBalance && <span className={cn("text-xs", newBalance > currentBalance ? 'text-green-600' : 'text-red-600')}>{newBalance > currentBalance ? '+' : ''}{formatCurrency(newBalance - currentBalance)}</span>}</div>{newBalance <= 0 && (entityType === 'socio' || (entityType === 'cliente' && category?.type === 'payment')) && <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full"><Check className="h-3 w-3" />Saldo liquidado</span>}</div>
                  {(category?.name === 'Pago de Crédito') && activeCredit && <div className="space-y-1"><p className="text-sm text-muted-foreground">Nuevo Saldo del Crédito</p><div className="flex items-baseline gap-2"><p className={cn("text-xl font-bold", newCreditBalance === 0 ? 'text-green-600' : 'text-orange-600')}>{formatCurrency(newCreditBalance)}</p><span className="text-xs text-green-600">-{formatCurrency(currentCreditBalance - newCreditBalance)}</span>{newCreditBalance <= 0 && <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full"><Check className="h-3 w-3" />Crédito Liquidado</span>}</div></div>}
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || (isWeeklyRent && !!selectedClientId && !assignedVehicle?.id)}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : <><Check className="mr-2 h-4 w-4" />Registrar ingreso</>}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      <NewCategoryModal
        open={isNewCategoryModalOpen}
        onOpenChange={setIsNewCategoryModalOpen}
        onCategoryCreated={(category) => form.setValue('categoryId', category.id, { shouldValidate: true })}
        type="income"
        companies={companies}
      />
    </>
  );
};

export default IncomeForm;
