
"use client";

import type { Client, Vehicle, UserRole, ClientWithMetrics } from '@/types';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { MoreVertical, User, FileArchive, Newspaper, ShieldAlert, Activity, CalendarClock, ShieldCheck, History } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { useRouter } from 'next/navigation';
import React from 'react';
import type { ClientMetric } from '@/hooks/use-client-analytics';
import { infallibleNormalizeDate, formatDate } from '@/lib/date-utils';
import Image from 'next/image';

const getRiskBadge = (riskLevel: ClientMetric['paymentBehavior'] | undefined) => {
    if (!riskLevel) return <Badge variant="outline">N/A</Badge>;
    const commonClasses = "capitalize";
    switch (riskLevel) {
        case 'Excelente': return <Badge className={`bg-emerald-100 text-emerald-800 hover:bg-emerald-200 ${commonClasses}`}>Excelente</Badge>;
        case 'Bueno': return <Badge className={`bg-green-100 text-green-800 hover:bg-green-200 ${commonClasses}`}>Bueno</Badge>;
        case 'Regular': return <Badge variant="secondary" className={commonClasses}>Regular</Badge>;
        case 'Malo': return <Badge className={`bg-amber-100 text-amber-800 hover:bg-amber-200 ${commonClasses}`}>Malo</Badge>;
        case 'Crítico': return <Badge variant="destructive" className={commonClasses}>Crítico</Badge>;
        default: return <Badge variant="outline">{riskLevel}</Badge>;
    }
};

const getActivityBadge = (activityLevel: ClientMetric['activityLevel'] | undefined) => {
    if (!activityLevel) return <Badge variant="outline">N/A</Badge>;
     switch (activityLevel) {
        case 'Alto': return <Badge variant="default" className="bg-sky-500 hover:bg-sky-600">Alto</Badge>;
        case 'Medio': return <Badge variant="default">Medio</Badge>;
        case 'Bajo': return <Badge variant="secondary">Bajo</Badge>;
        case 'Inactivo': return <Badge variant="outline">Inactivo</Badge>;
        default: return <Badge variant="outline">{activityLevel}</Badge>;
    }
};

const getLicenseStatusBadge = (status: ClientMetric['licenseStatus'] | 'active' | 'expired' | undefined) => {
    if (!status) return <Badge variant="outline">N/A</Badge>;
    switch (status) {
        case 'Vigente':
        case 'active': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Vigente</Badge>;
        case 'Próxima a Vencer': return <Badge className="bg-amber-500 hover:bg-amber-600">Por Vencer</Badge>;
        case 'Vencida':
        case 'expired': return <Badge variant="destructive">Vencida</Badge>;
        case 'N/A': return <Badge variant="outline">N/A</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};

type ActionsProps = {
  row: Row<ClientWithMetrics>;
  activeTab: 'active' | 'inactive' | 'deleted';
  handleOpenModal: (client: Omit<Client, 'licenseStatus'>) => void;
  handleDeleteConfirm: (client: Omit<Client, 'licenseStatus'>) => void;
};

const ClientActions: React.FC<ActionsProps> = ({ row, activeTab, handleOpenModal, handleDeleteConfirm }) => {
    const router = useRouter();
    const item = row.original;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                {activeTab !== 'deleted' && <DropdownMenuItem onSelect={() => handleOpenModal(item)}>Editar</DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => router.push(`/dashboard/clients/${item.id}/documents`)}>
                    <FileArchive className="mr-2 h-4 w-4" /> Ver Documentos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/dashboard/clients/${item.id}/transactions`)}>
                    <Newspaper className="mr-2 h-4 w-4" /> Ver Transacciones
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/dashboard/clients/${item.id}/history`)}>
                  <History className="mr-2 h-4 w-4" /> Ver Historial
                </DropdownMenuItem>
                {activeTab !== 'deleted' && <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleDeleteConfirm(item)}>Dar de baja</DropdownMenuItem>}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const getClientColumns = (
  vehicles: Vehicle[],
  activeTab: 'active' | 'inactive' | 'deleted',
  handleOpenModal: (client: Omit<Client, 'licenseStatus'>) => void,
  handleDeleteConfirm: (client: Omit<Client, 'licenseStatus'>) => void
): ColumnDef<ClientWithMetrics>[] => {
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

    return [
        {
            accessorKey: 'photoUrl',
            header: 'Foto',
            cell: ({ row }) => {
                const item = row.original;
                const photoSrc = item.photoUrl;
                return photoSrc && typeof photoSrc === 'string' ? (
                    <Image src={photoSrc} alt={`${item.firstname} ${item.lastname}`} width={40} height={40} className="rounded-full object-cover w-10 h-10" />
                    ) : <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div>
            },
            enableSorting: false,
        },
        {
            id: 'name',
            accessorFn: row => `${row.firstname} ${row.lastname}`,
            header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
            cell: ({ row }) => `${row.original.firstname} ${row.original.lastname}`,
        },
        {
            accessorKey: 'paymentBehavior',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Riesgo" />,
            cell: ({ row }) => {
                const { paymentBehavior, alerts } = row.original;
                return (
                  <div className="flex items-center gap-2">
                    {getRiskBadge(paymentBehavior)}
                    {(alerts?.length || 0) > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {alerts?.length}
                      </Badge>
                    )}
                  </div>
                );
            }
        },
        {
            accessorKey: 'activityLevel',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Actividad" />,
            cell: ({ row }) => {
                const { activityLevel, totalTransactions } = row.original;
                return (
                  <div className="flex flex-col gap-1">
                    {getActivityBadge(activityLevel)}
                    <span className="text-xs text-muted-foreground">
                      {totalTransactions || 0} trans.
                    </span>
                  </div>
                );
            }
        },
        {
            accessorKey: 'licenseStatus',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Licencia" />,
            cell: ({ row }) => {
                const { licenseStatus, licenseExpiry } = row.original;
                return (
                    <div className="flex flex-col gap-1">
                        {getLicenseStatusBadge(licenseStatus)}
                        {licenseExpiry && (
                            <span className="text-xs text-muted-foreground">
                                {formatDate(licenseExpiry)}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'assignedVehicleId',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículo Asignado" />,
            cell: ({ row }) => {
                const vehicleId = row.original.assignedVehicleId;
                if (!vehicleId) {
                    return <span className="text-muted-foreground">N/A</span>;
                }
                const vehicle = vehicleMap.get(vehicleId);
                return vehicle ? (
                    <span className="font-medium">{vehicle.plate}</span>
                ) : <span className="text-muted-foreground">N/A</span>;
            },
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: (props) => (
                <ClientActions
                    {...props}
                    activeTab={activeTab}
                    handleOpenModal={handleOpenModal}
                    handleDeleteConfirm={handleDeleteConfirm}
                />
            ),
        }
    ];
};

// Export alias for backward compatibility
export const getColumns = getClientColumns;
