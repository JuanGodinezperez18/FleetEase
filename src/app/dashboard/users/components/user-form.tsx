

"use client";

import React, { useMemo, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserProfile, UserRole, Company, Partner } from '@/types';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { Building, Briefcase, Info, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from '@/components/common/address-autocomplete';
import { Separator } from '@/components/ui/separator';

const baseUserFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Dirección de correo electrónico inválida." }),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos.").optional().or(z.literal('')),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  role: z.enum(['admin', 'editor', 'viewer', 'superAdmin', 'partner', 'client'], { required_error: "El rol es obligatorio." }),
  companyId: z.string().optional().nullable(),
  partnerAccess: z.array(z.string()).optional(),
});

export type UserFormValues = z.infer<typeof baseUserFormSchema>;

interface UserFormProps {
  onSubmit: (data: UserFormValues) => void;
  initialData?: UserProfile | null;
  currentUserRole: UserRole;
  isSubmitting: boolean;
  onClose: () => void;
}

export interface UserFormHandles {
    submit: () => void;
}

const availableRoles: { value: UserRole; label: string; description: string }[] = [
  { value: 'superAdmin', label: 'Super Admin', description: 'Acceso total a todas las empresas y configuraciones.' },
  { value: 'admin', label: 'Administrador', description: 'Acceso total a los datos de su empresa asignada.' },
  { value: 'editor', label: 'Editor', description: 'Puede crear y editar registros en su empresa.' },
  { value: 'viewer', label: 'Visualizador (Socio)', description: 'Acceso de solo lectura a socios específicos.' },
];

const commonEmailDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];

export const UserForm: React.FC<UserFormProps> = ({ onSubmit, initialData, currentUserRole, isSubmitting, onClose }) => {
    
    const { currentUser } = useAuth();
    const { companies, partners } = useData();
    const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);

    const userFormSchema = useMemo(() => {
        return baseUserFormSchema.superRefine((data, ctx) => {
            if (currentUser?.role === 'superAdmin' && data.role !== 'superAdmin' && !data.companyId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Como Super Admin, debe seleccionar una empresa para roles no globales.",
                    path: ['companyId'],
                });
            }
        });
    }, [currentUser?.role]);
    
    const defaultValues = useMemo(() => initialData ? {
        ...initialData,
        phone: initialData.phone ?? '',
        street: initialData.street ?? '',
        city: initialData.city ?? '',
        state: initialData.state ?? '',
        zipCode: initialData.zipCode ?? '',
        country: initialData.country ?? 'México',
        companyId: initialData.companyId || currentUser?.companyId,
        partnerAccess: initialData.partnerAccess || []
    } : {
        name: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'México',
        role: 'editor' as UserRole, // Change default to editor
        companyId: currentUser?.companyId || null,
        partnerAccess: [],
    }, [initialData, currentUser]);

    const form = useForm<UserFormValues>({
      resolver: zodResolver(userFormSchema),
      defaultValues,
    });

    const isEditing = !!initialData;
    const selectedRole = form.watch('role');
    const selectedCompanyId = form.watch('companyId');
    const emailValue = form.watch('email');

    useEffect(() => {
        const checkEmailDomain = (email: string) => {
            if (!email || !email.includes('@')) {
                setEmailSuggestion(null);
                return;
            }
            const domain = email.split('@')[1];
            if (domain && !commonEmailDomains.some(d => domain.toLowerCase().includes(d))) {
                setEmailSuggestion(`El dominio "${domain}" es poco común. Verifica que sea correcto.`);
            } else {
                setEmailSuggestion(null);
            }
        };
        checkEmailDomain(emailValue);
    }, [emailValue]);

    const partnerOptions: MultiSelectOption[] = useMemo(() => {
        if (!selectedCompanyId || !partners) return [];
        return partners
            .filter(p => p.companyId === selectedCompanyId && !p.isDeleted)
            .map(p => ({ value: p.id, label: `${p.firstname} ${p.lastname}` }));
    }, [partners, selectedCompanyId]);
    
    useEffect(() => {
        if (selectedRole !== 'viewer') {
            form.setValue('partnerAccess', []);
        }
    }, [selectedRole, form]);
    
    useEffect(() => {
        // Clear partner access if company changes
        form.setValue('partnerAccess', []);
    }, [selectedCompanyId, form]);

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {currentUserRole === 'superAdmin' && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                    <FormItem>
                        <Label>Empresa</Label>
                        <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={selectedRole === 'superAdmin'}>
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
            name="name"
            render={({ field }) => (
                <FormItem>
                    <Label>Nombre Completo</Label>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
           />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                    <Label>Correo Electrónico</Label>
                    <FormControl><Input type="email" {...field} disabled={isEditing} /></FormControl>
                    <FormMessage />
                    {emailSuggestion && !form.formState.errors.email && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-amber-600">
                           <Info className="h-3 w-3" /> {emailSuggestion}
                        </div>
                    )}
                    {isEditing && <p className="text-xs text-muted-foreground mt-1">El correo electrónico no se puede cambiar después de la creación.</p>}
                </FormItem>
            )}
           />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                    <Label>Número de Teléfono (Opcional)</Label>
                    <FormControl><Input type="tel" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
           />

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4">Dirección del Usuario (Opcional)</h3>
            <AddressAutocomplete
              values={{
                street: form.watch('street'),
                city: form.watch('city'),
                state: form.watch('state'),
                zipCode: form.watch('zipCode'),
                country: form.watch('country'),
              }}
              onChange={(address) => {
                form.setValue('street', address.street || '', { shouldValidate: true });
                form.setValue('city', address.city || '', { shouldValidate: true });
                form.setValue('state', address.state || '', { shouldValidate: true });
                form.setValue('zipCode', address.zipCode || '', { shouldValidate: true });
                form.setValue('country', address.country || 'México', { shouldValidate: true });
              }}
              errors={{
                street: form.formState.errors.street?.message,
                city: form.formState.errors.city?.message,
                state: form.formState.errors.state?.message,
                zipCode: form.formState.errors.zipCode?.message,
              }}
              disabled={isSubmitting}
            />
          </div>

          <Separator />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                    <Label>Rol</Label>
                    <Select onValueChange={field.onChange} value={field.value} disabled={initialData?.uid === (currentUser?.uid || '')}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar rol..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {availableRoles
                                .filter(r => currentUserRole === 'superAdmin' || r.value !== 'superAdmin')
                                .map(roleOption => (
                                    <SelectItem 
                                        key={roleOption.value} 
                                        value={roleOption.value}
                                        disabled={currentUserRole === 'admin' && (roleOption.value === 'superAdmin' || roleOption.value === 'admin')}
                                    >
                                        <div className="flex flex-col">
                                            <span>{roleOption.label}</span>
                                            <span className="text-xs text-muted-foreground">{roleOption.description}</span>
                                        </div>
                                    </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
           />
          {selectedRole === 'viewer' && (
            <FormField
              control={form.control}
              name="partnerAccess"
              render={({ field }) => (
                <FormItem>
                  <Label>Acceso a Socios (Opcional)</Label>
                  <FormControl>
                     <MultiSelect
                        options={partnerOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder={partnerOptions.length > 0 ? "Seleccionar socios..." : "No hay socios en esta empresa"}
                     />
                  </FormControl>
                   <p className="text-xs text-muted-foreground mt-1">Seleccione los socios a los que este usuario tendrá acceso de solo lectura.</p>
                  <FormMessage />
                </FormItem>
              )}
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
    );
};
