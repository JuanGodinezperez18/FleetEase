"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import type { FinancialCategory, FinancialRecord, Company } from "@/types";
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
import { DialogFooter } from "@/components/ui/dialog";

const newCategoryValue = "createNewCategory";

const createIncomeSchema = (currentUserRole?: string) => z.object({
  date: z.string().min(1, "La fecha es obligatoria."),
  description: z.string().trim().min(1, "El concepto es obligatorio."),
  amount: z.coerce.number({ required_error: "El monto es obligatorio.", invalid_type_error: "El monto debe ser un número." }).positive("El monto debe ser mayor que cero."),
  clientId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  categoryId: z.string().min(1, "La categoría es obligatoria."),
  companyId: z.string().optional().nullable(),
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Uso de Depósito en Garantía', 'Tarjeta', 'Cheque', 'credito', 'Retiro sin tarjeta']).optional(),
  type: z.enum(['income', 'payment']),
}).superRefine((data, ctx) => {
  if (currentUserRole === 'superAdmin' && !data.companyId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Como Super Admin, debe seleccionar una empresa.', path: ['companyId'] });
  }
  const isPartner = data.categoryId === PARTNER_PAYMENT_CATEGORY_ID;
  if (isPartner && !data.partnerId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe seleccionar un socio para esta categoría.', path: ['partnerId'] });
  }
  if (!isPartner && !data.clientId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe seleccionar un cliente para esta categoría.', path: ['clientId'] });
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

const IncomeForm: React.FC<IncomeFormProps> = ({ onSubmit, initialData, companies, incomeAndPaymentCategories, isSubmitting, onClose }) => {
  const { clients, credits } = useClients();
  const { vehicles } = useVehicles();
  const { financialCategories, creditPaymentSchedules } = useFinances();
  const { partners, clientBalances, partnerBalances, vehicleAssignmentLogs } = useData();
  const { currentUser } = useAuth();
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);

  const incomeSchema = useMemo(() => createIncomeSchema(currentUser?.role), [currentUser?.role]);
  const getInitialFormValues = useCallback((data: Partial<FinancialRecord> | null): IncomeFormValues => {
    const companyId = data?.companyId || currentUser?.companyId || companies[0]?.id || undefined;
    const categoryInfo = data?.categoryId ? incomeAndPaymentCategories.find(c => c.id === data.categoryId) : undefined;
    const defaults: IncomeFormValues = {
      date: format(new Date(), 'yyyy-MM-dd'), description: '', amount: undefined as unknown as number,
      clientId: null, partnerId: null, vehicleId: null, categoryId: '', companyId: companyId ?? null,
      paymentMethod: 'Efectivo', type: 'income'
    };
    if (!data) return defaults;
    const normalizedDate = infallibleNormalizeDate(data.date);
    return {
      date: normalizedDate ? format(normalizedDate, 'yyyy-MM-dd') : defaults.date,
      description: data.description || '', amount: data.amount ?? undefined as unknown as number,
      clientId: data.clientId || null, partnerId: data.partnerId || null, vehicleId: data.vehicleId || null,
      categoryId: data.categoryId || '', companyId: companyId ?? null,
      paymentMethod: (data.paymentMethod as IncomeFormValues['paymentMethod']) || 'Efectivo',
      type: categoryInfo?.type === 'payment' ? 'payment' : 'income'
    };
  }, [currentUser?.companyId, companies, incomeAndPaymentCategories]);

  const form = useForm<IncomeFormValues>({ resolver: zodResolver(incomeSchema), defaultValues: getInitialFormValues(initialData || null) });
  useEffect(() => { form.reset(getInitialFormValues(initialData || null)); }, [initialData, form, getInitialFormValues]);

  const selectedClientId = form.watch("clientId");
  const selectedPartnerId = form.watch("partnerId");
  const selectedCompanyId = form.watch("companyId");
  const amount = form.watch("amount");
  const selectedCategoryId = form.watch("categoryId");
  const paymentMethod = form.watch("paymentMethod");
  const recordType = form.watch("type");
  const isPartnerPayment = selectedCategoryId === PARTNER_PAYMENT_CATEGORY_ID;

  const selectableCategories = useMemo(() => {
    const companyId = selectedCompanyId || currentUser?.companyId || companies[0]?.id;
    const filtered = incomeAndPaymentCategories.filter(c => c.isDefault || c.companyId === companyId);
    return Array.from(new Map(filtered.map(c => [c.name, c])).values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [incomeAndPaymentCategories, selectedCompanyId, currentUser?.companyId, companies]);

  const selectedCategory = useMemo(() => selectableCategories.find(c => c.id === selectedCategoryId), [selectableCategories, selectedCategoryId]);
  const isWeeklyRent = selectedCategory?.name?.trim().toLowerCase() === 'renta semanal';

  const paymentMethods = useMemo(() => {
    const allMethods = [
      { value: "Efectivo", label: "Efectivo" },
      { value: "Transferencia", label: "Transferencia" },
      { value: "Uso de Depósito en Garantía", label: "Uso de Depósito en Garantía" },
      { value: "Tarjeta", label: "Tarjeta" },
      { value: "Cheque", label: "Cheque" },
      { value: "Retiro sin tarjeta", label: "Retiro sin tarjeta" },
    ];
    return isPartnerPayment
      ? allMethods.filter(m => m.value !== 'Uso de Depósito en Garantía' && m.value !== 'Tarjeta')
      : allMethods.filter(m => m.value !== 'Retiro sin tarjeta');
  }, [isPartnerPayment]);

  const activeCredit = useMemo(() => credits.find(c => c.clientId === selectedClientId && c.status === 'active' && !c.isDeleted), [credits, selectedClientId]);

  const activeClients = useMemo(() => {
    const base = clients.filter(c => c.status === 'active' && !c.isDeleted);
    const creditRelated = ['Pago de Crédito', 'Pago Enganche de Crédito', 'Depósito de Crédito'].some(name => selectableCategories.find(c => c.name === name)?.id === selectedCategoryId);
    return creditRelated ? base.filter(c => credits.some(cr => cr.clientId === c.id && cr.status === 'active' && !cr.isDeleted)) : base;
  }, [clients, credits, selectedCategoryId, selectableCategories]);

  const activePartners = useMemo(() => isPartnerPayment ? partners.filter(p => !p.isDeleted) : [], [partners, isPartnerPayment]);

  const assignedVehicle = useMemo(() => {
    if (!selectedClientId) return null;
    const companyId = selectedCompanyId || currentUser?.companyId;
    const assignment = (vehicleAssignmentLogs || [])
      .filter(log => log.clientId === selectedClientId && !log.unassignedAt && !log.isDeleted && (!companyId || log.companyId === companyId))
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];
    return assignment ? vehicles.find(v => v.id === assignment.vehicleId) || null : null;
  }, [selectedClientId, selectedCompanyId, currentUser?.companyId, vehicleAssignmentLogs, vehicles]);

  const filteredVehicles = useMemo(() => {
    const assigned = assignedVehicle ? [assignedVehicle] : [];
    const legacy = selectedClientId ? vehicles.filter(v => v.clientId === selectedClientId) : [];
    return Array.from(new Map([...assigned, ...legacy].map(v => [v.id, v])).values());
  }, [selectedClientId, vehicles, assignedVehicle]);

  useEffect(() => {
    if (!selectedClientId) {
      form.setValue('vehicleId', null, { shouldValidate: true });
    } else if (assignedVehicle?.id) {
      form.setValue('vehicleId', assignedVehicle.id, { shouldValidate: true, shouldDirty: false });
    } else if (!initialData) {
      form.setValue('vehicleId', null, { shouldValidate: true });
    }
  }, [selectedClientId, assignedVehicle?.id, initialData, form]);

  useEffect(() => {
    const categoryInfo = selectableCategories.find(c => c.id === selectedCategoryId);
    if (!categoryInfo) return;
    form.setValue('type', categoryInfo.type as 'income' | 'payment');
    if (categoryInfo.id === PARTNER_PAYMENT_CATEGORY_ID) {
      form.setValue('clientId', null); form.setValue('partnerId', null); form.setValue('vehicleId', null);
    } else if (['Pago de Crédito', 'Pago Enganche de Crédito', 'Depósito de Crédito'].includes(categoryInfo.name)) {
      form.setValue('partnerId', null);
    }
  }, [selectedCategoryId, selectableCategories, form]);

  useEffect(() => {
    if (paymentMethod !== 'Uso de Depósito en Garantía') return;
    const deposit = clients.find(c => c.id === selectedClientId)?.securityDeposit || 0;
    const value = form.getValues('amount') || 0;
    if (value > deposit) form.setError('amount', { type: 'manual', message: `El monto excede el depósito disponible de ${formatCurrency(deposit)}.` });
    else form.clearErrors('amount');
  }, [amount, paymentMethod, selectedClientId, clients, form]);

  const nextPendingPayment = useMemo(() => activeCredit ? creditPaymentSchedules.filter(s => s.creditId === activeCredit.id && s.status === 'pending').sort((a, b) => a.paymentNumber - b.paymentNumber)[0] : null, [activeCredit, creditPaymentSchedules]);

  const handleFormSubmit = async (data: IncomeFormValues) => {
    try {
      const category = selectableCategories.find(c => c.id === data.categoryId);
      if (!category) return toast.error('Categoría inválida');
      if (category.name.trim().toLowerCase() === 'renta semanal' && !data.vehicleId) {
        return toast.error('El cliente seleccionado no tiene un vehículo asignado activo', { description: 'Primero registra la asignación del vehículo al cliente.' });
      }
      if (isPartnerPayment) {
        if (!partners.some(p => p.id === data.partnerId && !p.isDeleted)) return toast.error('Socio no válido');
      } else {
        const client = clients.find(c => c.id === data.clientId);
        if (client && client.status !== 'active') return toast.error('Cliente Inactivo', { description: 'No se pueden registrar transacciones para clientes inactivos.' });
      }
      await onSubmit({ ...data, description: data.description.trim() }, category);
    } catch (error) {
      console.error('[IncomeForm] Error al registrar ingreso:', error);
      toast.error('Error al registrar ingreso', { description: error instanceof Error ? error.message : 'Intenta de nuevo.' });
    }
  };

  const handleInvalidSubmit = (errors: Record<string, unknown>) => {
    const firstError = Object.values(errors)[0] as { message?: string } | undefined;
    toast.error('Revisa el formulario', { description: firstError?.message || 'Hay campos obligatorios pendientes.' });
  };

  const currentBalance = selectedClientId ? clientBalances.find(b => b.id === selectedClientId)?.balance ?? 0 : selectedPartnerId ? partnerBalances.find(b => b.id === selectedPartnerId)?.balance ?? 0 : 0;
  const entityName = selectedClientId ? `${clients.find(c => c.id === selectedClientId)?.firstname || ''} ${clients.find(c => c.id === selectedClientId)?.lastname || ''}`.trim() : selectedPartnerId ? `${partners.find(p => p.id === selectedPartnerId)?.firstname || ''} ${partners.find(p => p.id === selectedPartnerId)?.lastname || ''}`.trim() : '';

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit, handleInvalidSubmit)} className="space-y-4">
          {currentUser?.role === 'superAdmin' && (
            <FormField control={form.control} name="companyId" render={({ field }) => (
              <FormItem><FormLabel>Empresa</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting || !!selectedClientId}><FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger></FormControl><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
          )}

          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmitting} className="rounded-lg" /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="categoryId" render={({ field }) => (
            <FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={value => value === newCategoryValue ? setIsNewCategoryModalOpen(true) : field.onChange(value)} value={field.value ?? ''} disabled={isSubmitting}><FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger></FormControl><SelectContent>{selectableCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}{(currentUser?.role === 'superAdmin' || currentUser?.role === 'admin') && <SelectItem value={newCategoryValue}><span className="flex items-center"><PlusCircle className="mr-2 h-4 w-4" />Crear nueva categoría...</span></SelectItem>}</SelectContent></Select><FormMessage /></FormItem>
          )} />

          {isPartnerPayment ? (
            <FormField control={form.control} name="partnerId" render={({ field }) => (
              <FormItem><FormLabel>Socio</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}><FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccione un socio" /></SelectTrigger></FormControl><SelectContent>{activePartners.map(p => <SelectItem key={p.id} value={p.id}>{`${p.firstname} ${p.lastname}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
          ) : (
            <>
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}><FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder="Seleccione un cliente" /></SelectTrigger></FormControl><SelectContent>{activeClients.map(c => <SelectItem key={c.id} value={c.id}>{`${c.firstname} ${c.lastname}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem><FormLabel>Vehículo {isWeeklyRent ? '' : '(Opcional)'}</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting || !!assignedVehicle?.id}><FormControl><SelectTrigger className="rounded-lg"><SelectValue placeholder={assignedVehicle ? 'Vehículo asignado automáticamente' : 'Seleccione un vehículo'} /></SelectTrigger></FormControl><SelectContent>{filteredVehicles.map(v => <SelectItem key={v.id} value={v.id}>{`${v.make} ${v.model} (${v.plate})`}</SelectItem>)}</SelectContent></Select>{assignedVehicle && <p className="text-xs text-muted-foreground">Asignación activa: {assignedVehicle.make} {assignedVehicle.model} ({assignedVehicle.plate})</p>}{isWeeklyRent && selectedClientId && !assignedVehicle && <p className="text-xs text-destructive">Este cliente no tiene una asignación activa.</p>}<FormMessage /></FormItem>
              )} />
            </>
          )}

          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem><FormLabel>Importe</FormLabel><FormControl><Input type="number" step="0.01" className="border-2 border-input focus:border-primary rounded-lg" {...field} value={field.value === undefined ? '' : field.value} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} disabled={isSubmitting} placeholder="0.00" /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Concepto</FormLabel><FormControl><Textarea {...field} disabled={isSubmitting} placeholder="Concepto del ingreso o pago" className="rounded-lg" /></FormControl><FormMessage /></FormItem>
          )} />

          {recordType === 'payment' && (
            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
              <FormItem><FormLabel>Método de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value || 'Efectivo'} disabled={isSubmitting}><FormControl><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger></FormControl><SelectContent>{paymentMethods.map(method => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
          )}

          {(selectedClientId || selectedPartnerId) && selectedCategoryId && (amount || 0) > 0 && (() => {
            const category = financialCategories.find(c => c.id === selectedCategoryId) || selectedCategory;
            let previewBalance = currentBalance;
            let initialBalance = 0;
            let entityType: 'cliente' | 'socio' = isPartnerPayment ? 'socio' : 'cliente';
            let impactDescription = '';
            const amountValue = Number(amount || 0);
            const currentCreditBalance = activeCredit?.remainingBalance || 0;
            let newCreditBalance = currentCreditBalance;

            if (isPartnerPayment && selectedPartnerId) {
              const partner = partners.find(p => p.id === selectedPartnerId);
              initialBalance = partner?.initialBalance || 0;
              impactDescription = `Disminuye el saldo a pagar a ${entityName}.`;
              previewBalance = currentBalance - amountValue;
            } else if ((category?.name === SECURITY_DEPOSIT_CATEGORY || category?.affects === 'security_deposit')) {
              impactDescription = `Aumenta el depósito de garantía de ${entityName}. No afecta su balance.`;
            } else if (category?.name === 'Pago de Crédito') {
              previewBalance = currentBalance - amountValue;
              newCreditBalance = Math.max(0, currentCreditBalance - amountValue);
              impactDescription = `Disminuye el balance de ${entityName} y el saldo del crédito.`;
            } else if (category?.type === 'payment') {
              previewBalance = currentBalance - amountValue;
              impactDescription = `Disminuye el balance de ${entityName}.`;
            } else if (category?.type === 'income') {
              previewBalance = currentBalance + amountValue;
              impactDescription = `Aumenta el balance de ${entityName}.`;
            } else {
              return null;
            }

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
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">Nuevo Balance</p><div className="flex items-baseline gap-2"><p className={cn("text-xl font-bold", previewBalance > currentBalance ? 'text-green-600' : previewBalance < currentBalance ? 'text-red-600' : 'text-foreground')}>{formatCurrency(previewBalance)}</p>{previewBalance !== currentBalance && <span className={cn("text-xs", previewBalance > currentBalance ? 'text-green-600' : 'text-red-600')}>{previewBalance > currentBalance ? '+' : ''}{formatCurrency(previewBalance - currentBalance)}</span>}</div>{previewBalance <= 0 && (entityType === 'socio' || (entityType === 'cliente' && category?.type === 'payment')) && <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full"><Check className="h-3 w-3" />Saldo liquidado</span>}</div>
                  {category?.name === 'Pago de Crédito' && activeCredit && <div className="space-y-1"><p className="text-sm text-muted-foreground">Nuevo Saldo del Crédito</p><div className="flex items-baseline gap-2"><p className={cn("text-xl font-bold", newCreditBalance === 0 ? 'text-green-600' : 'text-orange-600')}>{formatCurrency(newCreditBalance)}</p><span className="text-xs text-green-600">-{formatCurrency(currentCreditBalance - newCreditBalance)}</span>{newCreditBalance <= 0 && <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full"><Check className="h-3 w-3" />Crédito Liquidado</span>}</div></div>}
                </div>
                {previewBalance < 0 && entityType === 'cliente' && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Advertencia</AlertTitle><AlertDescription>La entidad quedará con balance a favor.</AlertDescription></Alert>}
                {paymentMethod === 'Uso de Depósito en Garantía' && (clients.find(c => c.id === selectedClientId)?.securityDeposit || 0) < amountValue && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>El monto excede el depósito en garantía disponible.</AlertDescription></Alert>}
              </div>
            );
          })()}

          <DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button><Button type="submit" disabled={isSubmitting || (isWeeklyRent && !!selectedClientId && !assignedVehicle?.id)}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : <><Check className="mr-2 h-4 w-4" />Registrar ingreso</>}</Button></DialogFooter>
        </form>
      </Form>

      <CategoryCreationModal open={isNewCategoryModalOpen} onOpenChange={setIsNewCategoryModalOpen} companies={companies} type="income" onCreated={category => form.setValue('categoryId', category.id, { shouldValidate: true })} />
    </>
  );
};

const CategoryCreationModal = ({ open, onOpenChange, companies, type, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; companies: Company[]; type: 'income' | 'payment'; onCreated: (category: FinancialCategory) => void }) => {
  const { addFinancialCategory } = useFinances();
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [affects, setAffects] = useState<FinancialCategory['affects']>('client_balance');
  const [description, setDescription] = useState('');
  const [companyId, setCompanyId] = useState<string>(currentUser?.companyId || companies[0]?.id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setName(''); setDescription(''); setCompanyId(currentUser?.companyId || companies[0]?.id || ''); setAffects('client_balance'); } }, [open, currentUser?.companyId, companies]);

  const save = async () => {
    if (!name.trim()) return toast.error('El nombre es obligatorio');
    if (currentUser?.role === 'superAdmin' && !companyId) return toast.error('Selecciona una empresa');
    setSaving(true);
    try {
      const category = await addFinancialCategory({ name: name.trim(), type, affects, description, companyId: companyId || currentUser?.companyId });
      if (category) { onCreated(category); toast.success(`Categoría "${category.name}" creada.`); }
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al crear categoría', { description: error instanceof Error ? error.message : 'Error desconocido' });
    } finally { setSaving(false); }
  };

  return <FormModal isOpen={open} onClose={() => onOpenChange(false)} title="Crear nueva categoría"><div className="space-y-4"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de categoría" /><Select value={affects} onValueChange={v => setAffects(v as FinancialCategory['affects'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="client_balance">Balance de Cliente</SelectItem><SelectItem value="partner_balance">Balance de Socio</SelectItem><SelectItem value="none">Ninguno</SelectItem></SelectContent></Select><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional" />{currentUser?.role === 'superAdmin' && <Select value={companyId} onValueChange={setCompanyId}><SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></DialogFooter></div></FormModal>;
};

export default IncomeForm;
