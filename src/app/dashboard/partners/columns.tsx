
"use client";

import type { Partner } from '@/types';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import React from 'react';
import type { PartnerWithMetrics } from './page';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { PartnerPerformanceBadge } from '@/components/partners/partner-status-badges';

type ActionsProps = {
  row: Row<PartnerWithMetrics>;
  handleOpenModal: (partner: Partner) => void;
  handleDeleteConfirm: (partner: Partner) => void;
};

const PartnerActions: React.FC<ActionsProps> = ({ row, handleOpenModal, handleDeleteConfirm }) => {
    const item = row.original;
    const router = useRouter();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 text-white/50 hover:bg-white/[0.06] hover:text-white">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/partners/${item.id}`)}>
                    Ver Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenModal(item)}>Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/finanzas?partnerId=${item.id}`)}>
                    Ver Transacciones
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteConfirm(item)} className="text-destructive focus:text-destructive">
                    Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const getColumns = (
  handleOpenModal: (partner: Partner) => void,
  handleDeleteConfirm: (partner: Partner) => void
): ColumnDef<PartnerWithMetrics>[] => {
    
    return [
        {
            id: 'name',
            accessorFn: row => `${row.firstname} ${row.lastname}`,
            header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
            cell: ({ row }) => (
                <Link href={`/dashboard/partners/${row.original.id}`} className="font-medium text-white/90 hover:text-[#d7ff3f]">
                    {`${row.original.firstname} ${row.original.lastname}`}
                </Link>
            ),
        },
        {
            accessorKey: 'performanceLevel',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Rendimiento" />,
            cell: ({ row }) => {
                const { performanceLevel, netProfit } = row.original;
                return (
                    <div className="flex flex-col gap-1">
                        <PartnerPerformanceBadge level={performanceLevel} />
                        <span className="text-xs font-mono text-white/50">
                            {formatCurrency(netProfit || 0)}
                        </span>
                    </div>
                );
            }
        },
        {
            accessorKey: 'vehicleCount',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículos" />,
            cell: ({ row }) => {
                const { vehicleCount } = row.original;
                return (
                    <div className="flex items-center gap-1.5 text-white/70">
                        <Car className="h-3.5 w-3.5 text-white/35" strokeWidth={1.75} />
                        <span>{vehicleCount || 0}</span>
                    </div>
                );
            }
        },
        {
            accessorKey: 'profitMargin',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Margen" />,
            cell: ({ row }) => {
                const margin = row.original.profitMargin || 0;
                const colorClass =
                  margin > 15 ? 'text-emerald-300' : margin > 5 ? 'text-amber-300' : 'text-rose-300';
                return (
                    <div className={`font-medium tabular-nums ${colorClass}`}>
                        {margin.toFixed(1)}%
                    </div>
                );
            }
        },
        {
            accessorKey: 'email',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Contacto" />,
            cell: ({ row }) => (
                <div>
                    <div className="text-white/80">{row.original.email || 'N/A'}</div>
                    <div className="text-xs text-white/40">{row.original.phone || ''}</div>
                </div>
            )
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: (props) => (
                <PartnerActions
                    row={props.row}
                    handleOpenModal={handleOpenModal}
                    handleDeleteConfirm={handleDeleteConfirm}
                />
            ),
        }
    ];
};
