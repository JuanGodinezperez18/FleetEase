"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/contexts/auth-provider';
import { toast } from 'sonner';
import { Loader2, Settings, AlertTriangle } from 'lucide-react';

const companySettingsSchema = z.object({
  defaultRentalDays: z.coerce.number().int().positive().optional(),
  maintenanceInterval: z.coerce.number().int().positive().optional(),
  latePaymentFee: z.coerce.number().positive().optional(),
  gracePeriodDays: z.coerce.number().int().nonnegative().optional(),
  emailNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
});

type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

export default function CompanySettingsPage() {
  const { selectedCompanyId, companies, loadingData, updateCompany } = useData();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const company = React.useMemo(
    () => companies.find(c => c.id === selectedCompanyId),
    [selectedCompanyId, companies]
  );

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
  });

  useEffect(() => {
    if (company) {
      form.reset({
        defaultRentalDays: company.defaultRentalDays ?? 7,
        maintenanceInterval: company.maintenanceInterval ?? 5000,
        latePaymentFee: company.latePaymentFee ?? 50,
        gracePeriodDays: company.gracePeriodDays ?? 3,
        emailNotifications: company.emailNotifications ?? true,
        whatsappNotifications: company.whatsappNotifications ?? false,
      });
    }
  }, [company, form]);

  const handleSave = async (data: CompanySettingsFormValues) => {
    if (!selectedCompanyId) {
      toast.error('No se ha seleccionado ninguna empresa.');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Guardando configuración...');
    try {
      await updateCompany(selectedCompanyId, data);
      toast.success('Configuración guardada', { id: toastId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo guardar.';
      toast.error('Error al guardar', { id: toastId, description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentUser?.role !== 'superAdmin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle/> Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Solo los Super Administradores pueden acceder a esta sección.</p>
        </CardContent>
      </Card>
    );
  }

  if (loadingData && !company) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seleccione una Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Por favor, seleccione una empresa desde el menú lateral para ver su configuración.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5"/> Configuración de la Empresa: {company.name}
            </CardTitle>
            <CardDescription>
              Ajusta las reglas de negocio y parámetros operativos para esta empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="defaultRentalDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de renta por defecto</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maintenanceInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo de mantenimiento (km)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="latePaymentFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo por pago tardío ($)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gracePeriodDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de gracia para pagos</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Notificaciones por Email</FormLabel>
                      <FormDescription>
                        Activar para enviar alertas y reportes por correo electrónico.
                      </FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsappNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Notificaciones por WhatsApp</FormLabel>
                      <FormDescription>
                        Activar para enviar alertas urgentes por WhatsApp (requiere integración).
                      </FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}