
"use client";

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Vehicle, VehicleWithMileage, Client } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { infallibleNormalizeDate, formatDate } from '@/lib/date-utils';
import { sumRentalIncome, sumExpense } from '@/lib/financial-metrics';
import { 
    Calendar, 
    Palette, 
    DollarSign, 
    Wrench, 
    Gauge, 
    ShieldCheck, 
    TrendingUp, 
    User, 
    Briefcase,
    Share2,
    Printer,
    ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoItem } from './components/InfoItem';
import { getStatusVariant } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { VehicleTimeline, type TimelineEvent } from './components/VehicleTimeline';

const statusTranslations: Record<Vehicle['status'], string> = {
  active: 'Activo',
  rented: 'Rentado',
  inactive: 'Inactivo',
  maintenance: 'Mantenimiento',
  sold: 'Vendido',
};

export default function VehicleDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { 
        getVehicleWithDetailsById, 
        financialRecords, 
        vehicleAssignmentLogs,
        mileageLogs,
        clients,
        partners, 
        loadingData 
    } = useData();
    const { toast } = useToast();

    // Derivar directamente del hook sin estado local
    const vehicle = useMemo(() => {
        if (!id || loadingData) return null;
        const vehicleId = Array.isArray(id) ? id[0] : id;
        return getVehicleWithDetailsById(vehicleId);
    }, [id, getVehicleWithDetailsById, loadingData]);

    const timelineEvents = useMemo(() => {
        if (!vehicle) return [];
        
        const events: TimelineEvent[] = [];
        const clientMap = new Map<string, Client>(clients.map(c => [c.id, c]));

        // 1. Acquisition Event
        const acquisitionDate = infallibleNormalizeDate(vehicle.acquisitionDate);
        if (acquisitionDate) {
            events.push({
                id: `acq-${vehicle.id}`,
                date: acquisitionDate,
                type: 'acquisition',
                title: 'Vehículo Adquirido',
                description: `Costo: ${vehicle.cost ? `$${vehicle.cost.toLocaleString()}` : 'No registrado'}`
            });
        }
        
        // 2. Assignment Events
        vehicleAssignmentLogs.filter(log => log.vehicleId === vehicle.id).forEach(log => {
            const startDate = infallibleNormalizeDate(log.startDate);
            const client = log.clientId ? clientMap.get(log.clientId) : null;
            const clientName = client ? `${client.firstname} ${client.lastname}` : 'Cliente desconocido';

            if (startDate) {
                events.push({
                    id: `assign-${log.id}`,
                    date: startDate,
                    type: 'assignment',
                    title: `Asignado a ${clientName}`,
                    description: log.reason || 'Inicio de asignación.'
                });
            }
            if (log.endDate) {
                const endDate = infallibleNormalizeDate(log.endDate);
                if (endDate) {
                     events.push({
                        id: `unassign-${log.id}`,
                        date: endDate,
                        type: 'assignment',
                        title: `Devolución de ${clientName}`,
                        description: 'Fin del periodo de asignación.'
                    });
                }
            }
        });

        // 3. Financial Events
        financialRecords.filter(r => r.vehicleId === vehicle.id && !r.isDeleted).forEach(record => {
            const recordDate = infallibleNormalizeDate(record.date);
            if (recordDate) {
                if (record.type === 'expense') {
                    events.push({
                        id: `expense-${record.id}`,
                        date: recordDate,
                        type: 'maintenance',
                        title: `Gasto: ${record.category || 'General'}`,
                        description: `${record.description} - $${record.amount.toLocaleString()}`
                    });
                } else if (record.type === 'income') {
                     events.push({
                        id: `income-${record.id}`,
                        date: recordDate,
                        type: 'income',
                        title: `Ingreso: ${record.category || 'General'}`,
                        description: `${record.description} - $${record.amount.toLocaleString()}`
                    });
                }
            }
        });
        
        // 4. Mileage Logs
        mileageLogs.filter(log => log.vehicleId === vehicle.id).forEach(log => {
            const logDate = infallibleNormalizeDate(log.date);
            if(logDate) {
                events.push({
                    id: `mileage-${log.id}`,
                    date: logDate,
                    type: 'mileage',
                    title: 'Registro de Kilometraje',
                    description: `${log.mileage.toLocaleString()} km`
                })
            }
        });

        return events.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [vehicle, vehicleAssignmentLogs, financialRecords, mileageLogs, clients]);

    const vehicleFinancialRecords = useMemo(() => {
        if (!vehicle) return [];
        return financialRecords.filter(record => record.vehicleId === vehicle.id && !record.isDeleted);
    }, [financialRecords, vehicle]);

    const netProfit = useMemo(() => {
        if (!vehicle) return 0;
        const income = sumRentalIncome(vehicleFinancialRecords);
        const expense = sumExpense(vehicleFinancialRecords);
        const acquisitionCost = vehicle.cost || 0;
        return income - expense - acquisitionCost;
    }, [vehicleFinancialRecords, vehicle]);

    const roi = useMemo(() => {
        if (!vehicle || !vehicle.cost || vehicle.cost === 0) return null;
        const operatingProfit = sumRentalIncome(vehicleFinancialRecords) - sumExpense(vehicleFinancialRecords);
        return ((operatingProfit / vehicle.cost) * 100).toFixed(2);
    }, [vehicleFinancialRecords, vehicle]);

    const assignedDriver = useMemo(() => {
        const activeAssignment = vehicleAssignmentLogs.find(a => a.vehicleId === vehicle?.id && !a.endDate);
        if (!activeAssignment) return { name: 'No Asignado', type: '' };
        const client = clients.find(c => c.id === activeAssignment.clientId);
        return client ? { name: `${client.firstname} ${client.lastname}`, type: 'Cliente' } : { name: 'Desconocido', type: ''};
    }, [vehicleAssignmentLogs, vehicle, clients]);

    const ownerPartner = useMemo(() => {
        if (!vehicle?.partnerId) return 'N/A';
        const partner = partners.find(p => p.id === vehicle.partnerId);
        return partner ? `${partner.firstname} ${partner.lastname}` : 'Desconocido';
    }, [vehicle, partners]);

    const handleShare = async () => {
        if (!vehicle) return;
        const vehicleInfo = `
*Vehículo:* ${vehicle.make} ${vehicle.model} (${vehicle.year})
*Placa:* ${vehicle.plate}
*Kilometraje:* ${vehicle.displayCurrentMileage}
*Estado:* ${statusTranslations[vehicle.status] || vehicle.status}
*Ganancia/Pérdida Neta:* $${netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        `.trim();
        
        const shareData = {
            title: `Detalles del Vehículo: ${vehicle.make} ${vehicle.model}`,
            text: vehicleInfo,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
                console.error('Error al compartir:', error);
                toast({ title: 'Error', description: 'No se pudo compartir la información.', variant: 'destructive' });
            }
        } else {
            navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`);
            toast({ title: 'Copiado al portapapeles', description: 'La información del vehículo ha sido copiada.' });
        }
    };

    if (loadingData) {
        return <div>Cargando...</div>;
    }

    if (!vehicle) {
        return <div>No se pudo encontrar el vehículo.</div>;
    }

    const imageUrl = typeof vehicle.imageUrl === 'string' ? vehicle.imageUrl : 'https://placehold.co/600x400.png';

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => router.push('/dashboard/vehicles')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Vehículos
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                    <Button variant="outline" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartir
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className="w-full h-64 object-cover rounded-lg"
                            />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h1 className="text-3xl font-bold">{vehicle.make} ${vehicle.model}</h1>
                                <p className="text-xl text-muted-foreground">{vehicle.year}</p>
                                <Badge variant={getStatusVariant(vehicle.status)}>
                                    {statusTranslations[vehicle.status] || vehicle.status}
                                </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <InfoItem icon={<Palette />} label="Color" value={vehicle.color || 'N/A'} />
                                <InfoItem icon={<Calendar />} label="Fecha de Adquisición" value={formatDate(vehicle.acquisitionDate)} />
                                <InfoItem icon={<DollarSign />} label="Costo del Vehículo" value={`$${(vehicle.cost || 0).toLocaleString()}`} valueClassName="text-green-500" />
                                <InfoItem icon={<DollarSign />} label="Valor Renta/Semana (Sugerido)" value={`$${(vehicle.weeklyRentalValue || 0).toLocaleString()}`} />
                                <InfoItem icon={<ShieldCheck />} label="Comisión por Administración" value={`${(vehicle.adminCommission || 0)}%`} />
                                <InfoItem icon={<Gauge />} label="Kilometraje Actual" value={vehicle.displayCurrentMileage} />
                                <InfoItem icon={<Wrench />} label="Último Mtto. (km)" value={vehicle.displayLastMaintMileage} />
                                <InfoItem icon={<Calendar />} label="Próximo Mtto. (Fecha)" value="N/A" />
                                <InfoItem icon={<User />} label="Conductor Asignado" value={assignedDriver.name} />
                                <InfoItem icon={<Briefcase />} label="Socio Propietario" value={ownerPartner} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Información de Seguro</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoItem icon={<ShieldCheck />} label="No. de Póliza" value={vehicle.insurancePolicyNumber || 'N/A'} />
                            <InfoItem icon={<Calendar />} label="Vencimiento de Póliza" value={formatDate(vehicle.insuranceExpiryDate)} />
                        </div>
                    </div>

                    <div className="mt-6 border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Análisis Financiero</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoItem
                                icon={<TrendingUp />}
                                label="Ganancia / Pérdida Neta"
                                value={`$${netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                valueClassName={netProfit >= 0 ? 'text-green-500' : 'text-red-500'}
                            />
                            <InfoItem
                                icon={<TrendingUp />}
                                label="ROI (Retorno de Inversión)"
                                value={roi !== null ? `${roi}%` : 'N/A'}
                                valueClassName={roi !== null && parseFloat(roi) >= 0 ? 'text-green-500' : 'text-red-500'}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">(Ingresos - Gastos) / Costo</p>
                    </div>
                </CardContent>
            </Card>

            <VehicleTimeline events={timelineEvents} />
        </div>
    );
}
