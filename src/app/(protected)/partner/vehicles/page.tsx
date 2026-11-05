// app/(partner)/vehicles/page.tsx
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPartnerVehicleColumns } from './columns';

export default function PartnerVehiclesPage() {
  const { currentUser } = useAuth();
  const { partners, rawVehicles } = useData();

  const currentPartner = useMemo(() => {
    return partners.find(p => p.userId === currentUser?.uid);
  }, [partners, currentUser]);

  const partnerVehicles = useMemo(() => {
    if (!currentPartner) return [];
    return rawVehicles.filter(v => v.partnerId === currentPartner.id && v.status !== 'sold');
  }, [currentPartner, rawVehicles]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Vehículos</h1>
        <p className="text-muted-foreground mt-1">
          Listado de tus vehículos en la flota
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehículos ({partnerVehicles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            columns={getPartnerVehicleColumns()}
            data={partnerVehicles}
            mobileCardRenderer={(vehicle) => (
              <Card key={vehicle.id} className="mb-3">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{vehicle.alias}</h3>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.make} {vehicle.model} {vehicle.year}
                        </p>
                      </div>
                      <Badge variant={vehicle.clientId ? 'default' : 'secondary'}>
                        {vehicle.clientId ? 'Rentado' : 'Disponible'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Kilometraje</p>
                      <p className="font-medium">{vehicle.currentMileage?.toLocaleString() || 0} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            searchPlaceholder="Buscar vehículo..."
          />
        </CardContent>
      </Card>
    </div>
  );
}