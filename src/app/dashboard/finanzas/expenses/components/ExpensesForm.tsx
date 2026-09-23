"use client";

import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFinances } from "@/contexts/providers/finances-provider";
import { useVehicles } from "@/contexts/providers/vehicles-provider";
import { useClients } from "@/contexts/providers/clients-provider";
import { useData } from "@/contexts/data-provider";
import type { FinancialRecord, Company, FinancialCategory } from "@/types";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultipleFileInput } from "@/components/common/multiple-file-input";
import { infallibleNormalizeDate } from "@/lib/date-utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-provider";
import { Loader2, Plus, PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal } from "@/components/common/form-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PARTNER_PAYMENT_CATEGORY_ID } from "@/contexts/finance-constants";

const newCategoryValue = "createNewCategory";
const NONE_SELECT_VALUE = "@none";

const lineSchema = z.object({
  concept: z.string().trim().min(1, "El concepto es obligatorio."),
  amount: z.coerce.number({ invalid_type_error: "El importe debe ser un número." }).positive("El importe debe ser mayor que cero."),
  catalogItemId: z.string().nullable().optional(),
  quantity: z.coerce.number().positive().default(1),
  unitAmount: z.coerce.number().nonnegative().optional(),
  partNumber: z.string().nullable().optional(),
  warrantyDays: z.coerce.number().int().nonnegative().nullable().optional(),
  warrantyExpiresAt: z.string().nullable().optional(),
});

const expenseSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria."),
  clientId: z.preprocess(
    value => value === NONE_SELECT_VALUE ? null : value,
    z.string().uuid().nullable().optional(),
  ),
  // Un gasto general de empresa no requiere vehículo ni cliente.\n  // Si existe vehículo, el gasto queda asociado a esa unidad.\n  vehicleId: z.preprocess(\n    value => value === NONE_SELECT_VALUE || value === "" ? null : value,\n    z.string().uuid().nullable().optional(),\n  ),
  items: z.array(lineSchema).min(1, "Agrega al menos un concepto de gasto."),
  description: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es obligatoria."),
  mileageAtExpense: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : Number(String(val).replace(/\D/g, "")),
    z.number().optional(),
  ),
  evidenceUrls: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  companyId: z.string().optional().nullable(),
  paymentMethod: z.enum(["company_pays_for_partner", "partner_pays", "company_absorbs"]).default("company_pays_for_partner"),
});

export type ExpensesFormValues = z.infer<typeof expenseSchema>;

interface ExpensesFormProps {
  onSubmit: (data: ExpensesFormValues) => void;
  initialData?: Partial<FinancialRecord> | null;
  companies: Company[];
  expenseCategories: FinancialCategory[];
  isSubmitting: boolean;
  onClose: () => void;
}

export interface ExpensesFormHandles { submit: () => void; }

interface CatalogItem {
  id: string;
  name: string;
  part_number: string | null;
  brand: string | null;
  unit: string;
  default_cost: number | null;
  warranty_days: number | null;
  compatibility: string | null;
}

const emptyLine = () => ({
  concept: "",
  amount: 0,
  catalogItemId: null,
  quantity: 1,
  unitAmount: undefined,
  partNumber: null,
  warrantyDays: null,
  warrantyExpiresAt: null,
});

