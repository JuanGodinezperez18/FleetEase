"use client";

import type { Partner } from '@/types';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Car, Eye, Edit, Trash2, DollarSign } from 'lucide-react';
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

const menuContentClass =
  'min-w-[200px] rounded-xl border border-white/10 bg-[#0e1117] p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.55)] z-[80]';
const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-white/80 focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white';
const menuItemDangerClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-rose-400 focus:bg-rose-500/15 focus:text-rose-300 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-300';

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
            <DropdownMenuContent align="end" className={menuContentClass} sideOffset={6}>
                <DropdownMenuLabel className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  Acciones
                </DropdownMenuLabel>
                <DropdownMenuItem className={menuItemClass} onSelect={() => router.push(`/dashboard/partners/${item.id}`)}>
                    <Eye className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                    Ver dashboard
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => handleOpenModal(item)}>
                    <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => router.push(`/dashboard/finanzas?partnerId=${item.id}`)}>
                    <DollarSign className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                    Transacciones
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-white/10" />
                <DropdownMenuItem className={menuItemDangerClass} onSelect={() => handleDeleteConfirm(item)}>
                    <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
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
