
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
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Helper function to create the schema dynamically
const createVehicleSchema = (allVehicles: Vehicle[], editingVehicleId?: string) => z.object({
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
  alias: z.string().min(1, "El alias es requerido.").max(120),
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
  createdAt: z.string().optional(),
  clientId: z.string().nullable(),
  partnerId: z.string().nullable(),
  cost: z.coerce.number().optional(),
  weeklyRentalValue: z.coerce.number().optional(),
  adminCommission: z.coerce.number().optional(),
  lastMaintenanceMileage: z.coerce.number().optional(),
  currentMileage: z.coerce.number().min(0, "El kilometraje no puede ser negativo."),
  acquisitionDate: z.string().min(1, "La fecha de adquisición es requerida."),
  insurancePolicyNumber: z.string().optional().or(z.literal('')).refine(value => {
    if (!value) return true;
    return !allVehicles.some(v => v.insurancePolicyNumber === value && v.id !== editingVehicleId);
  }, { message: "Este número de póliza ya está en uso." }),
  insuranceExpiryDate: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  imageUrl: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  circulationCardUrl: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  insurancePolicyDocumentUrl: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  companyId: z.string().nullable(),
  gpsPhoneNumber: z.string().optional().or(z.literal('')).refine(value => {
    if (!value) return true;
    return !allVehicles.some(v => v.gpsPhoneNumber === value && v.id !== editingVehicleId);
  }, { message: "Este número de teléfono GPS ya está en uso." }),
  gpsPhoneCompany: z.string().optional().or(z.literal('')),
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
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
      alias: initialData?.alias || [initialData?.make, initialData?.model, initialData?.plate].filter(Boolean).join(' ') || "",
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
        mode: 'onChange' // Validate on change to give real-time feedback
    });

    const hasActiveCredit = useMemo(() => {
        if (!initialData || !credits) return false;
        return credits.some(c => c.vehicleId === initialData.id && c.status === 'active' && !c.isDeleted);
    }, [credits, initialData]);

    // Handler para datos extraídos del escáner
    const handleDataExtracted = useCallback((data: {
      make?: string;
      model?: string;
      year?: number;
      plate?: string;
      serialNumber?: string;
      color?: string;
      registrationDate?: string;
    }) => {
      // Aplicar los datos extraídos al formulario
      if (data.make) form.setValue('make', data.make, { shouldValidate: true });
      if (data.model) form.setValue('model', data.model, { shouldValidate: true });
      if (data.year) form.setValue('year', data.year, { shouldValidate: true });
      if (data.plate) form.setValue('plate', data.plate.toUpperCase(), { shouldValidate: true });
      if (data.serialNumber) form.setValue('serialNumber', data.serialNumber.toUpperCase(), { shouldValidate: true });
      if (data.color) form.setValue('color', data.color, { shouldValidate: true });
      if (data.registrationDate) form.setValue('acquisitionDate', data.registrationDate, { shouldValidate: true });

      toast.success('Datos del vehículo cargados', {
        description: 'Revisa y completa la información faltante',
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activePartners = useMemo(() => {
        const partnersForCompany = partners.filter(p => !p.isDeleted);
        if (initialData?.partnerId) {
            const currentPartner = partners.find(p => p.id === initialData.partnerId);
            if (currentPartner && !partnersForCompany.some(p => p.id === currentPartner.id)) {
                partnersForCompany.push(currentPartner);
            }
        }
        return partnersForCompany;
    }, [partners, initialData?.partnerId]);
    
    const assignableClients = useMemo(() => {
      const companyClients = clients.filter(c => c.status === 'active' && !c.isDeleted);
      const assignedClientIds = new Set(
        rawVehicles
          .filter(v => v.clientId && v.id !== initialData?.id) // Excluir el vehículo actual de la lista de asignados
          .map(v => v.clientId)
      );
      
      const available = companyClients.filter(c => !assignedClientIds.has(c.id));

      // Si se está editando un vehículo, su cliente actual siempre debe estar en la lista
      if (initialData?.clientId) {
        const currentClient = companyClients.find(c => c.id === initialData.clientId);
        if (currentClient && !available.some(c => c.id === currentClient.id)) {
          available.push(currentClient);
        }
      }

      return available;
    }, [clients, rawVehicles, initialData]);

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <ScrollArea className="flex-grow pr-6 -mr-6">
            <div className="space-y-6 p-1">

              {/* Escáner de Tarjeta de Circulación */}
              {!initialData && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                        ¿Tienes la tarjeta de circulación?
                      </h3>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Escanéala para llenar automáticamente los datos del vehículo
                      </p>
                    </div>
                    <CirculationCardScanner
                      onDataExtracted={handleDataExtracted}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* Vehicle Info Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <FormField name="alias" control={form.control} render={({field}) => (
                    <FormItem className="xl:col-span-2">
                        <FormLabel>Alias del vehículo</FormLabel>
                        <FormControl><Input {...field} placeholder="Ej. Versa Juan 01" disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="make" control={form.control} render={({field}) => (
                    <FormItem className="xl:col-span-2">
                        <FormLabel>Marca</FormLabel>
                        <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="model" control={form.control} render={({field}) => (
                    <FormItem className="xl:col-span-2">
                        <FormLabel>Modelo</FormLabel>
                        <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="year" control={form.control} render={({field}) => (
                    <FormItem className="xl:col-span-1">
                        <FormLabel>Año</FormLabel>
                        <FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="plate" control={form.control} render={({field}) => (
                    <FormItem className="xl:col-span-1">
                        <FormLabel>Placa</FormLabel>
                        <FormControl><Input {...field} className="uppercase" disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="serialNumber" control={form.control} render={({field}) => (
                    <FormItem className="sm:col-span-2 md:col-span-3 lg:grid-cols-4 xl:col-span-4">
                        <FormLabel>No. Serie</FormLabel>
                        <FormControl><Input {...field} className="uppercase" disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="color" control={form.control} render={({field}) => (
                    <FormItem className="xl:col-span-1">
                        <FormLabel>Color</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="status" control={form.control} render={({field}) => (
                    <FormItem className="xl:col-span-1">
                        <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {statusOptions.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
              </div>

              {/* Fecha de Creación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="createdAt" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <CalendarPlus className="h-4 w-4" />
                          Fecha de Creación
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            disabled={!!initialData || isSubmitting}
                            className={!!initialData ? "bg-muted cursor-not-allowed" : ""}
                          />
                        </FormControl>
                        {!!initialData && (
                          <p className="text-xs text-muted-foreground">Esta fecha no se puede modificar después de crear el vehículo</p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}/>
              </div>

              {/* GPS Info Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="gpsPhoneNumber" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Teléfono GPS (Opcional)</FormLabel>
                        <FormControl><div className="relative"><Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="tel" {...field} value={field.value ?? ''} className="pl-8" disabled={isSubmitting} /></div></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <FormField name="gpsPhoneCompany" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Compañía GPS (Opcional)</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
              </div>
              
              {/* Assignment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="clientId" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Conductor Asignado</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === NONE_SELECT_VALUE ? null : value)} value={field.value ?? NONE_SELECT_VALUE} disabled={isSubmitting || hasActiveCredit}>
                            <FormControl><SelectTrigger><SelectValue placeholder="-- Ninguno --" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value={NONE_SELECT_VALUE}>Ninguno</SelectItem>
                              {assignableClients.map(c=><SelectItem key={c.id} value={c.id}>{`${c.firstname} ${c.lastname}`}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        {hasActiveCredit && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Info className="h-3 w-3" /> No se puede cambiar el conductor, vehículo ligado a un crédito activo.
                            </p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="partnerId" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Socio Propietario</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                                if (value === CREATE_NEW_PARTNER_VALUE) {
                                    const currentCompanyId = form.getValues('companyId');
                                    onOpenPartnerModal(currentCompanyId || '');
                                } else {
                                    field.onChange(value === NONE_SELECT_VALUE ? null : value);
                                }
                            }} 
                            value={field.value ?? NONE_SELECT_VALUE} 
                            disabled={isSubmitting}
                          >
                            <FormControl><SelectTrigger><SelectValue placeholder="-- Ninguno --" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value={NONE_SELECT_VALUE}>Ninguno</SelectItem>
                              {activePartners.map(p=><SelectItem key={p.id} value={p.id}>{`${p.firstname} ${p.lastname}`}</SelectItem>)}
                              <SelectItem value={CREATE_NEW_PARTNER_VALUE} className="text-primary focus:bg-primary/10 focus:text-primary">
                                <span className="flex items-center"><PlusCircle className="mr-2 h-4 w-4" /> Crear nuevo socio...</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
              </div>

              {/* Financials Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <FormField name="cost" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Costo Adquisición</FormLabel>
                        <FormControl><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" min="0" inputMode="decimal" {...field} value={field.value ?? ''} className="pl-8 tabular-nums" placeholder="0.00" disabled={isSubmitting} /></div></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="weeklyRentalValue" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Renta por Semana</FormLabel>
                        <FormControl><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" step="0.01" min="0" inputMode="decimal" {...field} value={field.value ?? ''} className="pl-8 tabular-nums" placeholder="0.00" disabled={isSubmitting} /></div></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <FormField name="adminCommission" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Comisión Admin.</FormLabel>
                        <FormControl><div className="relative"><Input type="number" {...field} value={field.value ?? ''} className="pr-6" disabled={isSubmitting} /><span className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground">%</span></div></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="acquisitionDate" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Fecha Adquisición</FormLabel>
                        <FormControl><Input type="date" {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
              </div>

              {/* Mileage Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <FormField name="currentMileage" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Kilometraje Actual</FormLabel>
                        <FormControl><Input type="number" {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="lastMaintenanceMileage" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Último Mtto. (km)</FormLabel>
                        <FormControl><Input type="number" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
              </div>

              {/* Insurance Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField name="insurancePolicyNumber" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>No. Póliza Seguro</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField name="insuranceExpiryDate" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Vencimiento Póliza</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
              </div>
              
              {/* Documents Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
                 <FormField name="imageUrl" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Imagen Vehículo</FormLabel>
                        <FormControl>
                            <MultipleFileInput 
                                onFilesSelected={field.onChange} 
                                initialValue={field.value} 
                                accept="image/*" 
                                multiple={false} 
                                folder="vehicle_images"
                                entityId={initialData?.id}
                             />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                 )}/>
                 <FormField name="circulationCardUrl" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Tarjeta Circulación</FormLabel>
                        <FormControl>
                            <MultipleFileInput 
                                onFilesSelected={field.onChange} 
                                initialValue={field.value} 
                                accept="image/*,application/pdf" 
                                multiple={false} 
                                folder="driver_documents"
                                entityId={initialData?.id}
                            />
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                 )}/>
                 <FormField name="insurancePolicyDocumentUrl" control={form.control} render={({field}) => (
                    <FormItem>
                        <FormLabel>Póliza Seguro</FormLabel>
                        <FormControl>
                            <MultipleFileInput 
                                onFilesSelected={field.onChange} 
                                initialValue={field.value} 
                                accept="image/*,application/pdf" 
                                multiple={false}
                                folder="driver_documents"
                                entityId={initialData?.id}
                            />
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                 )}/>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
        </Form>
    );
};

VehicleForm.displayName = "VehicleForm";

    
