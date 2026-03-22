
"use client";

import React, { useEffect, useMemo, forwardRef, useImperativeHandle, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useData } from '@/hooks/use-data';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MileageLog, Company } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { Building, Loader2, Gauge } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';


const mileageLogSchema = z.object({
  clientId: z.string().min(1, 'Se debe seleccionar un cliente.'),
  vehicleId: z.string().min(1, 'Se debe seleccionar un vehículo.'),
  date: z.string()
    .min(1, 'Se requiere una fecha para el registro.')
    .refine((dateStr) => {
      const selectedDate = new Date(dateStr + 'T00:00:00'); // Treat as local date
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Set to end of today
      return selectedDate <= today;
    }, {
      message: 'No se pueden registrar fechas futuras.'
    }),
  mileage: z.coerce
    .number({
        required_error: "El kilometraje es obligatorio.",
        invalid_type_error: "Debe ingresar un valor numérico.",
    })
    .positive('El kilometraje debe ser un número positivo.')
    .int('El kilometraje debe ser un número entero.')
    .max(999999, 'El kilometraje no puede exceder 999,999 km.'),
  lastMileage: z.number().optional(),
  companyId: z.string().optional().nullable(),
}).refine(data => data.mileage > (data.lastMileage ?? 0), {
    message: 'El nuevo kilometraje debe ser mayor al último registrado.',
    path: ['mileage'],
});

export type MileageLogFormValues = z.infer<typeof mileageLogSchema>;

interface MileageLogFormProps {
  onSubmit: (data: MileageLogFormValues) => void;
  initialData?: Partial<MileageLog> | null;
  initialVehicleId?: string;
  companies: Company[];
  isSubmitting: boolean;
  onClose: () => void;
}

