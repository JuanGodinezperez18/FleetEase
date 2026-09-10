
"use client";

import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Partner, Company } from '@/types';
import { useAuth } from '@/contexts/auth-provider';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from '@/components/common/address-autocomplete';
import { Separator } from '@/components/ui/separator';

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, '');

const createPartnerSchema = (partners: Partner[], editingPartnerId?: string) => z.object({
  firstname: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  lastname: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }).optional().or(z.literal('')),
  phone: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      return /^\d{10,}$/.test(normalizePhone(val));
    }, {
      message: "El teléfono debe contener al menos 10 dígitos numéricos"
    }),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  initialBalance: z.preprocess(
    (val) => (val === '' || val === undefined || val === null) ? undefined : parseFloat(String(val).replace(/,/g, '')),
    z.number().min(0, "El saldo inicial no puede ser negativo.").optional()
  ),
  companyId: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  const companyId = data.companyId;
  if (!companyId) return;

  if (data.email) {
    const duplicateEmail = partners.some((partner) =>
      partner.id !== editingPartnerId &&
      !partner.isDeleted &&
      partner.companyId === companyId &&
      normalizeEmail(partner.email || '') === normalizeEmail(data.email)
    );
    if (duplicateEmail) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: "Este correo electrónico ya está registrado para otro socio de esta empresa." });
    }
  }

  if (data.phone) {
    const duplicatePhone = partners.some((partner) =>
      partner.id !== editingPartnerId &&
      !partner.isDeleted &&
      partner.companyId === companyId &&
      normalizePhone(partner.phone || '') === normalizePhone(data.phone)
    );
    if (duplicatePhone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: "Este número de teléfono ya está registrado para otro socio de esta empresa." });
    }
  }
});

export type PartnerFormValues = z.infer<ReturnType<typeof createPartnerSchema>>;

interface PartnerFormProps {
  onSubmit: (data: PartnerFormValues) => void;
  initialData?: Partial<Partner> | null;
  companies: Company[];
  isSubmitting: boolean;
  onClose: () => void;
}

export const PartnerForm: React.FC<PartnerFormProps> = ({ onSubmit, initialData, companies, isSubmitting, onClose }) => {
  const { currentUser } = useAuth();
  const { partners } = useData();

  const partnerSchema = useMemo(
    () => createPartnerSchema(partners, initialData?.id),
    [partners, initialData?.id]
  );

  const defaultValues = useMemo(() => ({
    firstname: initialData?.firstname || '',
    lastname: initialData?.lastname || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    street: initialData?.street || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    country: initialData?.country || 'México',
    initialBalance: initialData?.initialBalance || 0,
    companyId: initialData?.companyId || currentUser?.companyId || null,
  }), [initialData, currentUser]);

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues,
    mode: 'onChange',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {currentUser?.role === 'superAdmin' && (
          <FormField
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="firstname" render={({ field }) => (
            <FormItem><FormLabel>Nombre(s) del Socio</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="lastname" render={({ field }) => (
            <FormItem><FormLabel>Apellidos del Socio</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Correo Electrónico (Opcional)</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Número de Teléfono (Opcional)</FormLabel><FormControl><Input type="tel" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <Separator />
        <div>
          <h3 className="text-lg font-medium mb-4">Dirección del Socio (Opcional)</h3>
          <AddressAutocomplete
            values={{ street: form.watch('street'), city: form.watch('city'), state: form.watch('state'), zipCode: form.watch('zipCode'), country: form.watch('country') }}
            onChange={(address) => {
              form.setValue('street', address.street || '', { shouldValidate: true });
              form.setValue('city', address.city || '', { shouldValidate: true });
              form.setValue('state', address.state || '', { shouldValidate: true });
              form.setValue('zipCode', address.zipCode || '', { shouldValidate: true });
              form.setValue('country', address.country || 'México', { shouldValidate: true });
            }}
            errors={{ street: form.formState.errors.street?.message, city: form.formState.errors.city?.message, state: form.formState.errors.state?.message, zipCode: form.formState.errors.zipCode?.message }}
            disabled={isSubmitting}
          />
        </div>

        <Separator />
        <FormField control={form.control} name="initialBalance" render={({ field }) => (
          <FormItem><FormLabel>Saldo Inicial (Opcional)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
