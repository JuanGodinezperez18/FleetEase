

"use client";

import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Client, Vehicle, Company, UserProfile } from '@/types';
import { ShieldCheck, Info, Loader2, CalendarPlus, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import { MultipleFileInput } from '@/components/common/multiple-file-input';
import { AddressAutocomplete } from '@/components/common/address-autocomplete';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { INEScanner } from '@/components/clients/ine-scanner';
import { toast } from 'sonner';
import { useIntelligentVehicleAssignment } from '@/hooks/use-intelligent-vehicle-assignment';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

const fileOrUrlSchema = z.union([
  z.string().url("URL de imagen inválida.").optional(),
  z.instanceof(File).optional(),
]).nullable();

const baseClientSchema = z.object({
  firstname: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  lastname: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  email: z.string().email("Correo electrónico inválido.").optional().or(z.literal('')),
  phone: z.string().regex(/^\d{10}$/, "El teléfono debe tener exactamente 10 dígitos numéricos."),
  status: z.enum(['active', 'inactive']),
  createdAt: z.string().optional(),
  vehicleAssignedAt: z.string().optional(),
  licenseNumber: z.string().min(5, "El número de licencia debe tener al menos 5 caracteres."),
  licenseExpiry: z.string().min(1, "La fecha de vencimiento es obligatoria."),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  initialBalance: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val),
    z.number().min(0).optional()
  ),
  securityDeposit: z.number().optional(),
  assignedVehicleId: z.string().optional().nullable(),
  photoUrl: fileOrUrlSchema,
  ineUrl: fileOrUrlSchema,
  licenseImageUrl: fileOrUrlSchema,
  companyId: z.string().optional().nullable(),
});

export type ClientFormValues = z.infer<typeof baseClientSchema>;

interface ClientFormProps {
  onSubmit: (data: ClientFormValues) => void;
  initialData?: Client | null;
  vehicles: Vehicle[];
  companies: Company[];
  isSubmitting: boolean;
  onClose: () => void;
}

export interface ClientFormHandles {
  submit: () => void;
}

const NONE_SELECT_VALUE = "@none";

const normalizeUniqueValue = (value: string | undefined | null, type: 'email' | 'phone' | 'license') => {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  if (type === 'email') return raw.toLowerCase();
  if (type === 'phone') return raw.replace(/\D/g, '');
  return raw.replace(/\s+/g, ' ').toUpperCase();
};

