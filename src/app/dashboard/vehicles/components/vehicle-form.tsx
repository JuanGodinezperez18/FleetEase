"use client";

import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, forwardRef, useImperativeHandle, useEffect, useState, useCallback } from "react";
import { useData } from "@/hooks/use-data";
import type { Vehicle, Company } from "@/types";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultipleFileInput } from "@/components/common/multiple-file-input";
import { DollarSign, Building, Phone, PlusCircle, Info, Loader2, CalendarPlus, PackagePlus } from "lucide-react";
import { parseDateForInput } from "@/lib/date-utils";
import { useAuth } from "@/contexts/auth-provider";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CirculationCardScanner } from '@/components/vehicles/circulation-card-scanner';

const statusOptions = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'sold', label: 'Vendido' },
  { value: 'rented', label: 'Rentado' },
];

const NONE_SELECT_VALUE = "@none";
const CREATE_NEW_PARTNER_VALUE = "@create_new_partner";

const createVehicleSchema = (allVehicles: Vehicle[], editingVehicleId?: string) => z.object({
  alias: z.string().min(1, "El alias es requerido.").max(120),
  make: z.string().min(2, "La marca es requerida."),
  model: z.string().min(2, "El modelo es requerido."),
  year: z.coerce.number().min(1980, "El año debe ser posterior a 1980.").max(new Date().getFullYear() + 1, "El año no puede ser futuro."),
  plate: z.string().min(3, "La placa es requerida.").refine(value => {
    if (!value) return true;
    return !allVehicles.some(v => v.plate === value && v.id !== editingVehicleId);
  }, { message: "Esta placa ya está registrada." }),
  serialNumber: z.string().min(5, "El número de serie es requerido.").refine(value => {
    if (!value) return true;
    return !allVehicles.some(v => v.serialNumber === value && v.id !== editingVehicleId);
  }, { message: "Este número de serie ya está registrado." }),
  status: z.enum(['active', 'inactive', 'maintenance', 'sold', 'rented']),
  createdAt: z.string().optional().refine(value => !value || (value >= "2000-01-01" && value <= new Date().toISOString().slice(0, 10)), { message: "La fecha de creación debe estar entre el año 2000 y hoy." }),
  clientId: z.string().nullable(),
  partnerId: z.string().nullable(),
  cost: z.coerce.number().min(0, "El costo de adquisición no puede ser negativo.").optional(),
  weeklyRentalValue: z.coerce.number().min(0, "La renta por semana no puede ser negativa.").optional(),
  adminCommission: z.coerce.number().min(0, "El costo de administración no puede ser negativo.").optional(),
  lastMaintenanceMileage: z.coerce.number().min(0, "El kilometraje del último mantenimiento no puede ser negativo.").optional(),
  currentMileage: z.coerce.number().min(0, "El kilometraje no puede ser negativo."),
  acquisitionDate: z.string().min(1, "La fecha de adquisición es requerida."),
  insurancePolicyNumber: z.string().trim().min(1, "El número de póliza es requerido.").refine(value => {
    return !allVehicles.some(v => v.insurancePolicyNumber === value && v.id !== editingVehicleId);
  }, { message: "Este número de póliza ya está en uso." }),
  insuranceExpiryDate: z.string().min(1, "La fecha de vencimiento de la póliza es requerida."),
  color: z.string().trim().min(1, "El color es requerido."),
  imageUrl: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  circulationCardUrl: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  insurancePolicyDocumentUrl: z.array(z.union([z.string(), z.instanceof(File)])).min(1, "El documento de la póliza es requerido."),
  companyId: z.string().nullable(),
  gpsPhoneNumber: z.string().optional().or(z.literal('')).refine(value => {
    if (!value) return true;
    return !allVehicles.some(v => v.gpsPhoneNumber === value && v.id !== editingVehicleId);
  }, { message: "Este número de teléfono GPS ya está en uso." }),
  gpsPhoneCompany: z.string().optional().or(z.literal('')),
}).superRefine((values, ctx) => {
  if (
    values.lastMaintenanceMileage !== undefined &&
    values.currentMileage !== undefined &&
    values.lastMaintenanceMileage > values.currentMileage
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lastMaintenanceMileage'],
      message: "El último mantenimiento no puede ser mayor que el kilometraje actual.",
    });
  }
});