const MileageLogForm: React.FC<MileageLogFormProps> = ({ onSubmit, initialVehicleId, companies, isSubmitting, onClose }) => {
    const { vehicles, clients, loadingData, selectedCompanyId: globalCompanyId, mileageLogs } = useData();
    const { currentUser } = useAuth();
    
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [formDataToSubmit, setFormDataToSubmit] = useState<MileageLogFormValues | null>(null);

    const finalMileageLogSchema = useMemo(() => 
      mileageLogSchema.superRefine((data, ctx) => {
        if (currentUser?.role === 'superAdmin' && !data.companyId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Como Super Admin, debe seleccionar una empresa.",
            path: ['companyId'],
          });
        }
      }),
      [currentUser?.role]
    );

    const form = useForm<MileageLogFormValues>({
      resolver: zodResolver(finalMileageLogSchema),
      defaultValues: {
        clientId: '',
        vehicleId: initialVehicleId || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        mileage: undefined,
        lastMileage: 0,
        companyId: currentUser?.companyId || globalCompanyId || null,
      },
      mode: 'onChange',
    });
    
    const { watch, setValue, reset, getValues } = form;
    const selectedCompanyId = watch('companyId');
    const selectedClientId = watch('clientId');
    const selectedVehicleId = watch('vehicleId');
    
    const MileageIncrement: React.FC<{ 
      currentMileage: number; 
      lastMileage: number;
      registrationDate: string;
    }> = ({ currentMileage, lastMileage, registrationDate }) => {
      const increment = currentMileage - lastMileage;
      
      const { daysSinceLastLog, kmPerDay } = useMemo(() => {
        if (increment <= 0) return { daysSinceLastLog: 0, kmPerDay: 0 };
    
        const lastLog = mileageLogs
          .filter(log => log.vehicleId === selectedVehicleId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        const daysSinceLastLog = lastLog 
          ? Math.ceil((new Date(registrationDate).getTime() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        const kmPerDay = daysSinceLastLog > 0 ? increment / daysSinceLastLog : 0;
        return { daysSinceLastLog, kmPerDay };
      }, [increment, registrationDate]);
      
      if (increment <= 0) return null;
      
      const isUnusual = increment > 2000 || (kmPerDay > 300 && daysSinceLastLog > 0);
      
      return (
        <Alert className={isUnusual ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-900/20' : 'border-blue-500/50 bg-blue-50 dark:bg-blue-900/20'}>
          <Gauge className="h-4 w-4" />
          <AlertTitle>Análisis del Incremento</AlertTitle>
          <AlertDescription className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Incremento:</span>
              <span className="font-semibold">+{increment.toLocaleString()} km</span>
            </div>
            {daysSinceLastLog > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Días transcurridos:</span>
                  <span className="font-semibold">{daysSinceLastLog}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold">
                  <span>Promedio diario:</span>
                  <span className={kmPerDay > 300 ? 'text-amber-600' : ''}>
                    {kmPerDay.toFixed(0)} km/día
                  </span>
                </div>
              </>
            )}
            {isUnusual && (
              <Badge variant="destructive" className="w-full justify-center mt-2 bg-amber-500 text-white">
                ⚠️ Incremento mayor al usual
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      );
    };

    // Effect to auto-fill form if an initialVehicleId is provided
    useEffect(() => {
        if (initialVehicleId && vehicles.length > 0) {
            const vehicle = vehicles.find(v => v.id === initialVehicleId);
            if (vehicle) {
                reset({
                    clientId: vehicle.clientId || '',
                    vehicleId: initialVehicleId,
                    date: format(new Date(), 'yyyy-MM-dd'),
                    mileage: undefined,
                    lastMileage: vehicle.currentMileage || 0,
                    companyId: vehicle.companyId || currentUser?.companyId || globalCompanyId || null,
                });
            }
        }
    }, [initialVehicleId, vehicles, clients, reset, currentUser, globalCompanyId]);
    
    useEffect(() => {
        if (selectedClientId) {
            const client = clients.find(c => c.id === selectedClientId);
            if (client && client.companyId !== selectedCompanyId) {
                setValue('companyId', client.companyId);
            }
        }
    }, [selectedClientId, clients, setValue, selectedCompanyId]);
    
    const activeClients = useMemo(() => {
      const companyId = currentUser?.role === 'superAdmin' ? selectedCompanyId : currentUser?.companyId;
      if (!companyId) return currentUser?.role === 'superAdmin' ? clients.filter(c => c.status === 'active' && !c.isDeleted) : [];
      return clients.filter(c => c.status === 'active' && !c.isDeleted && c.companyId === companyId);
    }, [clients, selectedCompanyId, currentUser]);
    
    const availableVehiclesForSelectedClient = useMemo(() => {
        if (!selectedClientId) return [];
        return vehicles.filter(v => v.clientId === selectedClientId && (v.status === 'active' || v.status === 'rented'));
    }, [selectedClientId, vehicles]);
    
    const selectedVehicle = useMemo(() => {
        if (!selectedVehicleId) return null;
        return vehicles.find(v => v.id === selectedVehicleId) || null;
    }, [selectedVehicleId, vehicles]);

    // Effect to reset vehicle when client changes
    useEffect(() => {
        const currentVehicleId = getValues('vehicleId');
        if (currentVehicleId && !availableVehiclesForSelectedClient.some(v => v.id === currentVehicleId)) {
            setValue('vehicleId', '');
            setValue('lastMileage', 0);
        } else if (availableVehiclesForSelectedClient.length === 1) {
            // If only one vehicle is available for the client, select it automatically
            setValue('vehicleId', availableVehiclesForSelectedClient[0].id);
        }
    }, [selectedClientId, availableVehiclesForSelectedClient, setValue, getValues]);
    
    useEffect(() => {
        if (selectedVehicle) {
            setValue('lastMileage', selectedVehicle.currentMileage || 0);
        } else {
             setValue('lastMileage', 0);
        }
    }, [selectedVehicle, setValue]);
    
    const handleFormSubmit = async (data: MileageLogFormValues) => {
      const mileageDifference = data.mileage - (data.lastMileage || 0);

      if (mileageDifference > 2000) {
        setFormDataToSubmit(data);
        setIsConfirmationOpen(true);
      } else {
        onSubmit(data);
      }
    };
    
    const proceedWithSubmission = () => {
        if (formDataToSubmit) {
            onSubmit(formDataToSubmit);
        }
        setIsConfirmationOpen(false);
    }

    if (loadingData && !clients.length && !vehicles.length) {
      return <div className="p-8 text-center">Cargando...</div>;
    }

    return (
      <>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {currentUser?.role === 'superAdmin' && companies?.length > 0 && (
                <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Empresa</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting || !!selectedClientId}>
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
                name="date"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Fecha del Registro</FormLabel>
                    <FormControl>
                    <Input type="date" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un cliente" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {activeClients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                                {`${client.firstname} ${client.lastname}`}
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
                name="vehicleId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Vehículo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting || !selectedClientId}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={!selectedClientId ? "Seleccione un cliente primero" : "Seleccione un vehículo"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {availableVehiclesForSelectedClient.length > 0 ? (
                                availableVehiclesForSelectedClient.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                    {`${vehicle.make} ${vehicle.model} (${vehicle.plate})`}
                                </SelectItem>
                                ))
                            ) : (
                                <div className="p-2 text-sm text-muted-foreground text-center">No hay vehículos asignados a este cliente.</div>
                            )}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Nuevo Kilometraje</FormLabel>
                    <FormControl>
                    <Input 
                        type="number" 
                        placeholder="Ingrese el kilometraje" 
                        {...field} 
                        value={field.value ?? ''} 
                        disabled={isSubmitting} 
                    />
                    </FormControl>
                    {selectedVehicle && (
                    <FormDescription>
                        Último kilometraje registrado: {new Intl.NumberFormat().format(selectedVehicle.currentMileage || 0)} km
                    </FormDescription>
                    )}
                    <FormMessage />
                </FormItem>
                )}
            />

            {watch('mileage') > (watch('lastMileage') || 0) && (
              <MileageIncrement
                currentMileage={watch('mileage')}
                lastMileage={watch('lastMileage') || 0}
                registrationDate={watch('date')}
              />
            )}
            
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
            </div>
            </form>
        </Form>
        
        <AlertDialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Kilometraje</AlertDialogTitle>
                    <AlertDialogDescription>
                        El kilometraje ingresado es más de 2,000 km mayor que el último registro. 
                        ¿Estás seguro de que este valor es correcto?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsConfirmationOpen(false)} disabled={isSubmitting}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={proceedWithSubmission}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Guardando..." : "Sí, es correcto"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
};

MileageLogForm.displayName = 'MileageLogForm';
export default MileageLogForm;