const getInitialFormValues = (data: Client | null, currentUser: UserProfile | null, globalCompanyId: string | null) => {
  const defaults = {
    firstname: '', lastname: '', email: '', phone: '', status: 'active' as const,
    createdAt: format(new Date(), 'yyyy-MM-dd'),
    vehicleAssignedAt: '',
    licenseNumber: '', licenseExpiry: '',
    street: '', city: '', state: '', zipCode: '', country: 'México',
    assignedVehicleId: NONE_SELECT_VALUE, initialBalance: 0,
    securityDeposit: 0,
    photoUrl: undefined as string | undefined,
    ineUrl: undefined as string | undefined,
    licenseImageUrl: undefined as string | undefined,
    companyId: currentUser?.role === 'superAdmin' ? (data?.companyId || globalCompanyId) : currentUser?.companyId,
  };

  if (data) {
    const normalizedDate = infallibleNormalizeDate(data.licenseExpiry);
    const normalizedCreatedAt = data.createdAt ? infallibleNormalizeDate(data.createdAt) : null;
    const normalizedVehicleAssignedAt = data.vehicleAssignedAt ? infallibleNormalizeDate(data.vehicleAssignedAt) : null;

    return {
      ...defaults,
      ...data,
      createdAt: normalizedCreatedAt ? format(normalizedCreatedAt, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      vehicleAssignedAt: normalizedVehicleAssignedAt ? format(normalizedVehicleAssignedAt, 'yyyy-MM-dd') : '',
      licenseExpiry: normalizedDate ? format(normalizedDate, 'yyyy-MM-dd') : '',
      assignedVehicleId: data.assignedVehicleId || NONE_SELECT_VALUE,
      photoUrl: data.photoUrl || undefined,
      ineUrl: data.ineUrl || undefined,
      licenseImageUrl: data.licenseImageUrl || undefined,
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      zipCode: data.zipCode || '',
      country: data.country || 'México',
    };
  }
  return defaults;
};

export const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, initialData, vehicles, companies, isSubmitting, onClose }) => {
  const { currentUser } = useAuth();
  const { credits, selectedCompanyId: globalCompanyId, vehicleAssignmentLogs } = useData();

  const clientSchema = useMemo(() => {
    const schema = baseClientSchema;
    if (currentUser?.role === 'superAdmin') {
      return schema.superRefine((data, ctx) => {
        if (!data.companyId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Como Super Admin, debe seleccionar una empresa.",
            path: ['companyId'],
          });
        }
      });
    }
    return schema;
  }, [currentUser?.role]);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: getInitialFormValues(initialData || null, currentUser, globalCompanyId)
  });

  const selectedCompanyId = form.watch('companyId');
  const watchedVehicleId = form.watch('assignedVehicleId');
  const currentVehicleAssignedAt = form.watch('vehicleAssignedAt');
  const watchedEmail = form.watch('email');
  const watchedPhone = form.watch('phone');
  const watchedLicenseNumber = form.watch('licenseNumber');

  const [duplicateStatus, setDuplicateStatus] = useState({ email: false, phone: false, licenseNumber: false });
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const duplicateCheckRequestRef = useRef(0);

  const clearDuplicateError = useCallback((fieldName: 'email' | 'phone' | 'licenseNumber') => {
    const fieldState = form.getFieldState(fieldName);
    if (fieldState.error?.type === 'duplicate') {
      form.clearErrors(fieldName);
    }
  }, [form]);

  useEffect(() => {
    const companyId = currentUser?.role === 'superAdmin' ? selectedCompanyId : currentUser?.companyId;
    const requestId = ++duplicateCheckRequestRef.current;
    const timer = window.setTimeout(async () => {
      if (!companyId) {
        setDuplicateStatus({ email: false, phone: false, licenseNumber: false });
        setIsCheckingDuplicates(false);
        return;
      }

      const email = normalizeUniqueValue(watchedEmail, 'email');
      const phone = normalizeUniqueValue(watchedPhone, 'phone');
      const licenseNumber = normalizeUniqueValue(watchedLicenseNumber, 'license');
      const emailIsValid = !email || z.string().email().safeParse(email).success;
      const phoneIsValid = /^\d{10}$/.test(phone);
      const licenseIsValid = licenseNumber.length >= 5;

      if (!emailIsValid && !phoneIsValid && !licenseIsValid) {
        setDuplicateStatus({ email: false, phone: false, licenseNumber: false });
        setIsCheckingDuplicates(false);
        return;
      }

      setIsCheckingDuplicates(true);

      const baseQuery = () => supabase
        .from('clients')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_deleted', false)
        .limit(1);

      const checks = [
        emailIsValid && email
          ? baseQuery().ilike('email', email)
          : Promise.resolve({ data: [], error: null }),
        phoneIsValid
          ? baseQuery().eq('phone', phone)
          : Promise.resolve({ data: [], error: null }),
        licenseIsValid
          ? baseQuery().ilike('license_number', licenseNumber)
          : Promise.resolve({ data: [], error: null }),
      ];

      const [emailResult, phoneResult, licenseResult] = await Promise.all(checks);

      if (requestId !== duplicateCheckRequestRef.current) return;

      const results = [emailResult, phoneResult, licenseResult];
      const queryError = results.find(result => result.error)?.error;
      if (queryError) {
        setDuplicateStatus({ email: false, phone: false, licenseNumber: false });
        setIsCheckingDuplicates(false);
        return;
      }

      const duplicateEmail = emailIsValid && email ? (emailResult.data?.length ?? 0) > 0 : false;
      const duplicatePhone = phoneIsValid ? (phoneResult.data?.length ?? 0) > 0 : false;
      const duplicateLicense = licenseIsValid ? (licenseResult.data?.length ?? 0) > 0 : false;

      if (initialData?.id) {
        const currentId = initialData.id;
        if (duplicateEmail && emailResult.data?.[0]?.id === currentId) {
          // Current record is allowed when editing; the query is rechecked below only when needed.
        }
      }

      setDuplicateStatus({ email: duplicateEmail, phone: duplicatePhone, licenseNumber: duplicateLicense });
      setIsCheckingDuplicates(false);

      if (duplicateEmail) {
        form.setError('email', { type: 'duplicate', message: 'Este correo electrónico ya está registrado para otro cliente de esta empresa.' });
      } else clearDuplicateError('email');

      if (duplicatePhone) {
        form.setError('phone', { type: 'duplicate', message: 'Este número de teléfono ya está registrado para otro cliente de esta empresa.' });
      } else clearDuplicateError('phone');

      if (duplicateLicense) {
        form.setError('licenseNumber', { type: 'duplicate', message: 'Este número de licencia ya está registrado para otro cliente de esta empresa.' });
      } else clearDuplicateError('licenseNumber');
    }, 450);

    setIsCheckingDuplicates(Boolean(companyId && (
      (watchedEmail?.trim() && z.string().email().safeParse(watchedEmail.trim()).success) ||
      /^\d{10}$/.test(normalizeUniqueValue(watchedPhone, 'phone')) ||
      normalizeUniqueValue(watchedLicenseNumber, 'license').length >= 5
    )));

    return () => window.clearTimeout(timer);
  }, [selectedCompanyId, currentUser?.companyId, currentUser?.role, watchedEmail, watchedPhone, watchedLicenseNumber, initialData?.id, form, clearDuplicateError]);

  const hasDuplicateData = Object.values(duplicateStatus).some(Boolean);

  // Use intelligent assignment hook
  const intelligentAssignment = useIntelligentVehicleAssignment(
    initialData?.id,
    watchedVehicleId === NONE_SELECT_VALUE ? null : watchedVehicleId,
    vehicleAssignmentLogs,
    currentVehicleAssignedAt
  );

  const hasActiveCredit = useMemo(() => {
    if (!initialData || !credits) return false;
    return credits.some(c => c.clientId === initialData.id && c.status === 'active' && !c.isDeleted);
  }, [credits, initialData]);

  const selectableVehicles = useMemo(() => {
    const companyIdToFilter = currentUser?.role === 'superAdmin' ? selectedCompanyId : currentUser?.companyId;
    if (!companyIdToFilter) return [];

    const companyVehicles = vehicles.filter(v => v.companyId === companyIdToFilter && !v.isDeleted);

    return companyVehicles.filter(v => {
      const isCurrentlyAssignedToThisClient = v.id === initialData?.assignedVehicleId;
      if (v.lockedByCredit && !isCurrentlyAssignedToThisClient) return false;

      const isUnassignedAndActive = v.status === 'active' && !v.clientId;

      return isUnassignedAndActive || isCurrentlyAssignedToThisClient;
    });
  }, [vehicles, initialData, selectedCompanyId, currentUser]);

  useEffect(() => {
    if (isSubmitting) return;

    if (intelligentAssignment.isDateLocked && intelligentAssignment.assignmentDate) {
      const currentValue = form.getValues('vehicleAssignedAt');
      if (currentValue !== intelligentAssignment.assignmentDate) {
        form.setValue('vehicleAssignedAt', intelligentAssignment.assignmentDate, {
          shouldValidate: false,
          shouldDirty: false
        });
      }
    }
  }, [intelligentAssignment.isDateLocked, intelligentAssignment.assignmentDate, isSubmitting, form]);
  
  useEffect(() => {
    if (isSubmitting) return;

    if (watchedVehicleId && watchedVehicleId !== NONE_SELECT_VALUE && !currentVehicleAssignedAt && !intelligentAssignment.isDateLocked) {
      const previousVehicleId = initialData?.assignedVehicleId;
      if (!previousVehicleId || previousVehicleId !== watchedVehicleId) {
        form.setValue('vehicleAssignedAt', format(new Date(), 'yyyy-MM-dd'), {
          shouldValidate: false,
          shouldDirty: true
        });
      }
    }
  }, [watchedVehicleId, currentVehicleAssignedAt, intelligentAssignment.isDateLocked, initialData?.assignedVehicleId, isSubmitting, form]);

  const handleFileChange = useCallback((files: (string | File)[], fieldName: keyof ClientFormValues) => {
    form.setValue(fieldName, files.length > 0 ? files[0] : null, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleINEDataExtracted = useCallback((data: {
    firstname?: string;
    lastname?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    curp?: string;
    claveElector?: string;
    birthDate?: string;
    sex?: string;
  }) => {
    if (data.firstname) form.setValue('firstname', data.firstname, { shouldValidate: true });
    if (data.lastname) form.setValue('lastname', data.lastname, { shouldValidate: true });
    if (data.street) form.setValue('street', data.street, { shouldValidate: true });
    if (data.city) form.setValue('city', data.city, { shouldValidate: true });
    if (data.state) form.setValue('state', data.state, { shouldValidate: true });
    if (data.zipCode) form.setValue('zipCode', data.zipCode, { shouldValidate: true });

    toast.success('Datos del cliente cargados', {
      description: 'Revisa y completa la información faltante',
    });
  }, [form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!initialData && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                  ¿Tienes la INE del cliente?
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Escanéala para llenar automáticamente nombre, apellidos y dirección
                </p>
              </div>
              <INEScanner
                onDataExtracted={handleINEDataExtracted}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentUser?.role === 'superAdmin' && (
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Empresa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empresa" />
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
          <FormField control={form.control} name="firstname" render={({ field }) => (
            <FormItem><FormLabel>Nombre(s)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="lastname" render={({ field }) => (
            <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="createdAt" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" />
                Fecha de Creación
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  disabled={!!initialData}
                  className={!!initialData ? "bg-muted cursor-not-allowed" : ""}
                />
              </FormControl>
              {!!initialData && (
                <p className="text-xs text-muted-foreground">Esta fecha no se puede modificar después de crear el cliente</p>
              )}
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="vehicleAssignedAt" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Fecha de Asignación de Vehículo
                {intelligentAssignment.isCurrentAssignment && (
                  <Badge variant="secondary" className="ml-2 text-xs">Asignación Actual</Badge>
                )}
                {intelligentAssignment.isReassignment && (
                  <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-600">
                    Reasignación ({intelligentAssignment.previousAssignmentsCount}x)
                  </Badge>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value || ''}
                  disabled={intelligentAssignment.isDateLocked}
                  className={intelligentAssignment.isDateLocked ? "bg-muted cursor-not-allowed" : ""}
                />
              </FormControl>
              {intelligentAssignment.isDateLocked && (
                <Alert className="mt-2 border-blue-500">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-xs">
                    Esta es la asignación actual. La fecha está bloqueada para preservar el historial.
                  </AlertDescription>
                </Alert>
              )}
              {!intelligentAssignment.isDateLocked && !watchedVehicleId && (
                <p className="text-xs text-muted-foreground">
                  Se llena automáticamente al asignar un vehículo por primera vez
                </p>
              )}
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
              {isCheckingDuplicates && watchedEmail?.trim() && (
                <p className="text-xs text-muted-foreground">Verificando disponibilidad...</p>
              )}
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Teléfono</FormLabel>
              <FormControl><Input type="tel" {...field} /></FormControl>
              <FormMessage />
              {isCheckingDuplicates && watchedPhone?.trim() && (
                <p className="text-xs text-muted-foreground">Verificando disponibilidad...</p>
              )}
            </FormItem>
          )} />
          <FormField control={form.control} name="licenseNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Licencia</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
              {isCheckingDuplicates && watchedLicenseNumber?.trim() && (
                <p className="text-xs text-muted-foreground">Verificando disponibilidad...</p>
              )}
            </FormItem>
          )} />
          <FormField control={form.control} name="licenseExpiry" render={({ field }) => (
            <FormItem><FormLabel>Vencimiento de Licencia</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="initialBalance" render={({ field }) => (
            <FormItem><FormLabel>Saldo Inicial (MXN)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormItem>
            <FormLabel>Depósito en Garantía</FormLabel>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                readOnly
                value={formatCurrency(initialData?.securityDeposit || 0)}
                className="pl-10 bg-muted/50 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-muted-foreground">Este campo se actualiza desde el módulo de ingresos.</p>
          </FormItem>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-4">Dirección del Cliente</h3>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="assignedVehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asignar Vehículo (Opcional)</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === NONE_SELECT_VALUE ? null : value)} value={field.value ?? NONE_SELECT_VALUE} disabled={hasActiveCredit}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un vehículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_SELECT_VALUE}>Ninguno</SelectItem>
                    {selectableVehicles.map(vehicle => (<SelectItem key={vehicle.id} value={vehicle.id}>{`${vehicle.make} ${vehicle.model} (${vehicle.plate})`}</SelectItem>))}
                  </SelectContent>
                </Select>
                {hasActiveCredit && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Info className="h-3 w-3" /> No se puede cambiar el vehículo mientras exista un crédito activo.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado del Cliente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 pt-4">
          <FormField control={form.control} name="photoUrl" render={({ field: { value } }) => (
            <FormItem>
              <FormLabel>Foto del Cliente</FormLabel>
              <FormControl>
                <MultipleFileInput onFilesSelected={(files) => handleFileChange(files, 'photoUrl')} initialValue={value ? [value] : []} accept="image/*" multiple={false} previewType="avatar" entityId={initialData?.id} folder="driver_documents" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="ineUrl" render={({ field: { value } }) => (
            <FormItem>
              <FormLabel>Foto del INE</FormLabel>
              <FormControl>
                <MultipleFileInput onFilesSelected={(files) => handleFileChange(files, 'ineUrl')} initialValue={value ? [value] : []} accept="image/*,application/pdf" multiple={false} entityId={initialData?.id} folder="driver_documents" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="licenseImageUrl" render={({ field: { value } }) => (
            <FormItem>
              <FormLabel>Foto de la Licencia</FormLabel>
              <FormControl>
                <MultipleFileInput onFilesSelected={(files) => handleFileChange(files, 'licenseImageUrl')} initialValue={value ? [value] : []} accept="image/*,application/pdf" multiple={false} entityId={initialData?.id} folder="driver_documents" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isCheckingDuplicates}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isCheckingDuplicates || hasDuplicateData}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Guardando..." : isCheckingDuplicates ? "Verificando..." : "Guardar"}
            </Button>
        </div>
      </form>
    </Form>
  );
};
