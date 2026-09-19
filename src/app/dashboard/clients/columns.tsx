"use client";

import type { Client, Vehicle, ClientWithMetrics } from '@/types';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { MoreVertical, User, FileArchive, Newspaper, History, Edit, Trash2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { useRouter } from 'next/navigation';
import React from 'react';
import { formatDate } from '@/lib/date-utils';
import Image from 'next/image';
import {
  PaymentRiskBadge,
  ActivityLevelBadge,
  LicenseStatusBadge,
} from '@/components/clients/client-status-badges';

type ActionsProps = {
  row: Row<ClientWithMetrics>;
  activeTab: 'active' | 'inactive' | 'deleted';
  handleOpenModal: (client: Omit<Client, 'licenseStatus'>) => void;
  handleDeleteConfirm: (client: Omit<Client, 'licenseStatus'>) => void;
};

const menuContentClass =
  'min-w-[200px] rounded-xl border border-white/10 bg-[#0e1117] p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.55)] z-[80]';
const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-white/80 focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white';
const menuItemDangerClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-rose-400 focus:bg-rose-500/15 focus:text-rose-300 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-300';

const ClientActions: React.FC<ActionsProps> = ({ row, activeTab, handleOpenModal, handleDeleteConfirm }) => {
    const router = useRouter();
    const item = row.original;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 text-white/50 hover:bg-white/[0.06] hover:text-white">
                    <span className="sr-only">Abrir menú</span>
                    <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={menuContentClass} sideOffset={6}>
                <DropdownMenuLabel className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  Acciones
                </DropdownMenuLabel>
                {activeTab !== 'deleted' && (
                  <DropdownMenuItem className={menuItemClass} onSelect={() => handleOpenModal(item)}>
                    <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className={menuItemClass} onSelect={() => router.push(`/dashboard/clients/${item.id}/documents`)}>
                    <FileArchive className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} /> Documentos
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => router.push(`/dashboard/clients/${item.id}/transactions`)}>
                    <Newspaper className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} /> Transacciones
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => router.push(`/dashboard/clients/${item.id}/history`)}>
                  <History className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} /> Historial
                </DropdownMenuItem>
                {activeTab !== 'deleted' && (
                  <>
                    <DropdownMenuSeparator className="my-1.5 bg-white/10" />
                    <DropdownMenuItem className={menuItemDangerClass} onSelect={() => handleDeleteConfirm(item)}>
                      <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
                      Dar de baja
                    </DropdownMenuItem>
                  </>
                )}
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
                    <Image src={photoSrc} alt={`${item.firstname} ${item.lastname}`} width={40} height={40} className="rounded-full object-cover w-10 h-10 ring-1 ring-white/10" />
                    ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08]">
                      <User className="h-5 w-5 text-[#d7ff3f]" strokeWidth={1.75} />
                    </div>
                    );
            },
            enableSorting: false,
        },
        {
            id: 'name',
            accessorFn: row => `${row.firstname} ${row.lastname}`,
            header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
            cell: ({ row }) => (
              <span className="font-medium text-white/90">
                {row.original.firstname} {row.original.lastname}
              </span>
            ),
        },
        {
            accessorKey: 'paymentBehavior',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Riesgo" />,
            cell: ({ row }) => {
                const { paymentBehavior, alerts } = row.original;
                return (
                  <div className="flex items-center gap-2">
                    <PaymentRiskBadge level={paymentBehavior} />
                    {(alerts?.length || 0) > 0 && (
                      <Badge variant="destructive" className="flex h-5 w-5 items-center justify-center p-0 text-xs">
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
                    <ActivityLevelBadge level={activityLevel} />
                    <span className="text-xs text-white/35">
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
                        <LicenseStatusBadge status={licenseStatus} />
                        {licenseExpiry && (
                            <span className="text-xs text-white/35">
                                {formatDate(licenseExpiry)}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'assignedVehicleId',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículo" />,
            cell: ({ row }) => {
                const vehicleId = row.original.assignedVehicleId;
                if (!vehicleId) {
                    return <span className="text-white/35">N/A</span>;
                }
                const vehicle = vehicleMap.get(vehicleId);
                return vehicle ? (
                    <span className="font-medium text-white/80">{vehicle.plate}</span>
                ) : <span className="text-white/35">N/A</span>;
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

export const getColumns = getClientColumns;
