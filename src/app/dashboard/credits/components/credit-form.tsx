
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMemo, useEffect, forwardRef, useImperativeHandle, useState, useRef, useCallback } from "react";
import { format, addWeeks, getDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from "@/hooks/use-data";
import type { Credit, Company, Client, Vehicle } from "@/types";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Building, User, Car, Check, ChevronsRight, Loader2, Calendar as CalendarIcon, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const creditSchema = z.object({
  startDate: z.string().min(1, "La fecha es obligatoria."),
  clientId: z.string().min(1, "El cliente es obligatorio."),
  vehicleId: z.string().min(1, "El vehículo es obligatorio."),
  numberOfPayments: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1, "El número de pagos debe ser al menos 1.")
  ),
  weeklyPayment: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, "El importe del pago semanal debe ser mayor a 0.")
  ),
  companyId: z.string().optional().nullable(),
});

export type CreditFormValues = z.infer<typeof creditSchema>;

interface CreditFormProps {
  onSubmit: (data: CreditFormValues) => void;
  initialData?: Partial<Credit> | null;
  isSubmitting: boolean;
  onClose: () => void;
}

const steps = [
    { id: 1, name: 'Cliente', fields: ['clientId'] },
    { id: 2, name: 'Vehículo y Términos', fields: ['vehicleId', 'startDate', 'numberOfPayments', 'weeklyPayment'] },
    { id: 3, name: 'Confirmar' }
];

// Función para obtener el próximo lunes
const getNextMonday = (date: Date) => {
  const day = getDay(date);
  // El domingo es 0, lunes es 1. La diferencia para llegar a lunes (8)
  const daysUntilMonday = (8 - day) % 7;
  // Si hoy es lunes, el próximo es en 7 días, no hoy.
  const offset = daysUntilMonday === 0 ? 7 : daysUntilMonday;
  return addDays(date, offset);
};