const NewCategoryModal = ({ open, onOpenChange, onCategoryCreated, type, companies }: { open: boolean; onOpenChange: (open: boolean) => void; onCategoryCreated: (category: FinancialCategory) => void; type: "income" | "expense"; companies: Company[] }) => {
  const { addFinancialCategory } = useFinances();
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [affects, setAffects] = useState<FinancialCategory["affects"]>("none");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(currentUser?.companyId || null);

  useEffect(() => {
    if (open) {
      setName(""); setAffects("none"); setDescription(""); setCompanyId(currentUser?.companyId || null);
    }
  }, [open, currentUser?.companyId]);

  const save = async () => {
    if (name.trim().length < 2 || (currentUser?.role === "superAdmin" && !companyId)) return;
    setSaving(true);
    try {
      const created = await addFinancialCategory({ name: name.trim(), type, affects, description: description.trim() || undefined, companyId: companyId || currentUser?.companyId }, true);
      if (!created) throw new Error("No se pudo crear la categoría.");
      toast.success(`Categoría "${created.name}" creada.`);
      onCategoryCreated(created);
      onOpenChange(false);
    } catch (error) {
      toast.error("Error al crear categoría", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally { setSaving(false); }
  };

  return (
    <FormModal isOpen={open} onClose={() => onOpenChange(false)} title={`Crear Nueva Categoría de ${type === "income" ? "Ingreso" : "Gasto"}`}>
      <div className="space-y-4">
        {currentUser?.role === "superAdmin" && (
          <div className="space-y-2"><label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Empresa</label><Select value={companyId || ""} onValueChange={setCompanyId}><SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        )}
        <div className="space-y-2"><label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Nombre de la nueva categoría</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Taller de carrocería" /></div>
        <div className="space-y-2"><label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Afecta a</label><Select value={affects} onValueChange={v => setAffects(v as FinancialCategory["affects"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="client_balance">Balance de Cliente</SelectItem><SelectItem value="partner_balance">Balance de Socio</SelectItem><SelectItem value="none">Ninguno / Empresa</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Descripción (Opcional)</label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe cómo se utiliza esta categoría." /></div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || name.trim().length < 2 || (currentUser?.role === "superAdmin" && !companyId)}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear categoría</Button></div>
      </div>
    </FormModal>
  );
};

const ExpensesForm = forwardRef<ExpensesFormHandles, ExpensesFormProps>(({ onSubmit, initialData, companies, expenseCategories, isSubmitting, onClose }, ref) => {
  const { vehicles } = useVehicles();
  const isEditing = Boolean(initialData?.id);
  const { clients } = useClients();
  const { selectedCompanyId: globalCompanyId } = useData();
  const { currentUser } = useAuth();
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const existingItems = useMemo(() => {
    const raw = initialData?.items;
    if (!Array.isArray(raw)) return [emptyLine()];
    const mapped = raw.map((item: any) => ({
      concept: String(item.concept || ""), amount: Number(item.amount || 0), catalogItemId: item.catalogItemId || null,
      quantity: Number(item.quantity || 1), unitAmount: item.unitAmount != null ? Number(item.unitAmount) : Number(item.amount || 0),
      partNumber: item.partNumber || null, warrantyDays: item.warrantyDays != null ? Number(item.warrantyDays) : null, warrantyExpiresAt: item.warrantyExpiresAt || null,
    }));
    return mapped.length ? mapped : [emptyLine()];
  }, [initialData]);

  const defaultValues = useMemo(() => {
    const companyCtx = initialData?.companyId || (currentUser?.role !== "superAdmin" ? currentUser?.companyId : globalCompanyId) || null;
    return {
      date: initialData?.date ? format(infallibleNormalizeDate(initialData.date)!, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      clientId: initialData?.clientId || NONE_SELECT_VALUE,
      vehicleId: initialData?.vehicleId || "",
      items: existingItems,
      description: initialData?.description || "",
      categoryId: initialData?.categoryId || "",
      mileageAtExpense: initialData?.mileageAtExpense ?? undefined,
      evidenceUrls: initialData?.evidenceUrls ?? [],
      companyId: companyCtx,
      paymentMethod: (initialData?.paymentMethod as ExpensesFormValues["paymentMethod"]) || "company_pays_for_partner",
    };
  }, [initialData, currentUser, globalCompanyId, existingItems]);

  const form = useForm<ExpensesFormValues>({ resolver: zodResolver(expenseSchema), defaultValues });
  const { control, handleSubmit, setValue, reset, formState: { isDirty } } = form;

  // Al editar un gasto existente, los campos contables/relacionales permanecen inmutables.
  // La edición permitida se limita a fecha, descripción, método de pago y evidencia.
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  const selectedClientId = useWatch({ control, name: "clientId" });
  const formCompanyId = useWatch({ control, name: "companyId" });
  const selectedVehicleId = useWatch({ control, name: "vehicleId" });
  const selectedCategoryId = useWatch({ control, name: "categoryId" });
  const watchedItems = useWatch({ control, name: "items", defaultValue: defaultValues.items });

  const handleInvalidSubmit = () => {
    toast.error("No se puede guardar el gasto", { description: "Revisa que cada línea tenga concepto e importe mayor que cero, además de vehículo y categoría." });
  };

  const submitForm = (data: ExpensesFormValues) => {
    const items = data.items.map(item => {
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const enteredUnitAmount = Number(item.unitAmount);
      const enteredAmount = Number(item.amount);
      const unitAmount = Number.isFinite(enteredUnitAmount) && enteredUnitAmount > 0
        ? enteredUnitAmount
        : Number.isFinite(enteredAmount) && enteredAmount > 0
          ? enteredAmount / quantity
          : 0;
      const amount = unitAmount > 0
        ? quantity * unitAmount
        : Number.isFinite(enteredAmount) && enteredAmount > 0
          ? enteredAmount
          : 0;
      return { ...item, quantity, unitAmount, amount };
    });
    onSubmit({ ...data, clientId: data.clientId || null, items });
  };

  useImperativeHandle(ref, () => ({ submit: () => void handleSubmit(submitForm, handleInvalidSubmit)() }), [handleSubmit, submitForm]);

  useEffect(() => {
    let cancelled = false;
    if (!formCompanyId) { setCatalogItems([]); return; }
    setCatalogLoading(true);
    void supabase.from("catalog_items").select("id,name,part_number,brand,unit,default_cost,warranty_days,compatibility").eq("company_id", formCompanyId).eq("is_deleted", false).eq("is_active", true).order("name").then(({ data, error }) => {
      if (cancelled) return;
      if (error) { toast.error("No se pudo cargar el catálogo de refacciones", { description: error.message }); setCatalogItems([]); }
      else setCatalogItems((data || []) as CatalogItem[]);
      setCatalogLoading(false);
    });
    return () => { cancelled = true; };
  }, [formCompanyId]);

  const activeClients = useMemo(() => {
    if (currentUser?.role === "superAdmin") return formCompanyId ? clients.filter(c => c.companyId === formCompanyId && c.status === "active" && !c.isDeleted) : clients.filter(c => c.status === "active" && !c.isDeleted);
    return clients.filter(c => c.companyId === currentUser?.companyId && c.status === "active" && !c.isDeleted);
  }, [clients, currentUser, formCompanyId]);

  const selectableVehicles = useMemo(() => {
    const companyId = formCompanyId || currentUser?.companyId;
    if (!companyId) return [];
    return vehicles.filter(v => v.companyId === companyId && (v.status === "active" || v.status === "rented") && !v.isDeleted);
  }, [vehicles, formCompanyId, currentUser?.companyId]);

  const selectedClient = useMemo(() => (
    selectedClientId && selectedClientId !== NONE_SELECT_VALUE
      ? clients.find(c => c.id === selectedClientId) || null
      : null
  ), [clients, selectedClientId]);

  const availableVehicles = useMemo(() => {
    if (!selectedClient) return selectableVehicles;
    const assignedVehicleId = selectedClient.assignedVehicleId || null;
    return selectableVehicles.filter(v =>
      (assignedVehicleId && v.id === assignedVehicleId) ||
      v.clientId === selectedClient.id
    );
  }, [selectedClient, selectableVehicles]);

  const selectableCategories = useMemo(() => {
    const companyId = formCompanyId || currentUser?.companyId;
    const categories = expenseCategories.filter(cat => cat.type === "expense" && cat.id !== PARTNER_PAYMENT_CATEGORY_ID && (cat.isDefault || cat.companyId === companyId));
    const map = new Map<string, FinancialCategory>();
    categories.forEach(cat => { if (!map.has(cat.name) || !cat.isDefault) map.set(cat.name, cat); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [expenseCategories, formCompanyId, currentUser?.companyId]);

  const selectedVehicle = useMemo(() => selectedVehicleId ? vehicles.find(v => v.id === selectedVehicleId) : null, [selectedVehicleId, vehicles]);\n  const isCompanyExpense = !selectedClientId || selectedClientId === NONE_SELECT_VALUE;

  const selectedCategory = useMemo(
    () => expenseCategories.find(category => category.id === selectedCategoryId) || null,
    [expenseCategories, selectedCategoryId]
  );

  useEffect(() => {
    if (selectedVehicle && form.getValues("mileageAtExpense") === undefined) {
      setValue("mileageAtExpense", selectedVehicle.currentMileage);
    }
  }, [selectedVehicle, setValue, form]);

  useEffect(() => {
    if (initialData?.id || !selectedVehicle || !selectedCategory) return;
    if (selectedCategory.name.trim().toLowerCase() !== "administración de vehículo") return;

    const adminAmount = Number(selectedVehicle.adminCommission ?? 0);
    if (!Number.isFinite(adminAmount) || adminAmount <= 0) return;

    setValue("items", [{
      concept: "Costo por administración",
      quantity: 1,
      unitAmount: adminAmount,
      amount: adminAmount,
      catalogItemId: null,
      partNumber: null,
      warrantyDays: null,
      warrantyExpiresAt: null,
    }], { shouldDirty: true, shouldValidate: true });
  }, [initialData?.id, selectedVehicle, selectedCategory, setValue]);

  const normalizedItems = useMemo(() => watchedItems.map(item => {
    const quantity = Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
    const enteredUnitAmount = Number(item?.unitAmount);
    const enteredAmount = Number(item?.amount);
    const unitAmount = Number.isFinite(enteredUnitAmount) && enteredUnitAmount > 0
      ? enteredUnitAmount
      : Number.isFinite(enteredAmount) && enteredAmount > 0
        ? enteredAmount / quantity
        : 0;
    const amount = unitAmount > 0
      ? quantity * unitAmount
      : Number.isFinite(enteredAmount) && enteredAmount > 0
        ? enteredAmount
        : 0;
    return { ...item, quantity, unitAmount, amount };
  }), [watchedItems]);

  const total = useMemo(() => normalizedItems.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0), [normalizedItems]);

  const applyCatalogItem = (index: number, item: CatalogItem) => {
    const quantity = Number(form.getValues(`items.${index}.quantity`)) || 1;
    const unitAmount = item.default_cost != null ? Number(item.default_cost) : Number(form.getValues(`items.${index}.unitAmount`) || 0);
    setValue(`items.${index}.catalogItemId`, item.id, { shouldDirty: true });
    setValue(`items.${index}.concept`, item.name, { shouldDirty: true });
    setValue(`items.${index}.partNumber`, item.part_number, { shouldDirty: true });
    setValue(`items.${index}.warrantyDays`, item.warranty_days, { shouldDirty: true });
    setValue(`items.${index}.unitAmount`, unitAmount, { shouldDirty: true });
    setValue(`items.${index}.amount`, quantity * unitAmount, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <>
      <Form {...form}>
        <form id="expenses-form" onSubmit={handleSubmit(submitForm, handleInvalidSubmit)} className="space-y-5 p-1">
          {currentUser?.role === "superAdmin" && <FormField control={control} name="companyId" render={({ field }) => <FormItem><FormLabel>Empresa</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isSubmitting || isEditing || (!!selectedClientId && selectedClientId !== NONE_SELECT_VALUE)}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger></FormControl><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField control={control} name="date" render={({ field }) => <FormItem><FormLabel>Fecha del gasto</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={control} name="clientId" render={({ field }) => <FormItem><FormLabel>Cliente (opcional)</FormLabel><Select onValueChange={v => field.onChange(v === NONE_SELECT_VALUE ? null : v)} value={field.value ?? NONE_SELECT_VALUE} disabled={isSubmitting || isEditing}><FormControl><SelectTrigger><SelectValue placeholder="-- Ninguno --" /></SelectTrigger></FormControl><SelectContent><SelectItem value={NONE_SELECT_VALUE}>-- Ninguno --</SelectItem>{activeClients.map(c => <SelectItem key={c.id} value={c.id}>{c.firstname} {c.lastname}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
            <FormField control={control} name="vehicleId" render={({ field }) => <FormItem><FormLabel>Vehículo (opcional)</FormLabel><Select onValueChange={v => field.onChange(v === NONE_SELECT_VALUE ? null : v)} value={field.value ?? NONE_SELECT_VALUE} disabled={isSubmitting || isEditing}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un vehículo" /></SelectTrigger></FormControl><SelectContent>{availableVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.make} {v.model} ({v.plate})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
            <FormField control={control} name="mileageAtExpense" render={({ field }) => <FormItem><FormLabel>Kilometraje (opcional)</FormLabel><FormControl><Input type="number" placeholder={selectedVehicle ? "Ej: 120500" : "No aplica a gasto general"} {...field} value={field.value ?? ""} disabled={isSubmitting || isEditing || !selectedVehicle} /></FormControl>{selectedVehicle && <p className="text-xs text-white/40">Último kilometraje registrado: {selectedVehicle.currentMileage.toLocaleString()} km</p>}<FormMessage /></FormItem>} />
            <FormField control={control} name="categoryId" render={({ field }) => <FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={v => v === newCategoryValue ? setIsNewCategoryModalOpen(true) : field.onChange(v)} value={field.value ?? ""} disabled={isSubmitting || isEditing}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger></FormControl><SelectContent>{selectableCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}{(currentUser?.role === "superAdmin" || currentUser?.role === "admin") && <SelectItem value={newCategoryValue}><span className="flex items-center"><PlusCircle className="mr-2 h-4 w-4" />Crear nueva categoría...</span></SelectItem>}</SelectContent></Select><FormMessage /></FormItem>} />
            <FormField control={control} name="paymentMethod" render={({ field }) => <FormItem><FormLabel>Pagado por</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isSubmitting}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="company_pays_for_partner">Empresa (afecta a socio)</SelectItem><SelectItem value="partner_pays">Socio (no afecta balance)</SelectItem><SelectItem value="company_absorbs">Empresa (absorbe el gasto)</SelectItem></SelectContent></Select></FormItem>} />
          </div>

          <FormField control={control} name="description" render={({ field }) => <FormItem><FormLabel>Descripción general (opcional)</FormLabel><FormControl><Input placeholder="Ej: Servicio de suspensión delantera" {...field} disabled={isSubmitting} /></FormControl></FormItem>} />

          <div className="space-y-4 rounded-[16px] border border-white/[0.07] bg-white/[0.02] p-4">\n            {isCompanyExpense && <div className="rounded-xl border border-[#d7ff3f]/10 bg-[#d7ff3f]/[0.04] px-3 py-2 text-xs text-white/55">Gasto general de empresa: no se asociará a vehículo, cliente, socio ni kilometraje.</div>}
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-white">Conceptos del gasto</h3><p className="text-xs text-white/40">Puedes registrar refacciones, mano de obra y otros conceptos dentro del mismo gasto.</p></div><Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine())} disabled={isSubmitting || isEditing}><Plus className="mr-1 h-4 w-4" />Agregar línea</Button></div>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const typed = watchedItems[index]?.concept || "";
                const suggestions = typed.trim().length >= 2 ? catalogItems.filter(item => `${item.name} ${item.part_number || ""} ${item.brand || ""}`.toLowerCase().includes(typed.toLowerCase())).slice(0, 6) : [];
                return <div key={field.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_100px_140px_40px] md:items-end">
                    <Controller control={control} name={`items.${index}.concept`} render={({ field: conceptField }) => <div className="space-y-2"><FormLabel>Concepto / refacción</FormLabel><div className="relative"><Input {...conceptField} placeholder="Escribe: horquilla, balatas, aceite..." disabled={isSubmitting || isEditing || catalogLoading} autoComplete="off" />{suggestions.length > 0 && <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#11151b] shadow-[0_18px_50px_rgba(0,0,0,.38)]">{suggestions.map(item => <button key={item.id} type="button" className="block w-full px-3 py-2 text-left text-white/80 hover:bg-[#d7ff3f]/10 hover:text-white" onMouseDown={e => e.preventDefault()} onClick={() => applyCatalogItem(index, item)}><div className="font-medium text-white/90">{item.name}</div><div className="text-xs text-white/40">{[item.brand, item.part_number, item.default_cost != null ? `$${Number(item.default_cost).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : null].filter(Boolean).join(" · ")}</div></button>)}</div>}</div></div>} />
                    <Controller control={control} name={`items.${index}.quantity`} render={({ field: quantityField }) => <div className="space-y-2"><FormLabel>Cantidad</FormLabel><Input type="number" min="1" step="1" {...quantityField} value={quantityField.value ?? 1} disabled={isSubmitting || isEditing} onChange={e => { const nextQuantity = Number(e.target.value) || 1; quantityField.onChange(e); const unit = Number(form.getValues(`items.${index}.unitAmount`)) || 0; setValue(`items.${index}.amount`, nextQuantity * unit, { shouldDirty: true, shouldValidate: true }); }} /></div>} />
                    <Controller control={control} name={`items.${index}.unitAmount`} render={({ field: unitField }) => <div className="space-y-2"><FormLabel>Importe unitario</FormLabel><Input type="number" min="0" step="0.01" placeholder="0.00" {...unitField} value={unitField.value ?? ""} disabled={isSubmitting || isEditing} onChange={e => { const nextUnit = Number(e.target.value) || 0; unitField.onChange(e); const currentQuantity = Number(form.getValues(`items.${index}.quantity`)) || 1; setValue(`items.${index}.amount`, currentQuantity * nextUnit, { shouldDirty: true, shouldValidate: true }); }} /></div>} />
                    <Button type="button" variant="ghost" size="icon" className="text-rose-400 hover:bg-rose-500/15 hover:text-rose-300" onClick={() => fields.length > 1 ? remove(index) : form.setValue(`items.${index}`, emptyLine(), { shouldDirty: true })} disabled={isSubmitting || isEditing}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between"><span className="text-xs text-white/40">Total de línea: <strong className="text-white/85">${Number(normalizedItems[index]?.amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></span>{watchedItems[index]?.partNumber && <span className="text-xs text-white/40">Parte: {watchedItems[index].partNumber}</span>}</div>
                  <input type="hidden" {...form.register(`items.${index}.catalogItemId`)} />
                  <input type="hidden" {...form.register(`items.${index}.partNumber`)} />
                  <input type="hidden" {...form.register(`items.${index}.warrantyDays`)} />
                  <input type="hidden" {...form.register(`items.${index}.warrantyExpiresAt`)} />
                </div>;
              })}
            </div>
            <div className="flex justify-end border-t border-white/[0.06] pt-3"><div className="text-right"><div className="text-sm text-white/40">Total del gasto</div><div className="font-heading text-2xl font-semibold tabular-nums text-white">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div></div></div>
          </div>

          <FormField control={control} name="evidenceUrls" render={({ field }) => <FormItem><FormLabel>Adjuntar archivos (facturas, tickets, etc.)</FormLabel><FormControl><MultipleFileInput initialValue={field.value as (string | File)[]} onFilesSelected={files => field.onChange(files)} disabled={isSubmitting} folder="financial_receipts" entityId={initialData?.id || form.getValues("vehicleId")} /></FormControl></FormItem>} />

          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button><Button type="submit" disabled={isSubmitting || !isDirty || total <= 0}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSubmitting ? "Guardando..." : "Guardar gasto"}</Button></div>
        </form>
      </Form>
      <NewCategoryModal open={isNewCategoryModalOpen} onOpenChange={setIsNewCategoryModalOpen} onCategoryCreated={category => form.setValue("categoryId", category.id, { shouldValidate: true, shouldDirty: true })} type="expense" companies={companies} />
    </>
  );
});

ExpensesForm.displayName = "ExpensesForm";
export default ExpensesForm;
