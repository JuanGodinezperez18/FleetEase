"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMemo, useEffect, useState } from "react";
import { format, addWeeks, getDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useData } from "@/hooks/use-data";
import type { Credit, Client } from "@/types";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Car, Loader2, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const creditSchema = z.object({
  startDate: z.string().min(1, "La fecha es obligatoria."),
  clientId: z.string().min(1, "El cliente es obligatorio."),
  vehicleId: z.string().min(1, "El cliente debe tener un vehículo asignado para crear el crédito."),
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

const getNextMonday = (date: Date) => {
  const day = getDay(date);
  const daysUntilMonday = (8 - day) % 7;
  const offset = daysUntilMonday === 0 ? 7 : daysUntilMonday;
  return addDays(date, offset);
};

export const CreditForm: React.FC<CreditFormProps> = ({ onSubmit, initialData, isSubmitting, onClose }) => {
  const { clients, vehicles, selectedCompanyId: globalCompanyId, credits } = useData();
  const { currentUser } = useAuth();

  const defaultValues = useMemo(() => ({
    startDate: initialData?.startDate ? format(new Date(initialData.startDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
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

  const { control, watch, setValue, handleSubmit, reset } = form;
  const selectedClientId = watch("clientId");
  const selectedVehicleId = watch("vehicleId");
  const [showNoVehicleMessage, setShowNoVehicleMessage] = useState(false);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!selectedClientId) {
      setValue("vehicleId", "", { shouldValidate: true });
      setShowNoVehicleMessage(false);
      return;
    }

    const clientVehicle = vehicles.find(v => v.clientId === selectedClientId);
    setValue("vehicleId", clientVehicle?.id || "", { shouldValidate: true });
    setShowNoVehicleMessage(!clientVehicle);
  }, [selectedClientId, vehicles, setValue]);

  const activeClients = useMemo(() => {
    const clientsWithActiveCredit = new Set(
      credits.filter(c => c.status === "active" && !c.isDeleted).map(c => c.clientId)
    );

    const filteredClients = clients.filter(
      c => c.status === "active" && !c.isDeleted && !clientsWithActiveCredit.has(c.id)
    );

    if (currentUser?.role === "superAdmin" && globalCompanyId) {
      return filteredClients.filter(c => c.companyId === globalCompanyId);
    }
    if (currentUser?.role !== "superAdmin" && currentUser?.companyId) {
      return filteredClients.filter(c => c.companyId === currentUser.companyId);
    }
    return filteredClients;
  }, [clients, credits, currentUser, globalCompanyId]);

  const clientVehicle = useMemo(() => {
    if (!selectedClientId) return null;
    return vehicles.find(v => v.clientId === selectedClientId) || null;
  }, [selectedClientId, vehicles]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const watchedValues = watch(["startDate", "numberOfPayments", "weeklyPayment"]);
  const [startDateStr, numberOfPayments, weeklyPayment] = watchedValues;

  const paymentPlan = useMemo(() => {
    if (!startDateStr || !numberOfPayments || !weeklyPayment) return [];
    const start = new Date(startDateStr);
    const firstPaymentDate = getNextMonday(start);
    return Array.from({ length: numberOfPayments }, (_, index) => ({
      number: index + 1,
      date: addWeeks(firstPaymentDate, index),
      amount: weeklyPayment,
    }));
  }, [startDateStr, numberOfPayments, weeklyPayment]);

  const totalCredit = (Number(numberOfPayments) || 0) * (Number(weeklyPayment) || 0);

  const getClientName = (client: Client | undefined) => {
    if (!client) return "N/A";
    return `${client.firstname} ${client.lastname}`;
  };

  const handleFormSubmit = (data: CreditFormValues) => {
    if (!clientVehicle) {
      setShowNoVehicleMessage(true);
      return;
    }
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        className="space-y-5"
      >
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Nuevo crédito</h3>
          <p className="text-sm text-muted-foreground">Seleccione un cliente y configure únicamente los datos necesarios del crédito.</p>
        </div>

        <FormField
          name="clientId"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeClients.map(client => (
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

        {selectedClientId && (
          <div className={cn(
            "rounded-lg border p-4",
            clientVehicle ? "bg-muted/50" : "border-destructive/50 bg-destructive/5"
          )}>
            {clientVehicle ? (
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Vehículo asignado</p>
                  <p className="font-medium">{clientVehicle.make} {clientVehicle.model} ({clientVehicle.plate})</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-destructive">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">El cliente no tiene un vehículo asignado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Primero debes asignarle un vehículo desde el módulo de Vehículos. No es posible crear un crédito sin vehículo.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            name="startDate"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de inicio</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="numberOfPayments"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pagos semanales</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} value={field.value ?? ""} placeholder="Ej. 52" disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="weeklyPayment"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pago semanal</FormLabel>
                <FormControl>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" min="0.01" step="0.01" {...field} value={field.value ?? ""} className="pl-8" placeholder="Ej. 3000" disabled={isSubmitting} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {numberOfPayments && weeklyPayment && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Monto total del crédito</p>
                <p className="text-xl font-bold">${totalCredit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Primer pago</p>
                <p className="font-medium">
                  {paymentPlan[0] ? format(paymentPlan[0].date, "dd MMM yyyy", { locale: es }) : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {paymentPlan.length > 0 && (
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Ver vista previa del plan de pagos ({paymentPlan.length})
            </summary>
            <ScrollArea className="h-[180px] border-t p-3">
              <div className="space-y-1">
                {paymentPlan.slice(0, 10).map(payment => (
                  <div key={payment.number} className="flex items-center justify-between rounded px-2 py-1.5 text-sm bg-muted/50">
                    <span>Pago {payment.number}</span>
                    <span className="text-muted-foreground">{format(payment.date, "dd MMM yyyy", { locale: es })}</span>
                    <span className="font-medium">${payment.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {paymentPlan.length > 10 && (
                  <p className="pt-2 text-center text-xs text-muted-foreground">+ {paymentPlan.length - 10} pagos más</p>
                )}
              </div>
            </ScrollArea>
          </details>
        )}

        {showNoVehicleMessage && !clientVehicle && (
          <p className="text-sm font-medium text-destructive" role="alert">
            No se puede guardar el crédito porque el cliente seleccionado no tiene un vehículo asignado.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedClientId || !selectedVehicleId}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Guardando..." : "Crear crédito"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
