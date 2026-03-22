
"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Client, FinancialRecord, Credit, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, Calendar, Car, DollarSign } from 'lucide-react';
import { EntityTimeline, type TimelineEvent } from '@/components/common/entity-timeline';
import { formatCurrency, getStatusVariant } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const InfoCard = ({ label, value, icon }: { label: string; value: string | React.ReactNode; icon: React.ReactNode }) => (
    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
        <div className="text-muted-foreground mt-1">{icon}</div>
        <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold">{value}</p>
        </div>
    </div>
);

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  const { clients, financialRecords, credits, vehicles, loadingData, clientBalances, financialCategories } = useData();

  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);
  const clientBalance = useMemo(() => clientBalances.find(cb => cb.id === clientId)?.balance || 0, [clientBalances, clientId]);
  const assignedVehicle = useMemo(() => vehicles.find(v => v.clientId === clientId && v.status === 'rented'), [vehicles, clientId]);

  const clientTimeline = useMemo((): TimelineEvent[] => {
    if (!client) return [];

    const categoryMap = new Map(financialCategories.map(cat => [cat.id, cat.name]));
    
    const events: TimelineEvent[] = [];
    
    // Evento de creación
    if(client.createdAt) {
        events.push({
            id: 'created',
            date: client.createdAt,
            type: 'created',
            title: 'Cliente Registrado',
            description: `${client.firstname} ${client.lastname} fue agregado al sistema`,
        });
    }
    
    // Pagos y Cargos
    const payments = financialRecords
      .filter(fr => fr.clientId === client.id && !fr.isDeleted)
      .map((record): TimelineEvent => ({
        id: record.id,
        date: record.date,
        type: record.type, // 'income', 'expense', 'payment'
        title: record.type === 'income' ? 'Cargo Registrado' : (record.type === 'payment' ? 'Pago Recibido' : 'Gasto Registrado'),
        description: record.description || 'Movimiento financiero',
        amount: record.amount,
        metadata: {
          categoría: categoryMap.get(record.categoryId) || 'General',
        },
      }));
    
    events.push(...payments);
    
    // Créditos
    const clientCredits = credits.filter(c => c.clientId === client.id && !c.isDeleted);
    clientCredits.forEach(credit => {
      events.push({
        id: `credit-${credit.id}`,
        date: credit.createdAt || credit.startDate,
        type: 'credit_approved',
        title: 'Crédito Aprobado',
        description: `Crédito por ${formatCurrency(credit.totalAmount)} aprobado`,
        amount: credit.totalAmount,
        metadata: {
          plazo: `${credit.numberOfPayments} semanas`,
          pago_semanal: formatCurrency(credit.weeklyPayment),
        },
      });
      
      if (credit.status === 'completed') {
        events.push({
          id: `credit-paid-${credit.id}`,
          date: credit.updatedAt || credit.createdAt || new Date(), // fallback date
          type: 'credit_paid',
          title: 'Crédito Liquidado',
          description: 'El crédito ha sido pagado completamente',
          amount: credit.totalAmount,
        });
      }
    });
    
    // Vehículos asignados
    const assignedVehicles = vehicles.filter(v => v.clientId === client.id && !v.isDeleted);
    assignedVehicles.forEach(vehicle => {
      events.push({
        id: `vehicle-${vehicle.id}`,
        date: vehicle.acquisitionDate, // Could be improved with assignment log
        type: 'vehicle_assigned',
        title: 'Vehículo Asignado',
        description: `${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
      });
    });
    
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [client, financialRecords, credits, vehicles, financialCategories]);

  const photoUrl = useMemo(() => {
    if (!client?.photoUrl) return '/placeholder-user.jpg';
    if (typeof client.photoUrl === 'string') return client.photoUrl;
    if (typeof window !== 'undefined' && client.photoUrl instanceof File) {
      return URL.createObjectURL(client.photoUrl);
    }
    return '/placeholder-user.jpg';
  }, [client?.photoUrl]);


  if (loadingData) return <p>Cargando cliente...</p>;
  if (!client) return (
    <Card>
      <CardHeader>
        <CardTitle>Cliente no encontrado</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => router.push('/dashboard/clients')}><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push('/dashboard/clients')}><ArrowLeft className="mr-2 h-4 w-4"/>Volver a Clientes</Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <img 
              src={photoUrl}
              alt="Foto del cliente"
              width={100}
              height={100}
              className="rounded-full border-4 border-primary/20 object-cover w-[100px] h-[100px]"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-3xl font-bold">{client.firstname} {client.lastname}</CardTitle>
                <Badge variant={getStatusVariant(client.status)}>{client.status}</Badge>
              </div>
              <CardDescription>Resumen de la información de contacto y estado financiero del cliente.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard label="Email" value={client.email || 'N/A'} icon={<Mail className="w-5 h-5"/>}/>
          <InfoCard label="Teléfono" value={client.phone || 'N/A'} icon={<Phone className="w-5 h-5"/>}/>
          <InfoCard label="Vencimiento de Licencia" value={client.licenseExpiry} icon={<Calendar className="w-5 h-5"/>}/>
          <InfoCard label="Vehículo Asignado" value={assignedVehicle ? `${assignedVehicle.make} ${assignedVehicle.model} (${assignedVehicle.plate})` : 'Ninguno'} icon={<Car className="w-5 h-5"/>}/>
          <InfoCard label="Saldo Actual" value={formatCurrency(clientBalance)} icon={<DollarSign className="w-5 h-5"/>}/>
          <InfoCard label="Depósito en Garantía" value={formatCurrency(client.securityDeposit || 0)} icon={<DollarSign className="w-5 h-5"/>}/>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <EntityTimeline events={clientTimeline} entityType="client" />
      </div>
    </div>
  );
}
