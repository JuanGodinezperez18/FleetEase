// app/(client)/mileage/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FormModal } from '@/components/common/form-modal';
import MileageLogForm, { type MileageLogFormValues } from '@/app/dashboard/mileage/components/mileage-log-form';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientMileagePage() {
  const { currentUser } = useAuth();
  const { clients, rawVehicles, mileageLogs, companies, addMileageLog } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentClient = useMemo(() => {
    return clients.find(c => c.userId === currentUser?.uid);
  }, [clients, currentUser]);

  const assignedVehicle = useMemo(() => {
    if (!currentClient) return null;
    return rawVehicles.find(v => v.clientId === currentClient.id && v.status !== 'sold');
  }, [currentClient, rawVehicles]);

  const vehicleLogs = useMemo(() => {
    if (!assignedVehicle) return [];
    return mileageLogs
      .filter(log => log.vehicleId === assignedVehicle.id && !log.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assignedVehicle, mileageLogs]);

  const handleMileageSubmit = async (data: MileageLogFormValues) => {
    setIsSubmitting(true);
    try {
      await addMileageLog({
        ...data,
        vehicleId: assignedVehicle!.id,
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding mileage log:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }: any) => format(new Date(row.original.date), 'PPp', { locale: es }),
    },
    {
      accessorKey: 'mileage',
      header: 'Kilometraje',
      cell: ({ row }: any) => `${row.original.mileage.toLocaleString()} km`,
    },
    {
      accessorKey: 'notes',
      header: 'Notas',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registro de Kilometraje</h1>
          <p className="text-muted-foreground mt-1">
            Historial de kilometraje de tu vehículo
          </p>
        </div>
        {assignedVehicle && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Kilometraje
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros ({vehicleLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedVehicle ? (
            <ResponsiveTable
              columns={columns}
              data={vehicleLogs}
              searchPlaceholder="Buscar registro..."
              mobileCardRenderer={(log) => (
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{new Date(log.date).toLocaleDateString('es-MX')}</span>
                    <span className="text-sm text-muted-foreground">{log.mileage.toLocaleString()} km</span>
                  </div>
                  {log.notes && (
                    <p className="text-sm text-muted-foreground">{log.notes}</p>
                  )}
                </div>
              )}
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tienes un vehículo asignado
            </p>
          )}
        </CardContent>
      </Card>

      {assignedVehicle && (
        <FormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Registrar Kilometraje"
        >
          <MileageLogForm
            onSubmit={handleMileageSubmit}
            initialVehicleId={assignedVehicle.id}
            companies={companies}
            isSubmitting={isSubmitting}
            onClose={() => setIsModalOpen(false)}
          />
        </FormModal>
      )}
    </div>
  );
}