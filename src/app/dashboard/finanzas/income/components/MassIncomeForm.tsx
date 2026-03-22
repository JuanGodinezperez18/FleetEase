
"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import { useToast } from '@/hooks/use-toast';
import { X, User, Car, Loader2, Building, AlertCircle, Download, CreditCard, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { FinancialRecord, Company, FinancialCategory } from '@/types';
import { toast as sonnerToast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DialogFooter } from '@/components/ui/dialog';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

const formSchema = z.object({
  companyId: z.string().min(1, 'Selecciona una compañía'),
  categoryId: z.string().min(1, 'Selecciona una categoría'),
  description: z.string().optional(),
  date: z.string().min(1, 'Fecha es requerida'),
  paymentMethod: z.string().min(1, 'Método de pago es requerido'),
});

export interface MassIncomeFormRef {
  resetForm: () => void;
}

interface VehicleRentData {
  vehicleId: string;
  vehicleName: string;
  clientId: string;
  clientName: string;
  weeklyRent: number;
  disabled?: boolean;
  disabledReason?: string;
}

interface MassIncomeFormProps {
  onSuccess?: () => void;
}

const MassIncomeForm = forwardRef<MassIncomeFormRef, MassIncomeFormProps>(({ onSuccess }, ref) => {
  const { vehicles: allVehicles } = useVehicles();
  const { clients: allClients, credits } = useClients();
  const { financialCategories, addIncome } = useFinances();
  const { companies } = useData();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleRentData, setVehicleRentData] = useState<VehicleRentData[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyId: currentUser?.companyId || '',
      categoryId: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'cash',
    },
  });
  
  const selectedCompanyId = form.watch('companyId');
  const selectedCategoryId = form.watch('categoryId');

  const isVehicleRentCategory = useMemo(() => {
    if (!selectedCategoryId || !financialCategories) return false;
    const category = financialCategories.find(cat => cat.id === selectedCategoryId);
    return category?.name?.toLowerCase().includes('renta') || 
           category?.name?.toLowerCase().includes('rent');
  }, [selectedCategoryId, financialCategories]);
  
  const clientsWithActiveCredit = useMemo(() => 
    new Set(credits.filter(c => c.status === 'active' && !c.isDeleted).map(c => c.clientId)),
    [credits]
  );
  
  useEffect(() => {
    if (isVehicleRentCategory && selectedCompanyId && allVehicles && allClients) {
      
      const companyVehicles = allVehicles.filter(v =>
        v.companyId === selectedCompanyId &&
        !v.isDeleted &&
        v.clientId 
      );
  
      const rentData: VehicleRentData[] = companyVehicles.map(vehicle => {
        const client = allClients.find(c => c.id === vehicle.clientId);
        const hasActiveCredit = clientsWithActiveCredit.has(vehicle.clientId!);
        const isClientActive = client ? client.status === 'active' && !client.isDeleted : false;
  
        let disabled = false;
        let disabledReason = '';
        
        if (!isClientActive) {
            disabled = true;
            disabledReason = 'Cliente inactivo';
        } else if (hasActiveCredit) {
            disabled = true;
            disabledReason = 'Cliente con crédito activo';
        }
  
        return {
          vehicleId: vehicle.id!,
          vehicleName: `${vehicle.make} ${vehicle.model} - ${vehicle.plate}`,
          clientName: client ? `${client.firstname} ${client.lastname}` : 'Cliente no encontrado',
          clientId: vehicle.clientId!,
          weeklyRent: vehicle.weeklyRentalValue || 0,
          disabled,
          disabledReason,
        };
      });
  
      setVehicleRentData(rentData);
    } else {
      setVehicleRentData([]);
    }
  }, [isVehicleRentCategory, selectedCompanyId, allVehicles, allClients, clientsWithActiveCredit]);


  const handleRentChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setVehicleRentData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], weeklyRent: numValue };
      return updated;
    });
  };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser?.uid) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Usuario no autenticado",
        });
        return;
    }

    setIsSubmitting(true);
    const applicableVehicles = vehicleRentData.filter(v => !v.disabled && v.weeklyRent > 0);
    const toastId = sonnerToast.loading(`Registrando ${applicableVehicles.length} ingresos...`);

    if (applicableVehicles.length === 0) {
      sonnerToast.error("No hay registros para procesar", {id: toastId});
      setIsSubmitting(false);
      return;
    }

    try {
      const recordsToCreate = applicableVehicles.map(rentData => ({
        companyId: values.companyId,
        clientId: rentData.clientId,
        vehicleId: rentData.vehicleId,
        categoryId: values.categoryId,
        type: 'income' as const,
        amount: rentData.weeklyRent,
        paymentMethod: values.paymentMethod,
        description: values.description || `Renta semanal - ${rentData.vehicleName}`,
        date: values.date,
        isDeleted: false,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        creditPayment: false,
      }));

      // Usar la función addIncome del contexto que maneja la lógica completa
      await Promise.all(recordsToCreate.map(record => addIncome(record as Omit<FinancialRecord, 'id'>)));
      
      sonnerToast.success(`✓ ${applicableVehicles.length} registro(s) creado(s) exitosamente`, { id: toastId });
      form.reset();
      setVehicleRentData([]);
      onSuccess?.();

    } catch (error) {
        console.error('Error en ingreso masivo:', error);
        sonnerToast.error('Error al procesar los registros', { id: toastId });
    } finally {
        setIsSubmitting(false);
    }
};


  useImperativeHandle(ref, () => ({
    resetForm: () => {
      form.reset();
      setVehicleRentData([]);
    },
  }));

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (currentUser?.role === 'superAdmin') return companies;
    return companies.filter(c => c.id === currentUser?.companyId);
  }, [companies, currentUser]);

  const totalAmount = useMemo(() => {
    return vehicleRentData.filter(v => !v.disabled).reduce((sum, item) => sum + item.weeklyRent, 0);
  }, [vehicleRentData]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentUser?.role === 'superAdmin' && (
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Compañía
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona compañía" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id!}>
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
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {financialCategories?.filter(cat =>
                      cat.type === 'income' &&
                      (cat.name.toLowerCase() === 'renta de auto' ||
                       cat.name.toLowerCase() === 'renta de autos' ||
                       cat.name.toLowerCase() === 'renta auto' ||
                       cat.name.toLowerCase().includes('renta') ||
                       cat.name.toLowerCase().includes('rent'))
                    ).map((category) => (
                      <SelectItem key={category.id} value={category.id!}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pago</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona método" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (opcional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: Cargo semanal de renta" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isVehicleRentCategory && vehicleRentData.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Vehículos Cargables</p>
                      <p className="text-2xl font-bold">{vehicleRentData.filter(v => !v.disabled).length}</p>
                    </div>
                    <Car className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Total a Registrar</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
                    </div>
                    <Download className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Se registrará un ingreso para cada uno de los <strong>{vehicleRentData.filter(v => !v.disabled).length} vehículos</strong> habilitados. Los vehículos con clientes inactivos o con créditos activos están deshabilitados.
              </AlertDescription>
            </Alert>


            <div className="space-y-2 max-h-96 overflow-y-auto">
              {vehicleRentData.map((rentData, index) => (
                <Card key={rentData.vehicleId} className={rentData.disabled ? 'bg-muted/50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{rentData.vehicleName}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{rentData.clientName}</span>
                          {rentData.disabled && (
                              <Badge variant="destructive" className="text-xs">{rentData.disabledReason}</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={rentData.weeklyRent}
                            onChange={(e) => handleRentChange(index, e.target.value)}
                            className="w-32"
                            placeholder="0.00"
                            disabled={rentData.disabled}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || !isVehicleRentCategory || vehicleRentData.filter(v => !v.disabled && v.weeklyRent > 0).length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Registrar {vehicleRentData.filter(v => !v.disabled && v.weeklyRent > 0).length} Ingreso(s)
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
});

MassIncomeForm.displayName = 'MassIncomeForm';

export default MassIncomeForm;
