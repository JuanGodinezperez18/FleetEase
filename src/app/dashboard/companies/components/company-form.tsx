

"use client";

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Company } from '@/types';
import { MultipleFileInput } from '@/components/common/multiple-file-input';
import { AddressAutocomplete } from '@/components/common/address-autocomplete';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const createCompanySchema = (initialData: Company | null, currentVehicleCount?: number) => z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Correo electrónico inválido.").optional().or(z.literal('')),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos.").optional().or(z.literal('')),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  vehicleLimit: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
    z.number().int().min(0, "El límite no puede ser negativo.").optional()
  ),
  contractTemplateUrl: z.array(z.union([z.string(), z.instanceof(File)])).optional(),
}).refine((data) => {
  if (initialData && typeof data.vehicleLimit === 'number') {
    return data.vehicleLimit >= (currentVehicleCount || 0);
  }
  return true;
}, {
  message: "El límite no puede ser menor que los vehículos actuales",
  path: ["vehicleLimit"],
});


export type CompanyFormValues = z.infer<ReturnType<typeof createCompanySchema>>;

interface CompanyFormProps {
  onSubmit: (data: CompanyFormValues) => void;
  initialData?: Company | null;
  isSubmitting: boolean;
  onClose: () => void;
  companies: Company[]; // Passed for potential validation, though not used in this snippet
  currentVehicleCount?: number;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({ onSubmit, initialData, isSubmitting, onClose, currentVehicleCount = 0 }) => {
    
    const [showCurrentContract, setShowCurrentContract] = useState(!!initialData?.contractTemplateUrl);
    
    const companySchema = useMemo(() => createCompanySchema(initialData || null, currentVehicleCount), [initialData, currentVehicleCount]);

    const form = useForm<CompanyFormValues>({
      resolver: zodResolver(companySchema),
      defaultValues: {
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        street: initialData?.street || '',
        city: initialData?.city || '',
        state: initialData?.state || '',
        zipCode: initialData?.zipCode || '',
        country: initialData?.country || 'México',
        vehicleLimit: initialData?.vehicleLimit ?? undefined,
        contractTemplateUrl: initialData?.contractTemplateUrl ? [initialData.contractTemplateUrl] : [],
      }
    });

    const vehicleLimit = form.watch('vehicleLimit');
  
    const isLimitTooLow = useMemo(() => {
      if (typeof vehicleLimit !== 'number') return false;
      return vehicleLimit < currentVehicleCount;
    }, [vehicleLimit, currentVehicleCount]);


    const handleDownloadContract = () => {
      if (initialData?.contractTemplateUrl) {
        window.open(initialData.contractTemplateUrl, '_blank');
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información General</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FormLabel>Nombre de la Empresa</FormLabel>
                      <FormControl><Input {...field} placeholder="Ej: Mi Flotilla S.A. de C.V." /></FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="vehicleLimit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Límite de Vehículos</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            {...field} 
                            placeholder="Dejar vacío para sin límite" 
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        />
                      </FormControl>
                       {isLimitTooLow && !form.formState.errors.vehicleLimit && (
                        <Alert variant="destructive" className="mt-2 text-xs p-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            La empresa tiene {currentVehicleCount} vehículo(s). El límite es menor.
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl><Input type="email" {...field} placeholder="contacto@miempresa.com" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl><Input type="tel" {...field} placeholder="55 1234 5678" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
          </div>
          
          <Separator />

          <div>
             <h3 className="text-lg font-medium mb-4">Dirección de la Empresa</h3>
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

          <div className="space-y-4">
             <h3 className="text-lg font-medium">Plantilla de Contrato</h3>
              {showCurrentContract && initialData?.contractTemplateUrl && (
                <Alert className="mb-4">
                  <FileText className="h-4 w-4" />
                  <AlertTitle>Contrato Actual</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>Archivo de contrato existente.</span>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleDownloadContract}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          form.setValue('contractTemplateUrl', []);
                          setShowCurrentContract(false);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            <FormField
              control={form.control}
              name="contractTemplateUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {showCurrentContract ? 'Reemplazar Contrato' : 'Archivo de Contrato (Word/PDF)'}
                  </FormLabel>
                  <FormControl>
                    <MultipleFileInput
                      onFilesSelected={(files) => field.onChange(files)}
                      initialValue={field.value || []}
                      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                      multiple={false}
                      folder="contract_templates"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                </Button>
            </div>
        </form>
      </Form>
    );
};
