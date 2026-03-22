

"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { FinancialRecord } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { transactionsColumns } from './columns';

export default function VehicleTransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const { vehicles, financialRecords, financialCategories, loadingData } = useData();

  const vehicle = useMemo(() => vehicles.find(v => v.id === vehicleId), [vehicles, vehicleId]);

  const vehicleTransactions = useMemo(() => {
    if (!vehicleId || !financialRecords) return [];
    
    const categoryMap = new Map(financialCategories.map(cat => [cat.id, cat.name]));

    return financialRecords
      .filter(fr => fr && fr.vehicleId === vehicleId)
      .map(record => ({
        ...record,
        categoryName: categoryMap.get(record.categoryId || '') || record.category || 'General',
      }))
      .sort((a, b) => {
        const dateA = infallibleNormalizeDate(a.date);
        const dateB = infallibleNormalizeDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
  }, [vehicleId, financialRecords, financialCategories]);

  if (loadingData) {
    return <p>Cargando datos...</p>;
  }

  if (!vehicle) {
    return (
        <>
            <p>Vehículo no encontrado.</p>
            <Button onClick={() => router.push('/dashboard/vehicles')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Vehículos
            </Button>
        </>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push(`/dashboard/vehicles/${vehicleId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Detalles
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Historial de Transacciones
          </CardTitle>
          <CardDescription>
            Un registro completo de todos los ingresos y gastos asociados con este vehículo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={transactionsColumns}
            data={vehicleTransactions}
            searchPlaceholder="Buscar por descripción..."
            noResultsText="No hay transacciones registradas para este vehículo."
          />
        </CardContent>
      </Card>
    </>
  );
}
