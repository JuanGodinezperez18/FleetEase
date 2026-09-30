 

"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Car, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/components/MetricCard';
import { formatCurrency } from '@/lib/utils';
import { DataTable } from '@/components/common/data-table';
import { getVehicleColumns } from '@/app/dashboard/vehicles/columns';
import type { Vehicle, Partner, Client, FinancialRecord } from '@/types';
import Link from 'next/link';
import { calculatePartnerBalance } from '@/contexts/data-provider';
import { calculatePartnerProfitability, calculateProfitMargin, getPartnerFinancialRecords } from '@/lib/financial-metrics';

export default function PartnerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = params.partnerId as string;

  const { partners, vehicles, financialRecords, clients, loadingData, partnerBalances } = useData();

  const partner = useMemo(() => {
    return partners.find(p => p.id === partnerId && !p.isDeleted);
  }, [partners, partnerId]);

  const partnerVehicles = useMemo(() => {
    return vehicles.filter(v => v.partnerId === partnerId && !v.isDeleted);
  }, [vehicles, partnerId]);

  const metrics = useMemo(() => {
    if (!partner) return { totalIncome: 0, totalExpenses: 0, netProfit: 0, partnerBalance: 0, profitMargin: 0, vehicleCount: 0 };
    
    const partnerRecords = getPartnerFinancialRecords(partner, partnerVehicles, financialRecords);
    const profitability = calculatePartnerProfitability(partnerVehicles, partnerRecords);
    const partnerBalanceData = partnerBalances.find(pb => pb.id === partnerId);
    const partnerBalance = partnerBalanceData?.balance ?? 0;

    return {
      totalIncome: profitability.totalIncome,
      totalExpenses: profitability.totalExpenses,
      netProfit: profitability.netProfit,
      partnerBalance,
      profitMargin: calculateProfitMargin(profitability.totalIncome, profitability.totalExpenses),
      vehicleCount: partnerVehicles.length,
    };
}, [partner, partnerVehicles, financialRecords, partnerId, partnerBalances]);

  const vehicleColumns = useMemo(() => {
    return getVehicleColumns({
        onEdit: (vehicle) => router.push(`/dashboard/vehicles?action=edit&vehicleId=${vehicle.id}`),
        onDelete: (vehicleId) => console.log(`Delete ${vehicleId}`),
        onNavigate: (path) => router.push(path),
        clients: clients,
        partners: partners,
    }).filter(col => col.id !== 'partnerId'); // Ocultar columna de socio
  }, [router, clients, partners]);

  if (loadingData && !partner) {
    return <p>Cargando socio...</p>;
  }

  if (!partner) {
    return (
      <Card>
        <CardHeader><CardTitle>Socio no encontrado</CardTitle></CardHeader>
        <CardContent>
          <p>El socio que buscas no existe o ha sido eliminado.</p>
          <Button className="mt-4" onClick={() => router.push('/dashboard/partners')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Socios
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{partner.firstname} {partner.lastname}</h1>
          <p className="text-muted-foreground">Resumen de rendimiento y activos.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => router.push(`/dashboard/partners/${partnerId}/transactions`)}>Ver Transacciones</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/partners')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Saldo Inicial"
          value={formatCurrency(partner.initialBalance || 0)}
          icon={<DollarSign className="w-5 h-5" />}
        />

        <MetricCard
          title="Ingresos económicos (Flota)"
          value={formatCurrency(metrics.totalIncome)}
          description="Rentas + ventas a crédito"
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
          variant="success"
        />

        <MetricCard
          title="Inversión y gastos (Flota)"
          value={formatCurrency(metrics.totalExpenses)}
          description="Gastos + costo de adquisición"
          icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          variant="danger"
        />

        <MetricCard
          title="RENTABILIDAD ACUMULADA"
          value={formatCurrency(metrics.netProfit)}
          description="Después de recuperar inversión y gastos"
          icon={<DollarSign className="w-5 h-5" />}
          variant={metrics.netProfit >= 0 ? "success" : "danger"}
        />

        <MetricCard
          title="SALDO A PAGAR AL SOCIO"
          value={formatCurrency(partnerBalance)}
          description="Después de pagos realizados"
          icon={<DollarSign className="w-5 h-5" />}
          variant={partnerBalance >= 0 ? "success" : "danger"}
        />
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Vehículos Asignados</CardTitle>
              <CardDescription>Lista de todos los vehículos actualmente asociados a este socio.</CardDescription>
          </CardHeader>
          <CardContent>
              <DataTable
                columns={vehicleColumns}
                data={partnerVehicles}
                searchPlaceholder="Buscar vehículo por placa, marca..."
                noResultsText="Este socio no tiene vehículos asignados."
              />
          </CardContent>
      </Card>
    </div>
  );
}
