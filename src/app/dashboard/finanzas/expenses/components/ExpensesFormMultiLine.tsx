"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, useRef } from "react";
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
import { PackagePlus, Trash2, BadgeDollarSign, Receipt } from "lucide-react";
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
import { supabase } from '@/lib/supabase';

const newCategoryValue = "createNewCategory";
const NONE_SELECT_VALUE = "@none";

const expenseLineItemSchema = z.object({
  concept: z.string().min(1, "El concepto es obligatorio."),
  amount: z.coerce.number().positive("El monto debe ser mayor que cero."),
  catalogItemId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  warrantyDays: z.coerce.number().int().min(0).optional().nullable(),
  warrantyExpiresAt: z.string().optional().nullable(),
});

const expenseSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria."),
  clientId: z.string().optional().nullable(),
  vehicleId: z.string().min(1, "Debe seleccionar un vehículo."),
  items: z.array(expenseLineItemSchema).min(1, "Debe agregar al menos un artículo."),
  description: z.string().optional(),
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

export interface ExpensesFormHandles { submit: () => void; }
interface NewCategoryFormHandles { submit: () => void; }

const NewCategoryModal = ({ open, onOpenChange, onCategoryCreated, type, companies }: { open: boolean, onOpenChange: (open: boolean) => void, onCategoryCreated: (category: FinancialCategory) => void, type: 'income' | 'expense', companies: Company[] }) => {
  const { addFinancialCategory } = useFinances();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<NewCategoryFormHandles>(null);
  const NewCategoryForm = forwardRef<NewCategoryFormHandles, { onSubmit: (data: NewCategoryFormValues) => void }>(({ onSubmit }, ref) => {
    const newCategorySchema = useMemo(() => currentUser?.role === 'superAdmin' ? baseNewCategorySchema.superRefine((data, ctx) => { if (!data.companyId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Como Super Admin, debe seleccionar una empresa.", path: ['companyId'] }); }) : baseNewCategorySchema, [currentUser?.role]);
    const form = useForm<NewCategoryFormValues>({ resolver: zodResolver(newCategorySchema), defaultValues: { name: '', affects: 'none', description: '', companyId: currentUser?.companyId || null } });
    const submitButtonRef = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => ({ submit: () => submitButtonRef.current?.click() }));
    const affectsOptions: { value: FinancialCategory['affects']; label: string }[] = [
      { value: 'client_balance', label: 'Balance de Cliente' }, { value: 'partner_balance', label: 'Balance de Socio' }, { value: 'none', label: 'Ninguno / Contabilidad Interna' }
    ];
    return <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {currentUser?.role === 'superAdmin' && <FormField control={form.control} name="companyId" render={({ field }) => <FormItem><FormLabel>Empresa</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger></FormControl><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />}
      <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nombre de la Categoría</FormLabel><FormControl><Input {...field} placeholder="Ej: Reparaciones, Combustible..." /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="affects" render={({ field }) => <FormItem><FormLabel>Afecta a</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{affectsOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
      <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Descripción (Opcional)</FormLabel><FormControl><Textarea {...field} placeholder="Detalles adicionales..." /></FormControl><FormMessage /></FormItem>} />
      <button ref={submitButtonRef} type="submit" className="hidden" />
    </form></Form>;
  });
  NewCategoryForm.displayName = 'NewCategoryForm';
  const handleSubmit = async (data: NewCategoryFormValues) => {
    setIsSubmitting(true); try { const newCategory = await addFinancialCategory({ ...data, type, isDefault: false }, true); if (newCategory) { toast.success('Categoría creada exitosamente'); onCategoryCreated(newCategory); } onOpenChange(false); } catch (error) { console.error('Error creando categoría:', error); toast.error('Error al crear la categoría'); } finally { setIsSubmitting(false); }
  };
  return <FormModal isOpen={open} onClose={() => onOpenChange(false)} title="Nueva Categoría de Gasto" description="Crea una categoría personalizada para organizar tus gastos."><NewCategoryForm onSubmit={handleSubmit} ref={formRef} /></FormModal>;
};

export const ExpensesForm = forwardRef<ExpensesFormHandles, ExpensesFormProps>(({ onSubmit, initialData, companies, expenseCategories, isSubmitting, onClose }, ref) => {
  const { vehicles: rawVehicles } = useVehicles();
  const { clients } = useClients();
  const { partners } = useData();
  const { currentUser } = useAuth();
  const { uploadFile } = useStorage();
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState<FinancialCategory[]>(expenseCategories);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogItems, setCatalogItems] = useState<Array<{ id: string; name: string; part_number: string | null; default_supplier_id: string | null; default_cost: number | null; warranty_days: number | null }>>([]);

  const parseItemsFromDescription = (desc?: string): ExpensesFormValues['items'] => !desc ? [{ concept: '', amount: 0, catalogItemId: null, supplierId: null, partNumber: '', warrantyDays: null, warrantyExpiresAt: null }] : [{ concept: desc, amount: initialData?.amount || 0, catalogItemId: null, supplierId: null, partNumber: '', warrantyDays: null, warrantyExpiresAt: null }];
  const initialFormData = useMemo(() => {
    if (initialData) {
      const normalizedDate = infallibleNormalizeDate(initialData.date);
      return { date: normalizedDate ? format(normalizedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), vehicleId: initialData.vehicleId || '', clientId: initialData.clientId || null, items: (initialData as any).items || parseItemsFromDescription(initialData.description), description: initialData.description || '', categoryId: initialData.categoryId || '', mileageAtExpense: initialData.mileageAtExpense, evidenceUrls: initialData.evidenceUrls || [], companyId: currentUser?.role === 'superAdmin' ? (initialData.companyId || null) : currentUser?.companyId, paymentMethod: (initialData.paymentMethod as any) || 'company_pays_for_partner' };
    }
    return { date: format(new Date(), 'yyyy-MM-dd'), vehicleId: '', clientId: null, items: [{ concept: '', amount: 0, catalogItemId: null, supplierId: null, partNumber: '', warrantyDays: null, warrantyExpiresAt: null }], description: '', categoryId: '', mileageAtExpense: undefined, evidenceUrls: [], companyId: currentUser?.companyId || null, paymentMethod: 'company_pays_for_partner' as const };
  }, [initialData, currentUser]);

  const form = useForm<ExpensesFormValues>({ resolver: zodResolver(expenseSchema), defaultValues: initialFormData });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { loadDraft, clearDraft } = useAutoSave({ data: form.getValues(), storageKey: 'expense-form-draft', saveDelay: 2000, enableToast: true, isDirty: form.formState.isDirty });
  useFormKeyboardShortcuts({ onSave: () => { if (form.formState.isValid) form.handleSubmit(onSubmit)(); }, onClose, enabled: true });

  useEffect(() => { if (!initialData) { const draft = loadDraft(); if (draft) { form.reset(draft); toast.info('Borrador cargado automáticamente'); } } }, []);

  useEffect(() => {
    if (!currentUser?.companyId) return;
    const loadCatalogs = async () => {
      const [supplierResult, itemResult] = await Promise.all([
        supabase.from('suppliers').select('id,name').eq('company_id', currentUser.companyId).eq('is_deleted', false).eq('is_active', true).order('name'),
        supabase.from('catalog_items').select('id,name,part_number,default_supplier_id,default_cost,warranty_days').eq('company_id', currentUser.companyId).eq('is_deleted', false).eq('is_active', true).order('name'),
      ]);
      if (supplierResult.error) { console.error('Error cargando proveedores:', supplierResult.error); toast.error('No se pudieron cargar los proveedores'); }
      else setSuppliers(supplierResult.data || []);
      if (itemResult.error) { console.error('Error cargando catálogo:', itemResult.error); toast.error('No se pudo cargar el catálogo de artículos'); }
      else setCatalogItems(itemResult.data || []);
    };
    void loadCatalogs();
  }, [currentUser?.companyId]);

  const watchItems = form.watch("items");
  const totalAmount = useMemo(() => watchItems?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0, [watchItems]);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => ({ submit: () => submitButtonRef.current?.click() }));
  const selectedVehicleId = form.watch('vehicleId');
  const selectedCategoryId = form.watch('categoryId');

  useEffect(() => { const vehicle = rawVehicles.find(v => v.id === selectedVehicleId); form.setValue('clientId', vehicle?.clientId || null); }, [selectedVehicleId, rawVehicles, form]);
  useEffect(() => {
    const selectedCategory = localCategories.find(cat => cat.id === selectedCategoryId);
    const isPartnerPaymentCategory = selectedCategory?.id === PARTNER_PAYMENT_CATEGORY_ID || selectedCategory?.name?.trim().toLowerCase() === 'pago a socio';

    if (!isPartnerPaymentCategory) return;
    if (!selectedVehicleId) {
      form.setValue('clientId', null);
      return;
    }

    const selectedVehicle = rawVehicles.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle) return;

    form.setValue('clientId', NONE_SELECT_VALUE);
    if (!selectedVehicle.partnerId) {
      toast.error('El vehículo seleccionado no tiene socio asignado');
      form.setValue('categoryId', '');
      form.setValue('clientId', null);
    }
  }, [selectedCategoryId, localCategories, form, rawVehicles, selectedVehicleId]);

  const handleCatalogItemChange = (index: number, catalogItemId: string) => {
    const item = catalogItems.find(i => i.id === catalogItemId);
    if (!item) return;
    const supplierId = item.default_supplier_id || null;
    const warrantyDays = item.warranty_days ?? null;
    const purchaseDate = form.getValues('date');
    let warrantyExpiresAt: string | null = null;
    if (warrantyDays !== null && purchaseDate) { const d = new Date(`${purchaseDate}T00:00:00`); d.setDate(d.getDate() + warrantyDays); warrantyExpiresAt = d.toISOString().slice(0, 10); }
    form.setValue(`items.${index}.catalogItemId`, item.id, { shouldDirty: true });
    form.setValue(`items.${index}.concept`, item.name, { shouldDirty: true });
    form.setValue(`items.${index}.partNumber`, item.part_number || '', { shouldDirty: true });
    form.setValue(`items.${index}.supplierId`, supplierId, { shouldDirty: true });
    form.setValue(`items.${index}.warrantyDays`, warrantyDays, { shouldDirty: true });
    form.setValue(`items.${index}.warrantyExpiresAt`, warrantyExpiresAt, { shouldDirty: true });
    if (item.default_cost !== null && item.default_cost !== undefined) form.setValue(`items.${index}.amount`, Number(item.default_cost), { shouldDirty: true });
  };

  const recalculateWarranty = (index: number, date: string) => {
    const days = form.getValues(`items.${index}.warrantyDays`);
    if (days === null || days === undefined || !date) return;
    const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + Number(days));
    form.setValue(`items.${index}.warrantyExpiresAt`, d.toISOString().slice(0, 10), { shouldDirty: true });
  };

  const handleFormSubmit = async (data: ExpensesFormValues) => {
    try {
      const finalData = { ...data, items: data.items.map(item => ({ ...item, amount: Number(item.amount), vehicleId: data.vehicleId, warrantyExpiresAt: item.warrantyDays != null && data.date ? (() => { const d = new Date(`${data.date}T00:00:00`); d.setDate(d.getDate() + Number(item.warrantyDays)); return d.toISOString().slice(0, 10); })() : item.warrantyExpiresAt })) };
      if (data.evidenceUrls && data.evidenceUrls.length > 0) {
        const filesToUpload = data.evidenceUrls.filter(f => f instanceof File) as File[];
        if (filesToUpload.length > 0) { const uploadedUrls = await Promise.all(filesToUpload.map(file => uploadFile(file, 'financial_receipts', true))); const existingUrls = (data.evidenceUrls.filter(f => typeof f === 'string') as string[]) || []; finalData.evidenceUrls = [...existingUrls, ...uploadedUrls]; }
      }
      if (finalData.clientId === NONE_SELECT_VALUE) finalData.clientId = null;
      finalData.description = finalData.items.map((item, idx) => `${idx + 1}. ${item.concept}: $${Number(item.amount).toFixed(2)}`).join(' | ');
      clearDraft(); onSubmit(finalData); toast.success('Gasto guardado exitosamente');
    } catch (error) { console.error('Error uploading files:', error); toast.error('Error al subir archivos'); }
  };

  const selectedVehicle = rawVehicles.find(v => v.id === selectedVehicleId);
  const renderPaymentMethod = ({ field }: { field: any }) => (
    <FormItem>
      <FormLabel>Forma de pago / quién absorbe</FormLabel>
      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar responsable" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="company_pays_for_partner">Pagado por la empresa / afecta al socio</SelectItem>
          <SelectItem value="partner_pays">Pagado por el socio / no afecta al socio</SelectItem>
          <SelectItem value="company_absorbs">Absorbido por la empresa</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );

  const renderCategory = ({ field }: { field: any }) => (
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
            {localCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            <SelectItem value={newCategoryValue}>+ Crear nueva categoría</SelectItem>
          </SelectContent>
        </Select>
        {field.value === newCategoryValue && (
          <Button type="button" variant="outline" onClick={() => { setIsNewCategoryModalOpen(true); form.setValue('categoryId', ''); }}>
            Crear
          </Button>
        )}
      </div>
      <FormMessage />
    </FormItem>
  );

  return <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {currentUser?.role === 'superAdmin' && <FormField control={form.control} name="companyId" render={({ field }) => <FormItem><FormLabel>Empresa</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger></FormControl><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} onChange={e => { field.onChange(e); fields.forEach((_, index) => recalculateWarranty(index, e.target.value)); }} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="vehicleId" render={({ field }) => <FormItem><FormLabel>Vehículo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar vehículo..." /></SelectTrigger></FormControl><SelectContent>{rawVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} - {v.plate}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
        </div>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Artículos / Refacciones</CardTitle></CardHeader><CardContent className="space-y-4">
          {fields.map((field, index) => <div key={field.id} className="rounded-lg border p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_130px_auto] gap-2 items-start">
              <div><FormLabel>Artículo del catálogo</FormLabel><Select value={form.watch(`items.${index}.catalogItemId`) || ''} onValueChange={value => handleCatalogItemChange(index, value)}><SelectTrigger><SelectValue placeholder="Buscar refacción..." /></SelectTrigger><SelectContent>{catalogItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}{item.part_number ? ` · ${item.part_number}` : ''}</SelectItem>)}</SelectContent></Select></div>
              <FormField control={form.control} name={`items.${index}.concept`} render={({ field: f }) => <FormItem><FormLabel>Concepto</FormLabel><FormControl><Input {...f} placeholder="Ej: Filtro de aceite, Mano de obra..." /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name={`items.${index}.amount`} render={({ field: f }) => <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" step="0.01" {...f} placeholder="0.00" /></FormControl><FormMessage /></FormItem>} />
              {fields.length > 1 && <Button type="button" variant="ghost" size="icon" className="mt-8" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <FormItem><FormLabel>Proveedor</FormLabel><Select value={form.watch(`items.${index}.supplierId`) || ''} onValueChange={value => form.setValue(`items.${index}.supplierId`, value, { shouldDirty: true })}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger></FormControl><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></FormItem>
              <FormItem><FormLabel>Número de parte</FormLabel><FormControl><Input value={form.watch(`items.${index}.partNumber`) || ''} onChange={e => form.setValue(`items.${index}.partNumber`, e.target.value, { shouldDirty: true })} /></FormControl></FormItem>
              <FormItem><FormLabel>Garantía (días)</FormLabel><FormControl><Input type="number" min="0" value={form.watch(`items.${index}.warrantyDays`) ?? ''} onChange={e => { const value = e.target.value === '' ? null : Number(e.target.value); form.setValue(`items.${index}.warrantyDays`, value, { shouldDirty: true }); const date = form.getValues('date'); if (date && value != null) { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + value); form.setValue(`items.${index}.warrantyExpiresAt`, d.toISOString().slice(0,10), { shouldDirty: true }); } }} /></FormControl></FormItem>
            </div>
            <div className="text-xs text-muted-foreground">{form.watch(`items.${index}.warrantyExpiresAt`) ? `Vence garantía: ${form.watch(`items.${index}.warrantyExpiresAt`)}` : 'Sin garantía registrada'}</div>
          </div>)}
          <Button type="button" variant="outline" size="sm" onClick={() => append({ concept: '', amount: 0, catalogItemId: null, supplierId: null, partNumber: '', warrantyDays: null, warrantyExpiresAt: null })} className="w-full"><PackagePlus className="h-4 w-4 mr-2" />Agregar Artículo</Button>
          <Separator /><div className="flex justify-between items-center p-3 bg-muted rounded-lg"><span className="font-semibold flex items-center gap-2"><BadgeDollarSign className="h-5 w-5" />Total:</span><span className="text-2xl font-bold">${totalAmount.toFixed(2)}</span></div>
        </CardContent></Card>

        <FormField control={form.control} name="paymentMethod" render={renderPaymentMethod} />
        <FormField control={form.control} name="categoryId" render={renderCategory} />
        <FormField control={form.control} name="mileageAtExpense" render={({ field }) => <FormItem><FormLabel>Kilometraje al momento del gasto (Opcional)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} placeholder={selectedVehicle?.currentMileage ? `Actual: ${selectedVehicle.currentMileage.toLocaleString()} km` : ''} /></FormControl><FormDescription>{selectedVehicle?.currentMileage && `Kilometraje actual del vehículo: ${selectedVehicle.currentMileage.toLocaleString()} km`}</FormDescription><FormMessage /></FormItem>} />
        <FormField control={form.control} name="evidenceUrls" render={({ field }) => <FormItem><FormLabel>Evidencia (Opcional)</FormLabel><FormControl><MultipleFileInput initialValue={field.value || []} onFilesSelected={field.onChange} accept="image/*,application/pdf" folder="financial_receipts" /></FormControl><FormDescription>Sube fotos de facturas, tickets o comprobantes</FormDescription><FormMessage /></FormItem>} />
        <button ref={submitButtonRef} type="submit" className="hidden" />
      </form>
    </Form>
    <NewCategoryModal open={isNewCategoryModalOpen} onOpenChange={setIsNewCategoryModalOpen} onCategoryCreated={newCategory => { setLocalCategories([...localCategories, newCategory]); form.setValue('categoryId', newCategory.id); setIsNewCategoryModalOpen(false); }} type="expense" companies={companies} />
  </>;
});

ExpensesForm.displayName = 'ExpensesForm';