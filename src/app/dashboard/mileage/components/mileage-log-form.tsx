"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
import { Input } from "@/components/ui/input";
import { useData } from "@/hooks/use-data";
import { format } from "date-fns";
import type { MileageLog, Company } from "@/types";
import { useAuth } from "@/contexts/auth-provider";
import { Loader2, Gauge } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mileageLogSchema = z
  .object({
    clientId: z.string().min(1, "Se debe seleccionar un cliente."),
    vehicleId: z.string().min(1, "Se debe seleccionar un vehículo."),
    date: z
      .string()
      .min(1, "Se requiere una fecha para el registro.")
      .refine(
        dateStr => {
          const selectedDate = new Date(dateStr + "T00:00:00");
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return selectedDate <= today;
        },
        { message: "No se pueden registrar fechas futuras." }
      ),
    mileage: z.coerce
      .number({
        required_error: "El kilometraje es obligatorio.",
        invalid_type_error: "Debe ingresar un valor numérico.",
      })
      .positive("El kilometraje debe ser un número positivo.")
      .int("El kilometraje debe ser un número entero.")
      .max(999999, "El kilometraje no puede exceder 999,999 km."),
    lastMileage: z.number().optional(),
    companyId: z.string().optional().nullable(),
  })
  .refine(data => data.mileage > (data.lastMileage ?? 0), {
    message: "El nuevo kilometraje debe ser mayor al último registrado.",
    path: ["mileage"],
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

const inputClass = "border-white/10 bg-white/[0.03] text-white";
const labelClass = "text-white/50";

const MileageLogForm: React.FC<MileageLogFormProps> = ({
  onSubmit,
  initialVehicleId,
  companies,
  isSubmitting,
  onClose,
}) => {
  const { vehicles, clients, loadingData, selectedCompanyId: globalCompanyId, mileageLogs } = useData();
  const { currentUser } = useAuth();

  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<MileageLogFormValues | null>(null);

  const finalMileageLogSchema = useMemo(
    () =>
      mileageLogSchema.superRefine((data, ctx) => {
        if (currentUser?.role === "superAdmin" && !data.companyId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Como Super Admin, debe seleccionar una empresa.",
            path: ["companyId"],
          });
        }
      }),
    [currentUser?.role]
  );

  const form = useForm<MileageLogFormValues>({
    resolver: zodResolver(finalMileageLogSchema),
    defaultValues: {
      clientId: "",
      vehicleId: initialVehicleId || "",
      date: format(new Date(), "yyyy-MM-dd"),
      mileage: undefined,
      lastMileage: 0,
      companyId: currentUser?.companyId || globalCompanyId || null,
    },
    mode: "onChange",
  });

  const { watch, setValue, reset, getValues } = form;
  const selectedCompanyId = watch("companyId");
  const selectedClientId = watch("clientId");
  const selectedVehicleId = watch("vehicleId");

  useEffect(() => {
    if (initialVehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === initialVehicleId);
      if (vehicle) {
        reset({
          clientId: vehicle.clientId || "",
          vehicleId: initialVehicleId,
          date: format(new Date(), "yyyy-MM-dd"),
          mileage: undefined,
          lastMileage: vehicle.currentMileage || 0,
          companyId: vehicle.companyId || currentUser?.companyId || globalCompanyId || null,
        });
      }
    }
  }, [initialVehicleId, vehicles, reset, currentUser, globalCompanyId]);

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client && client.companyId !== selectedCompanyId) {
        setValue("companyId", client.companyId);
      }
    }
  }, [selectedClientId, clients, setValue, selectedCompanyId]);

  const activeClients = useMemo(() => {
    const companyId = currentUser?.role === "superAdmin" ? selectedCompanyId : currentUser?.companyId;
    if (!companyId)
      return currentUser?.role === "superAdmin"
        ? clients.filter(c => c.status === "active" && !c.isDeleted)
        : [];
    return clients.filter(c => c.status === "active" && !c.isDeleted && c.companyId === companyId);
  }, [clients, selectedCompanyId, currentUser]);

  const availableVehiclesForSelectedClient = useMemo(() => {
    if (!selectedClientId) return [];
    return vehicles.filter(v => v.clientId === selectedClientId && (v.status === "active" || v.status === "rented"));
  }, [selectedClientId, vehicles]);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find(v => v.id === selectedVehicleId) || null;
  }, [selectedVehicleId, vehicles]);

  useEffect(() => {
    const currentVehicleId = getValues("vehicleId");
    if (currentVehicleId && !availableVehiclesForSelectedClient.some(v => v.id === currentVehicleId)) {
      setValue("vehicleId", "");
      setValue("lastMileage", 0);
    } else if (availableVehiclesForSelectedClient.length === 1) {
      setValue("vehicleId", availableVehiclesForSelectedClient[0].id);
    }
  }, [selectedClientId, availableVehiclesForSelectedClient, setValue, getValues]);

  useEffect(() => {
    if (selectedVehicle) {
      setValue("lastMileage", selectedVehicle.currentMileage || 0);
    } else {
      setValue("lastMileage", 0);
    }
  }, [selectedVehicle, setValue]);

  const currentMileage = watch("mileage") || 0;
  const lastMileage = watch("lastMileage") || 0;
  const registrationDate = watch("date");
  const increment = currentMileage - lastMileage;

  const { daysSinceLastLog, kmPerDay } = useMemo(() => {
    if (increment <= 0 || !selectedVehicleId) return { daysSinceLastLog: 0, kmPerDay: 0 };
    const lastLog = mileageLogs
      .filter(log => log.vehicleId === selectedVehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const daysSinceLastLog = lastLog
      ? Math.ceil(
          (new Date(registrationDate).getTime() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;
    const kmPerDay = daysSinceLastLog > 0 ? increment / daysSinceLastLog : 0;
    return { daysSinceLastLog, kmPerDay };
  }, [increment, registrationDate, selectedVehicleId, mileageLogs]);

  const isUnusual = increment > 2000 || (kmPerDay > 300 && daysSinceLastLog > 0);

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
    if (formDataToSubmit) onSubmit(formDataToSubmit);
    setIsConfirmationOpen(false);
  };

  if (loadingData && !clients.length && !vehicles.length) {
    return <div className="p-8 text-center text-white/50">Cargando...</div>;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5 text-white">
          {currentUser?.role === "superAdmin" && companies?.length > 0 && (
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Empresa</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isSubmitting || !!selectedClientId}
                  >
                    <FormControl>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Seleccionar empresa..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies.map(company => (
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
                <FormLabel className={labelClass}>Fecha del registro</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isSubmitting} className={inputClass} />
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
                <FormLabel className={labelClass}>Cliente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Seleccione un cliente" />
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

          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Vehículo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                  disabled={isSubmitting || !selectedClientId}
                >
                  <FormControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValue
                        placeholder={!selectedClientId ? "Seleccione un cliente primero" : "Seleccione un vehículo"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableVehiclesForSelectedClient.length > 0 ? (
                      availableVehiclesForSelectedClient.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {`${vehicle.make} ${vehicle.model} (${vehicle.plate})`}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-white/40">Sin vehículos asignados</div>
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
                <FormLabel className={labelClass}>Nuevo kilometraje</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ingrese el kilometraje"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                    className={inputClass}
                  />
                </FormControl>
                {selectedVehicle && (
                  <FormDescription className="text-white/35">
                    Último registrado: {new Intl.NumberFormat().format(selectedVehicle.currentMileage || 0)} km
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {increment > 0 && (
            <div
              className={cn(
                "rounded-[16px] border p-4",
                isUnusual
                  ? "border-amber-400/25 bg-amber-400/[0.06]"
                  : "border-white/[0.07] bg-white/[0.03]"
              )}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/60">
                <Gauge className="h-3.5 w-3.5 text-[#d7ff3f]" strokeWidth={1.75} />
                Análisis del incremento
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Incremento</span>
                  <span className="font-semibold tabular-nums text-white">+{increment.toLocaleString()} km</span>
                </div>
                {daysSinceLastLog > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/40">Días</span>
                      <span className="font-semibold tabular-nums text-white">{daysSinceLastLog}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/[0.06] pt-1">
                      <span className="text-white/40">Promedio diario</span>
                      <span className={cn("font-semibold tabular-nums", kmPerDay > 300 ? "text-amber-300" : "text-white")}>
                        {kmPerDay.toFixed(0)} km/día
                      </span>
                    </div>
                  </>
                )}
                {isUnusual && (
                  <p className="mt-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-center text-[10px] font-semibold text-amber-300">
                    Incremento mayor al usual
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
              disabled={isSubmitting}
              className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />}
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar kilometraje</AlertDialogTitle>
            <AlertDialogDescription>
              El kilometraje ingresado es más de 2,000 km mayor que el último registro. ¿Es correcto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmationOpen(false)} disabled={isSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithSubmission} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Sí, es correcto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

MileageLogForm.displayName = "MileageLogForm";
export default MileageLogForm;
