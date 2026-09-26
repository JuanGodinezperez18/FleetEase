"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/contexts/auth-provider';
import { useStorage } from '@/hooks/use-storage';
import { MultipleFileInput } from '@/components/common/multiple-file-input';
import { toast } from 'sonner';
import { Loader2, Settings, AlertTriangle, Building2, Bell, ImageIcon } from 'lucide-react';

const companySettingsSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  email: z.string().email('Correo inválido.').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  street: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  logoUrl: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
  defaultRentalDays: z.coerce.number().int().positive().optional(),
  maintenanceInterval: z.coerce.number().int().positive().optional(),
  latePaymentFee: z.coerce.number().nonnegative().optional(),
  gracePeriodDays: z.coerce.number().int().nonnegative().optional(),
  emailNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
});

type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

const inputClass =
  'h-11 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30';
const labelClass = 'text-xs font-medium text-white/55';
const sectionClass =
  'rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:p-5';

export default function CompanySettingsPage() {
  const { selectedCompanyId, companies, loadingData, updateCompany, refreshData } = useData();
  const { currentUser } = useAuth();
  const { uploadFile, deleteFileByUrl } = useStorage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAccess =
    currentUser?.role === 'superAdmin' || currentUser?.role === 'admin';

  const companyId = useMemo(() => {
    if (currentUser?.role === 'admin') return currentUser.companyId || null;
    return selectedCompanyId || currentUser?.companyId || null;
  }, [currentUser, selectedCompanyId]);

  const company = useMemo(
    () => companies.find(c => c.id === companyId),
    [companyId, companies]
  );

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'México',
      logoUrl: [],
      defaultRentalDays: 7,
      maintenanceInterval: 10000,
      latePaymentFee: 50,
      gracePeriodDays: 3,
      emailNotifications: true,
      whatsappNotifications: false,
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        street: company.street || '',
        city: company.city || '',
        state: company.state || '',
        zipCode: company.zipCode || '',
        country: company.country || 'México',
        logoUrl: company.logoUrl ? [company.logoUrl] : [],
        defaultRentalDays: company.defaultRentalDays ?? 7,
        maintenanceInterval: company.maintenanceInterval ?? 10000,
        latePaymentFee: company.latePaymentFee ?? 50,
        gracePeriodDays: company.gracePeriodDays ?? 3,
        emailNotifications: company.emailNotifications ?? true,
        whatsappNotifications: company.whatsappNotifications ?? false,
      });
    }
  }, [company, form]);

  const handleSave = async (data: CompanySettingsFormValues) => {
    if (!companyId) {
      toast.error('No se ha seleccionado ninguna empresa.');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Guardando configuración...');
    try {
      const oldLogoUrl = company?.logoUrl;
      let newLogoUrl: string | null | undefined = oldLogoUrl;

      const logoField = data.logoUrl;
      if (Array.isArray(logoField)) {
        if (logoField.length > 0) {
          const file = logoField[0];
          if (file instanceof File) {
            newLogoUrl = await uploadFile(file, 'company_logos', true, companyId);
          } else if (typeof file === 'string') {
            newLogoUrl = file;
          }
        } else if (oldLogoUrl) {
          newLogoUrl = null;
        }
      }

      await updateCompany(companyId, {
        name: data.name.trim(),
        email: data.email || undefined,
        phone: data.phone || undefined,
        street: data.street || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zipCode: data.zipCode || undefined,
        country: data.country || undefined,
        logoUrl: newLogoUrl,
        defaultRentalDays: data.defaultRentalDays,
        maintenanceInterval: data.maintenanceInterval,
        latePaymentFee: data.latePaymentFee,
        gracePeriodDays: data.gracePeriodDays,
        emailNotifications: data.emailNotifications,
        whatsappNotifications: data.whatsappNotifications,
      });

      if (oldLogoUrl && oldLogoUrl !== newLogoUrl) {
        await deleteFileByUrl(oldLogoUrl).catch(() => undefined);
      }

      await refreshData();
      toast.success('Configuración guardada', { id: toastId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo guardar.';
      toast.error('Error al guardar', { id: toastId, description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="relative min-h-full overflow-hidden rounded-[18px] bg-[#080a0f] p-6 text-white">
        <div className="mx-auto max-w-md rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
            <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-lg font-semibold">Acceso denegado</h2>
          <p className="mt-2 text-sm text-white/50">
            Solo administradores de la empresa pueden acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  if (loadingData && !company) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[18px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="relative min-h-full overflow-hidden rounded-[18px] bg-[#080a0f] p-6 text-white">
        <div className="mx-auto max-w-md rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
            <Building2 className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-lg font-semibold">Empresa no encontrada</h2>
          <p className="mt-2 text-sm text-white/50">
            {currentUser?.role === 'superAdmin'
              ? 'Elige una empresa desde el selector del menú lateral.'
              : 'Tu usuario no tiene una empresa asignada. Contacta al super administrador.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Administración
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Configuración de empresa
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Datos de contacto, logotipo y reglas de negocio · {company.name}
          </p>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <section className={sectionClass}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                  <Building2 className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Datos de la empresa</h2>
                  <p className="mt-0.5 text-xs text-white/40">
                    Nombre y contacto que aparecen en reportes PDF
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className={labelClass}>Nombre</FormLabel>
                      <FormControl>
                        <Input className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Correo</FormLabel>
                      <FormControl>
                        <Input type="email" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Teléfono</FormLabel>
                      <FormControl>
                        <Input className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className={labelClass}>Calle</FormLabel>
                      <FormControl>
                        <Input className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Ciudad</FormLabel>
                      <FormControl>
                        <Input className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Estado</FormLabel>
                      <FormControl>
                        <Input className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>C.P.</FormLabel>
                      <FormControl>
                        <Input className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>País</FormLabel>
                      <FormControl>
                        <Input className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                  <ImageIcon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Logotipo</h2>
                  <p className="mt-0.5 text-xs text-white/40">
                    PNG o JPG. Se usa en reportes PDF (cuando la columna logo_url existe en BD)
                  </p>
                </div>
              </div>
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MultipleFileInput
                        onFilesSelected={files => field.onChange(files)}
                        initialValue={field.value || []}
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        multiple={false}
                        previewType="file"
                        folder="company_logos"
                        entityId={companyId || undefined}
                        className="border-white/10 bg-white/[0.02]"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-white/35">
                      Arrastra una imagen o haz clic para seleccionar
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className={sectionClass}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                  <Settings className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Reglas de negocio</h2>
                  <p className="mt-0.5 text-xs text-white/40">
                    Parámetros operativos de renta, mantenimiento y pagos
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="defaultRentalDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Días de renta por defecto</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maintenanceInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>
                        Intervalo de mantenimiento (km)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="latePaymentFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Cargo por pago tardío ($)</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gracePeriodDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Días de gracia para pagos</FormLabel>
                      <FormControl>
                        <Input type="number" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                  <Bell className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Notificaciones</h2>
                  <p className="mt-0.5 text-xs text-white/40">Canales de alerta para la empresa</p>
                </div>
              </div>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="emailNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm text-white/85">
                          Notificaciones por email
                        </FormLabel>
                        <FormDescription className="text-xs text-white/40">
                          Alertas y reportes por correo electrónico
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsappNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm text-white/85">
                          Notificaciones por WhatsApp
                        </FormLabel>
                        <FormDescription className="text-xs text-white/40">
                          Alertas urgentes (requiere integración)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
              >
                {isSubmitting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
                )}
                Guardar cambios
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