export const CreditForm: React.FC<CreditFormProps> = ({ onSubmit, initialData, isSubmitting, onClose }) => {
  const { clients, vehicles, selectedCompanyId: globalCompanyId, credits } = useData();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  
  const defaultValues = useMemo(() => ({
    startDate: initialData?.startDate ? format(new Date(initialData.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    clientId: initialData?.clientId || "",
    vehicleId: initialData?.vehicleId || "",
    numberOfPayments: initialData?.numberOfPayments || undefined,
    weeklyPayment: initialData?.weeklyPayment || undefined,
    companyId: initialData?.companyId || currentUser?.companyId || globalCompanyId || null,
  }), [initialData, currentUser?.companyId, globalCompanyId]);

  const form = useForm<CreditFormValues>({
    resolver: zodResolver(creditSchema),
    defaultValues,
    mode: "onBlur",
  });

  const { control, watch, setValue, trigger, handleSubmit, reset } = form;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const selectedClientId = watch('clientId');
  const selectedVehicleId = watch('vehicleId');
  const formCompanyId = watch('companyId');

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client && client.companyId) {
        setValue('companyId', client.companyId, { shouldValidate: true });
      }
    }
  }, [selectedClientId, clients, setValue]);

  const activeClients = useMemo(() => {
    const clientsWithActiveCredit = new Set(
        credits.filter(c => c.status === 'active' && !c.isDeleted).map(c => c.clientId)
    );

    let filteredClients = clients.filter(c => c.status === 'active' && !c.isDeleted && !clientsWithActiveCredit.has(c.id));

    if (currentUser?.role === 'superAdmin' && globalCompanyId) {
      return filteredClients.filter(c => c.companyId === globalCompanyId);
    }
    if (currentUser?.role !== 'superAdmin' && currentUser?.companyId) {
      return filteredClients.filter(c => c.companyId === currentUser.companyId);
    }
    return filteredClients;
  }, [clients, credits, currentUser, globalCompanyId]);
  
  const clientVehicle = useMemo(() => {
    if (selectedClientId) {
      return vehicles.find(v => v.clientId === selectedClientId);
    }
    return null;
  }, [selectedClientId, vehicles]);
  
  useEffect(() => {
    if (clientVehicle) {
      setValue('vehicleId', clientVehicle.id, { shouldValidate: true });
    } else if (selectedClientId) {
      setValue('vehicleId', '', { shouldValidate: true });
    }
  }, [selectedClientId, clientVehicle, setValue]);

  const watchedValues = watch(['startDate', 'numberOfPayments', 'weeklyPayment']);
  const paymentPlan = useMemo(() => {
    const [startDateStr, numberOfPayments, weeklyPayment] = watchedValues;

    if (!startDateStr || !numberOfPayments || !weeklyPayment) return [];

    const start = new Date(startDateStr);
    const firstPaymentDate = getNextMonday(start);
    const plan: Array<{ number: number; date: Date; amount: number; status: string }> = [];

    for (let i = 0; i < numberOfPayments; i++) {
      const paymentDate = addWeeks(firstPaymentDate, i);

      plan.push({
        number: i + 1,
        date: paymentDate,
        amount: weeklyPayment,
        status: 'pending'
      });
    }

    return plan;
  }, [watchedValues]);
  
  const nextStep = async () => {
    const fieldsToValidate = steps[currentStep - 1].fields;
    const isValid = await trigger(fieldsToValidate as (keyof CreditFormValues)[] | undefined, { shouldFocus: true });
    if(isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  
  const vehicleDisplayValue = clientVehicle 
      ? `${clientVehicle.make} ${clientVehicle.model} (${clientVehicle.plate})`
      : "Vehículo no asignado";

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const getClientName = (client: Client | undefined) => {
    if (!client) return 'N/A';
    return `${client.firstname} ${client.lastname}`;
  }

  return (
    <Form {...form}>
       <nav aria-label="Progress">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {steps.map((step, index) => (
            <li key={step.name} className="md:flex-1">
              <div
                className={cn(
                  "group flex flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
                  step.id < currentStep ? "border-primary" : "border-border",
                  step.id === currentStep ? "border-primary" : "hover:border-gray-300"
                )}
              >
                <span className={cn(
                    "text-sm font-medium transition-colors",
                    step.id < currentStep ? "text-primary" : "text-gray-500 group-hover:text-gray-700",
                    step.id === currentStep ? "text-primary" : ""
                )}>
                  Paso {step.id}
                </span>
                <span className="text-sm font-medium">{step.name}</span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
      
      <form 
        onSubmit={(e) => e.preventDefault()} 
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        className="mt-8 space-y-6"
      >
        {currentStep === 1 && (
            <div className="space-y-4">
                <FormField
                    name="clientId"
                    control={control}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Seleccionar Cliente</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Cliente" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {activeClients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{`${client.firstname} ${client.lastname}`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 {clientVehicle && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium">Vehículo Asignado</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-foreground">{vehicleDisplayValue}</p>
                      </div>
                    </div>
                  )}
                  {!selectedClientId && (
                    <div className="p-4 bg-secondary/20 text-center rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground">Seleccione un cliente para ver el vehículo asignado y continuar.</p>
                    </div>
                  )}
            </div>
        )}
        {currentStep === 2 && (
             <div className="space-y-6">
              <FormField
                name="startDate"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="numberOfPayments" control={control} render={({ field }) => (
                  <FormItem><FormLabel>No. de Pagos Semanales</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="Ej: 52" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="weeklyPayment" control={control} render={({ field }) => (
                  <FormItem><FormLabel>Importe Semanal</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" {...field} value={field.value ?? ''} className="pl-8" placeholder="Ej: 3000" /></div></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
        )}
        {currentStep === 3 && (
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Resumen del Crédito</h3>
                <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cliente</span>
                        <span className="text-sm font-medium">{getClientName(selectedClient)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Vehículo</span>
                        <span className="text-sm font-medium">{vehicleDisplayValue}</span>
                    </div>
                </div>

                <Separator className="my-4" />

                <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Plan de Pagos (Vista Previa)
                    </h4>
                    <ScrollArea className="h-[200px] border rounded-md p-2">
                        <div className="space-y-2">
                        {paymentPlan.slice(0, 10).map((payment) => (
                            <div 
                            key={payment.number}
                            className={cn(
                                "flex items-center justify-between p-2 rounded text-sm",
                                "bg-muted/60"
                            )}
                            >
                            <span className="font-medium">
                                Pago {payment.number}
                            </span>
                            <span className="text-muted-foreground">
                                {format(payment.date, 'dd MMM yyyy', { locale: es })}
                            </span>
                            <span className="font-semibold">${payment.amount}</span>
                            </div>
                        ))}
                        {paymentPlan.length > 10 && (
                            <p className="text-center text-sm text-muted-foreground mt-2">
                            + {paymentPlan.length - 10} pagos más
                            </p>
                        )}
                        </div>
                    </ScrollArea>
                    
                    <div className="mt-4 p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg space-y-1 text-sm">
                        <div className="flex justify-between text-lg font-bold text-foreground">
                            <span>Monto Total del Crédito:</span>
                            <span>${((watch('numberOfPayments') || 0) * (watch('weeklyPayment') || 0)).toLocaleString()}</span>
                        </div>
                         <p className="text-xs text-muted-foreground">El enganche se registrará por separado en el módulo de Ingresos.</p>
                    </div>
                </div>
            </div>
        )}
        <div className="flex justify-end gap-2 pt-4 mt-8">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
            </Button>
             {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
                    Anterior
                </Button>
            )}
            {currentStep < steps.length ? (
                <Button type="button" onClick={nextStep} disabled={!selectedClientId || isSubmitting}>
                    Siguiente <ChevronsRight className="h-4 w-4 ml-2" />
                </Button>
            ) : (
                <Button 
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Guardando..." : "Confirmar y Guardar"}
                </Button>
            )}
        </div>
      </form>
    </Form>
  );
};
