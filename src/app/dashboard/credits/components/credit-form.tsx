"use client";

import { useForm } from "react-hook-form";
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
import { DollarSign, Car, Loader2, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const creditSchema = z.object({
  startDate: z.string().min(1, "La fecha es obligatoria."),
  clientId: z.string().min(1, "El cliente es obligatorio."),
  vehicleId: z.string().min(1, "El cliente debe tener un vehículo asignado para crear el crédito."),
  numberOfPayments: z.preprocess(
    val => Number(val),
    z.number().int().min(1, "El número de pagos debe ser al menos 1.")
  ),
  weeklyPayment: z.preprocess(
    val => Number(val),
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

const inputClass = "border-white/10 bg-white/[0.03] text-white";
const labelClass = "text-white/50";

export const CreditForm: React.FC<CreditFormProps> = ({ onSubmit, initialData, isSubmitting, onClose }) => {
  const { clients, vehicles, selectedCompanyId: globalCompanyId, credits } = useData();
  const { currentUser } = useAuth();

  const defaultValues = useMemo(
    () => ({
      startDate: initialData?.startDate
        ? format(new Date(initialData.startDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      clientId: initialData?.clientId || "",
      vehicleId: initialData?.vehicleId || "",
      numberOfPayments: initialData?.numberOfPayments || undefined,
      weeklyPayment: initialData?.weeklyPayment || undefined,
      companyId: initialData?.companyId || currentUser?.companyId || globalCompanyId || null,
    }),
    [initialData, currentUser?.companyId, globalCompanyId]
  );

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
        onKeyDown={e => e.key === "Enter" && e.preventDefault()}
        className="space-y-5 text-white"
      >
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-semibold tracking-[-0.02em] text-white">
            {initialData?.id ? "Editar crédito" : "Nuevo crédito"}
          </h3>
          <p className="text-sm text-white/40">Cliente, vehículo y plan de pagos semanales.</p>
        </div>

        <FormField
          name="clientId"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger className={inputClass}>
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
          <div
            className={cn(
              "rounded-[14px] border p-4",
              clientVehicle
                ? "border-white/[0.07] bg-white/[0.03]"
                : "border-rose-400/25 bg-rose-400/[0.06]"
            )}
          >
            {clientVehicle ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                  <Car className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[11px] text-white/40">Vehículo asignado</p>
                  <p className="font-medium text-white/90">
                    {clientVehicle.make} {clientVehicle.model} ({clientVehicle.plate})
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-rose-200">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="font-medium">Sin vehículo asignado</p>
                  <p className="mt-1 text-sm text-rose-200/70">
                    Asigna un vehículo al cliente antes de crear el crédito.
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
                <FormLabel className={labelClass}>Fecha de inicio</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isSubmitting} className={inputClass} />
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
                <FormLabel className={labelClass}>Pagos semanales</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Ej. 52"
                    disabled={isSubmitting}
                    className={inputClass}
                  />
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
                <FormLabel className={labelClass}>Pago semanal</FormLabel>
                <FormControl>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-white/30" strokeWidth={1.75} />
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      {...field}
                      value={field.value ?? ""}
                      className={cn(inputClass, "pl-8")}
                      placeholder="Ej. 3000"
                      disabled={isSubmitting}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {numberOfPayments && weeklyPayment ? (
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] text-white/40">Monto total</p>
                <p className="font-heading text-xl font-semibold tabular-nums text-white">
                  ${totalCredit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-white/40">Primer pago</p>
                <p className="font-medium text-white/90">
                  {paymentPlan[0] ? format(paymentPlan[0].date, "dd MMM yyyy", { locale: es }) : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {paymentPlan.length > 0 && (
          <details className="overflow-hidden rounded-[14px] border border-white/[0.07]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/[0.03]">
              Vista previa del plan ({paymentPlan.length} pagos)
            </summary>
            <ScrollArea className="h-[180px] border-t border-white/[0.06] p-3">
              <div className="space-y-1">
                {paymentPlan.slice(0, 10).map(payment => (
                  <div
                    key={payment.number}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-sm"
                  >
                    <span className="text-white/70">Pago {payment.number}</span>
                    <span className="text-white/40">{format(payment.date, "dd MMM yyyy", { locale: es })}</span>
                    <span className="font-medium tabular-nums text-white">
                      ${payment.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                {paymentPlan.length > 10 && (
                  <p className="pt-2 text-center text-xs text-white/35">+ {paymentPlan.length - 10} pagos más</p>
                )}
              </div>
            </ScrollArea>
          </details>
        )}

        {showNoVehicleMessage && !clientVehicle && (
          <p className="text-sm font-medium text-rose-300" role="alert">
            No se puede guardar: el cliente no tiene vehículo asignado.
          </p>
        )}

        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-transparent pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedClientId || !selectedVehicleId}
            className="h-11 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />}
            {isSubmitting ? "Guardando..." : initialData?.id ? "Guardar cambios" : "Crear crédito"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
