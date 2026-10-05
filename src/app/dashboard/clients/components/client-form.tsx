"use client";

import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Client, Vehicle, Company, UserProfile } from '@/types';
import { ShieldCheck, Info, Loader2, CalendarPlus, CalendarCheck, UserRound, MapPin, CarFront, Files, WalletCards } from 'lucide-react';
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

const fileOrUrlSchema = z.union([z.string().url("URL de imagen inválida.").optional(), z.instanceof(File).optional()]).nullable();
const baseClientSchema = z.object({
  firstname: z.string().min(2, "El nombre debe tener al menos 2 caracteres."), lastname: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
  email: z.string().email("Correo electrónico inválido.").optional().or(z.literal('')), phone: z.string().regex(/^\d{10}$/, "El teléfono debe tener exactamente 10 dígitos numéricos."),
  status: z.enum(['active', 'inactive']), createdAt: z.string().optional(), vehicleAssignedAt: z.string().optional(), licenseNumber: z.string().min(5, "El número de licencia debe tener al menos 5 caracteres."), licenseExpiry: z.string().min(1, "La fecha de vencimiento es obligatoria."),
  street: z.string().optional(), city: z.string().optional(), state: z.string().optional(), zipCode: z.string().optional(), country: z.string().optional(),
  initialBalance: z.preprocess((val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g,"")) : val), z.number().min(0).optional()), securityDeposit: z.number().optional(), assignedVehicleId: z.string().optional().nullable(),
  photoUrl: fileOrUrlSchema, ineUrl: fileOrUrlSchema, licenseImageUrl: fileOrUrlSchema, companyId: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.createdAt) {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (data.createdAt < '2000-01-01') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['createdAt'], message: 'La fecha de creación no puede ser anterior al año 2000.' });
    } else if (data.createdAt > today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['createdAt'], message: 'La fecha de creación no puede ser futura.' });
    }
  }
});
export type ClientFormValues = z.infer<typeof baseClientSchema>;
interface ClientFormProps { onSubmit: (data: ClientFormValues) => void; initialData?: Client | null; vehicles: Vehicle[]; companies: Company[]; isSubmitting: boolean; onClose: () => void; }
export interface ClientFormHandles { submit: () => void; }
const NONE_SELECT_VALUE = "@none";
const normalizeUniqueValue = (value: string | undefined | null, type: 'email' | 'phone' | 'license') => { const raw = (value ?? '').trim(); if (!raw) return ''; if (type === 'email') return raw.toLowerCase(); if (type === 'phone') return raw.replace(/\D/g, ''); return raw.replace(/\s+/g, ' ').toUpperCase(); };
const getInitialFormValues = (data: Client | null, currentUser: UserProfile | null, globalCompanyId: string | null) => {
  const defaults = { firstname: '', lastname: '', email: '', phone: '', status: 'active' as const, createdAt: format(new Date(), 'yyyy-MM-dd'), vehicleAssignedAt: '', licenseNumber: '', licenseExpiry: '', street: '', city: '', state: '', zipCode: '', country: 'México', assignedVehicleId: NONE_SELECT_VALUE, initialBalance: 0, securityDeposit: 0, photoUrl: undefined as string | undefined, ineUrl: undefined as string | undefined, licenseImageUrl: undefined as string | undefined, companyId: currentUser?.role === 'superAdmin' ? (data?.companyId || globalCompanyId) : currentUser?.companyId };
  if (data) { const normalizedDate = infallibleNormalizeDate(data.licenseExpiry); const normalizedCreatedAt = data.createdAt ? infallibleNormalizeDate(data.createdAt) : null; const normalizedVehicleAssignedAt = data.vehicleAssignedAt ? infallibleNormalizeDate(data.vehicleAssignedAt) : null; return { ...defaults, ...data, createdAt: normalizedCreatedAt ? format(normalizedCreatedAt, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), vehicleAssignedAt: normalizedVehicleAssignedAt ? format(normalizedVehicleAssignedAt, 'yyyy-MM-dd') : '', licenseExpiry: normalizedDate ? format(normalizedDate, 'yyyy-MM-dd') : '', assignedVehicleId: data.assignedVehicleId || NONE_SELECT_VALUE, photoUrl: data.photoUrl || undefined, ineUrl: data.ineUrl || undefined, licenseImageUrl: data.licenseImageUrl || undefined, street: data.street || '', city: data.city || '', state: data.state || '', zipCode: data.zipCode || '', country: data.country || 'México' }; }
  return defaults;
};
export const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, initialData, vehicles, companies, isSubmitting, onClose }) => {
  const { currentUser } = useAuth(); const { credits, selectedCompanyId: globalCompanyId, vehicleAssignmentLogs } = useData();
  /** Admin y SuperAdmin pueden corregir la fecha de alta (p. ej. importaciones o registros históricos). */
  const canEditCreatedAt = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin';
  const clientSchema = useMemo(() => { const schema = baseClientSchema; if (currentUser?.role === 'superAdmin') return schema.superRefine((data, ctx) => { if (!data.companyId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Como Super Admin, debe seleccionar una empresa.", path: ['companyId'] }); }); return schema; }, [currentUser?.role]);
  const form = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema), defaultValues: getInitialFormValues(initialData || null, currentUser, globalCompanyId) });
  const selectedCompanyId = form.watch('companyId'), watchedVehicleId = form.watch('assignedVehicleId'), currentVehicleAssignedAt = form.watch('vehicleAssignedAt'), watchedEmail = form.watch('email'), watchedPhone = form.watch('phone'), watchedLicenseNumber = form.watch('licenseNumber');
  const [duplicateStatus, setDuplicateStatus] = useState({ email: false, phone: false, licenseNumber: false }); const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false); const duplicateCheckRequestRef = useRef(0);
  const clearDuplicateError = useCallback((fieldName: 'email' | 'phone' | 'licenseNumber') => { const fieldState = form.getFieldState(fieldName); if (fieldState.error?.type === 'duplicate') form.clearErrors(fieldName); }, [form]);
