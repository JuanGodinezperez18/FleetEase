// app/(client)/vehicle/page.tsx
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Calendar, Gauge, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientVehiclePage() {
  const { currentUser } = useAuth();
  const { clients, rawVehicles, companies } = useData();

  const currentClient = useMemo(() => {
    return clients.find(c => c.userId === currentUser?.uid);
  }, [clients, currentUser]);

  const assignedVehicle = useMemo(() => {
    if (!currentClient) return null;
    return rawVehicles.find(v => v.clientId === currentClient.id && v.status !== 'sold');
  }, [currentClient, rawVehicles]);

  const configuredMaintenanceInterval = useMemo(() => {
    if (!assignedVehicle) return null;
    const companyInterval = companies.find(c => c.id === assignedVehicle.companyId)?.maintenanceInterval;
    if (typeof companyInterval === 'number' && companyInterval > 0) return companyInterval;
    if (typeof assignedVehicle.maintenanceInterval === 'number' && assignedVehicle.maintenanceInterval > 0) {
      return assignedVehicle.maintenanceInterval;
    }
    return null;
  }, [assignedVehicle, companies]);

  if (!assignedVehicle) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Car className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sin Vehículo Asignado</h2>
            <p className="text-muted-foreground">Actualmente no tienes un vehículo asignado. Contacta al administrador.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kmToMaintenance = configuredMaintenanceInterval
    ? (assignedVehicle.lastMaintenanceMileage || 0) + configuredMaintenanceInterval - (assignedVehicle.currentMileage || 0)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{assignedVehicle.alias}</h1>
        <p className="text-muted-foreground mt-1">{assignedVehicle.make} {assignedVehicle.model} {assignedVehicle.year}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" />Información General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm text-muted-foreground">Placas</p><p className="font-medium">{assignedVehicle.plate || 'N/A'}</p></div>
            <div><p className="text-sm text-muted-foreground">Color</p><p className="font-medium">{assignedVehicle.color || 'N/A'}</p></div>
            <div><p className="text-sm text-muted-foreground">VIN</p><p className="font-medium text-xs">{assignedVehicle.serialNumber || 'N/A'}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" />Kilometraje</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm text-muted-foreground">Actual</p><p className="text-2xl font-bold">{assignedVehicle.currentMileage?.toLocaleString() || 0} km</p></div>
            <div>
              <p className="text-sm text-muted-foreground">Próximo Mantenimiento</p>
              <p className="text-xl font-bold">{Math.max(0, kmToMaintenance).toLocaleString()} km</p>
              {kmToMaintenance < 500 && <Badge variant="destructive" className="mt-2">Mantenimiento Próximo</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Seguro</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm text-muted-foreground">Aseguradora</p><p className="font-medium">{assignedVehicle.insuranceCompany || 'N/A'}</p></div>
            <div><p className="text-sm text-muted-foreground">Vencimiento</p>{assignedVehicle.insuranceExpiryDate ? <p className="font-medium">{format(new Date(assignedVehicle.insuranceExpiryDate), 'PPP', { locale: es })}</p> : <p className="font-medium">N/A</p>}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Último Mantenimiento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm text-muted-foreground">Kilometraje</p><p className="font-medium">{assignedVehicle.lastMaintenanceMileage?.toLocaleString() || 0} km</p></div>
            <div><p className="text-sm text-muted-foreground">Intervalo</p><p className="font-medium">{configuredMaintenanceInterval ? `Cada ${configuredMaintenanceInterval.toLocaleString()} km` : 'Configuración no disponible'}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