export type VehicleFormValues = z.infer<ReturnType<typeof createVehicleSchema>>;

interface VehicleFormProps {
  onSuccess: () => void;
  onSubmit: (data: VehicleFormValues) => void;
  initialData?: Partial<Vehicle> | null;
  onOpenPartnerModal: (companyId: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

export interface VehicleFormHandles {
    submit: () => void;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({ onSuccess, onSubmit, initialData, onOpenPartnerModal, isSubmitting, onClose }) => {
    const { clients, partners, credits, rawVehicles, addVehicle, updateVehicle } = useData();
    const { currentUser } = useAuth();

    const vehicleSchema = useMemo(() => createVehicleSchema(rawVehicles, initialData?.id), [rawVehicles, initialData]);

    const initialValues: VehicleFormValues = useMemo(() => ({
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      make: initialData?.make || "",
      model: initialData?.model || "",
      year: initialData?.year || new Date().getFullYear(),
      plate: initialData?.plate || "",
      serialNumber: initialData?.serialNumber || "",
      status: initialData?.status || "active",
      createdAt: parseDateForInput(initialData?.createdAt) || parseDateForInput(new Date().toISOString()),
      clientId: initialData?.clientId || null,
      partnerId: initialData?.partnerId || null,
      cost: initialData?.cost || undefined,
      weeklyRentalValue: initialData?.weeklyRentalValue || undefined,
      adminCommission: initialData?.adminCommission || undefined,
      lastMaintenanceMileage: initialData?.lastMaintenanceMileage || undefined,
      currentMileage: initialData?.currentMileage || 0,
      acquisitionDate: parseDateForInput(initialData?.acquisitionDate),
      insuranceExpiryDate: parseDateForInput(initialData?.insuranceExpiryDate),
      insurancePolicyNumber: initialData?.insurancePolicyNumber || "",
      color: initialData?.color || "",
      imageUrl: initialData?.imageUrl ? [initialData.imageUrl as string] : [],
      circulationCardUrl: initialData?.circulationCardUrl ? [initialData.circulationCardUrl as string] : [],
      insurancePolicyDocumentUrl: initialData?.insurancePolicyDocumentUrl ? [initialData.insurancePolicyDocumentUrl as string] : [],
      companyId: initialData?.companyId || currentUser?.companyId || null,
      gpsPhoneNumber: initialData?.gpsPhoneNumber || "",
      gpsPhoneCompany: initialData?.gpsPhoneCompany || "",
    }), [initialData, currentUser]);

    const form = useForm<VehicleFormValues>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: initialValues,
        mode: 'onChange'
    });

    const hasActiveCredit = useMemo(() => {
        if (!initialData || !credits) return false;
        return credits.some(c => c.vehicleId === initialData.id && c.status === 'active' && !c.isDeleted);
    }, [credits, initialData]);

    const handleDataExtracted = useCallback((data: {
      make?: string;
      model?: string;
      year?: number;
      plate?: string;
      serialNumber?: string;
      color?: string;
      registrationDate?: string;
    }) => {
      if (data.make) form.setValue('make', data.make, { shouldValidate: true });
      if (data.model) form.setValue('model', data.model, { shouldValidate: true });
      if (data.year) form.setValue('year', data.year, { shouldValidate: true });
      if (data.plate) form.setValue('plate', data.plate.toUpperCase(), { shouldValidate: true });
      if (data.serialNumber) form.setValue('serialNumber', data.serialNumber.toUpperCase(), { shouldValidate: true });
      if (data.color) form.setValue('color', data.color, { shouldValidate: true });
      if (data.registrationDate) form.setValue('acquisitionDate', data.registrationDate, { shouldValidate: true });
      toast.success('Datos del vehículo cargados', { description: 'Revisa y completa la información faltante' });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activePartners = useMemo(() => {
        const partnersForCompany = partners.filter(p => !p.isDeleted);
        if (initialData?.partnerId) {
            const currentPartner = partners.find(p => p.id === initialData.partnerId);
            if (currentPartner && !partnersForCompany.some(p => p.id === currentPartner.id)) partnersForCompany.push(currentPartner);
        }
        return partnersForCompany;
    }, [partners, initialData?.partnerId]);

    const assignableClients = useMemo(() => {
      const companyClients = clients.filter(c => c.status === 'active' && !c.isDeleted);
      const assignedClientIds = new Set(rawVehicles.filter(v => v.clientId && v.id !== initialData?.id).map(v => v.clientId));
      const available = companyClients.filter(c => !assignedClientIds.has(c.id));
      if (initialData?.clientId) {
        const currentClient = companyClients.find(c => c.id === initialData.clientId);
        if (currentClient && !available.some(c => c.id === currentClient.id)) available.push(currentClient);
      }
      return available;
    }, [clients, rawVehicles, initialData]);

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <div className="pr-1 sm:pr-3">
            <div className="space-y-5 p-1 sm:space-y-6">
              {!initialData && (
                <div className="rounded-[14px] border border-[#d7ff3f]/10 bg-white/[0.025] p-5 shadow-[0_12px_35px_rgba(0,0,0,.14)]">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white/90">¿Tienes la tarjeta de circulación?</h3>
                      <p className="mt-1 text-xs text-white/50">Escanéala para llenar automáticamente los datos del vehículo</p>
                    </div>
                    <CirculationCardScanner onDataExtracted={handleDataExtracted} disabled={isSubmitting} />
                  </div>
                </div>
              )}

              <section className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
                <div className="mb-4 flex items-center gap-3"><div className="h-5 w-1 rounded-full bg-[#d7ff3f]" /><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">Identificación</p><h3 className="text-base font-semibold text-white">Datos del vehículo</h3></div></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField name="alias" control={form.control} render={({field}) => <FormItem><FormLabel>Alias del vehículo</FormLabel><FormControl><Input {...field} placeholder="Ej. Versa Juan 01" disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="make" control={form.control} render={({field}) => <FormItem><FormLabel>Marca</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="model" control={form.control} render={({field}) => <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="year" control={form.control} render={({field}) => <FormItem><FormLabel>Año</FormLabel><FormControl><Input type="number" {...field} onFocus={e => e.currentTarget.select()} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="plate" control={form.control} render={({field}) => <FormItem><FormLabel>Placa</FormLabel><FormControl><Input {...field} className="uppercase" disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="serialNumber" control={form.control} render={({field}) => <FormItem className="sm:col-span-2"><FormLabel>No. Serie</FormLabel><FormControl><Input {...field} className="uppercase" disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="color" control={form.control} render={({field}) => <FormItem><FormLabel>Color <span className="text-rose-400" aria-hidden="true">*</span></FormLabel><FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="status" control={form.control} render={({field}) => <FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger></FormControl><SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
                <div className="mb-4 flex items-center gap-3"><div className="h-5 w-1 rounded-full bg-white/30" /><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Registro</p><h3 className="text-base font-semibold text-white">Fecha de creación</h3></div></div>
                <FormField name="createdAt" control={form.control} render={({field}) => <FormItem className="max-w-sm"><FormLabel className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" />Fecha de Creación</FormLabel><FormControl><Input type="date" min="2000-01-01" max={parseDateForInput(new Date())} {...field} onFocus={e => e.currentTarget.select()} disabled={!!initialData || isSubmitting} className={!!initialData ? "bg-muted cursor-not-allowed" : ""} /></FormControl>{!!initialData && <p className="text-xs text-muted-foreground">Esta fecha no se puede modificar después de crear el vehículo</p>}<FormMessage /></FormItem>} />
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
                <div className="mb-4 flex items-center gap-3"><div className="h-5 w-1 rounded-full bg-white/30" /><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Conectividad</p><h3 className="text-base font-semibold text-white">GPS</h3></div></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField name="gpsPhoneNumber" control={form.control} render={({field}) => <FormItem><FormLabel>Teléfono GPS (Opcional)</FormLabel><FormControl><div className="relative"><Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="tel" {...field} value={field.value ?? ''} className="pl-8" disabled={isSubmitting} /></div></FormControl><FormMessage /></FormItem>} />
                  <FormField name="gpsPhoneCompany" control={form.control} render={({field}) => <FormItem><FormLabel>Compañía GPS (Opcional)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
                <div className="mb-4 flex items-center gap-3"><div className="h-5 w-1 rounded-full bg-[#d7ff3f]" /><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">Operación</p><h3 className="text-base font-semibold text-white">Asignación</h3></div></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField name="clientId" control={form.control} render={({field}) => <FormItem><FormLabel>Conductor Asignado</FormLabel><Select onValueChange={value => field.onChange(value === NONE_SELECT_VALUE ? null : value)} value={field.value ?? NONE_SELECT_VALUE} disabled={isSubmitting || hasActiveCredit}><FormControl><SelectTrigger><SelectValue placeholder="-- Ninguno --" /></SelectTrigger></FormControl><SelectContent><SelectItem value={NONE_SELECT_VALUE}>Ninguno</SelectItem>{assignableClients.map(c => <SelectItem key={c.id} value={c.id}>{`${c.firstname} ${c.lastname}`}</SelectItem>)}</SelectContent></Select>{hasActiveCredit && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Info className="h-3 w-3" />No se puede cambiar el conductor, vehículo ligado a un crédito activo.</p>}<FormMessage /></FormItem>} />
                  <FormField name="partnerId" control={form.control} render={({field}) => <FormItem><FormLabel>Socio Propietario</FormLabel><Select onValueChange={value => { if (value === CREATE_NEW_PARTNER_VALUE) { onOpenPartnerModal(form.getValues('companyId') || ''); } else { field.onChange(value === NONE_SELECT_VALUE ? null : value); } }} value={field.value ?? NONE_SELECT_VALUE} disabled={isSubmitting}><FormControl><SelectTrigger><SelectValue placeholder="-- Ninguno --" /></SelectTrigger></FormControl><SelectContent><SelectItem value={NONE_SELECT_VALUE}>Ninguno</SelectItem>{activePartners.map(p => <SelectItem key={p.id} value={p.id}>{`${p.firstname} ${p.lastname}`}</SelectItem>)}<SelectItem value={CREATE_NEW_PARTNER_VALUE} className="text-primary focus:bg-primary/10 focus:text-primary"><span className="flex items-center"><PlusCircle className="mr-2 h-4 w-4" />Crear nuevo socio...</span></SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
                <div className="mb-4 flex items-center gap-3"><div className="h-5 w-1 rounded-full bg-white/30" /><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Finanzas</p><h3 className="text-base font-semibold text-white">Adquisición y renta</h3></div></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <FormField name="cost" control={form.control} render={({field}) => <FormItem><FormLabel>Costo Adquisición</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" min="0" inputMode="decimal" {...field} value={field.value ?? ''} className="pl-8 tabular-nums" placeholder="0.00" disabled={isSubmitting} /></div></FormControl><FormMessage /></FormItem>} />
                  <FormField name="weeklyRentalValue" control={form.control} render={({field}) => <FormItem><FormLabel>Renta por Semana</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" min="0" inputMode="decimal" {...field} value={field.value ?? ''} className="pl-8 tabular-nums" placeholder="0.00" disabled={isSubmitting} /></div></FormControl><FormMessage /></FormItem>} />
                  <FormField name="adminCommission" control={form.control} render={({field}) => <FormItem><FormLabel>Costo de Administración</FormLabel><FormControl><div className="relative"><span className="absolute left-2.5 top-2.5 text-sm text-muted-foreground">$</span><Input type="number" step="0.01" min="0" inputMode="decimal" {...field} value={field.value ?? ''} className="pl-7 tabular-nums" placeholder="0.00" disabled={isSubmitting} /></div></FormControl><FormMessage /></FormItem>} />
                  <FormField name="acquisitionDate" control={form.control} render={({field}) => <FormItem><FormLabel>Fecha Adquisición</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
                <div className="mb-4 flex items-center gap-3"><div className="h-5 w-1 rounded-full bg-[#d7ff3f]" /><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">Mantenimiento</p><h3 className="text-base font-semibold text-white">Kilometraje</h3></div></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField name="currentMileage" control={form.control} render={({field}) => <FormItem><FormLabel>Kilometraje Actual</FormLabel><FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="lastMaintenanceMileage" control={form.control} render={({field}) => <FormItem><FormLabel>Último Mtto. (km)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
                <div className="mb-4 flex items-center gap-3"><div className="h-5 w-1 rounded-full bg-white/30" /><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Protección</p><h3 className="text-base font-semibold text-white">Seguro</h3></div></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField name="insurancePolicyNumber" control={form.control} render={({field}) => <FormItem><FormLabel>No. Póliza Seguro <span className="text-rose-400" aria-hidden="true">*</span></FormLabel><FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="insuranceExpiryDate" control={form.control} render={({field}) => <FormItem><FormLabel>Vencimiento Póliza <span className="text-rose-400" aria-hidden="true">*</span></FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5 shadow-[0_14px_40px_rgba(0,0,0,.14)]">
                <div className="mb-4 flex items-center gap-3"><div className="h-5 w-1 rounded-full bg-white/30" /><div><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">Archivos</p><h3 className="text-base font-semibold text-white">Documentos y fotografía</h3></div></div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                  <FormField name="imageUrl" control={form.control} render={({field}) => <FormItem><FormLabel>Imagen Vehículo</FormLabel><FormControl><MultipleFileInput onFilesSelected={field.onChange} initialValue={field.value} accept="image/*" multiple={false} folder="vehicle_images" entityId={initialData?.id} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="circulationCardUrl" control={form.control} render={({field}) => <FormItem><FormLabel>Tarjeta Circulación</FormLabel><FormControl><MultipleFileInput onFilesSelected={field.onChange} initialValue={field.value} accept="image/*,application/pdf" multiple={false} folder="driver_documents" entityId={initialData?.id} /></FormControl><FormMessage /></FormItem>} />
                  <FormField name="insurancePolicyDocumentUrl" control={form.control} render={({field}) => <FormItem><FormLabel>Póliza Seguro <span className="text-rose-400" aria-hidden="true">*</span></FormLabel><FormControl><MultipleFileInput onFilesSelected={field.onChange} initialValue={field.value} accept="image/*,application/pdf" multiple={false} folder="driver_documents" entityId={initialData?.id} /></FormControl><FormMessage /></FormItem>} />
                </div>
              </section>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-transparent pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-11 w-full rounded-xl border-white/[0.09] bg-white/[0.025] text-white/70 hover:bg-white/[0.06] hover:text-white sm:h-10 sm:w-auto">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl bg-[#d7ff3f] text-black hover:bg-[#d7ff3f]/90 sm:h-10 sm:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar vehículo'}
            </Button>
          </div>
        </form>
      </Form>
    );
};

VehicleForm.displayName = "VehicleForm";
