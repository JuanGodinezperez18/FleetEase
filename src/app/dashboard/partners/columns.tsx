
"use client";

import type { Partner } from '@/types';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import React from 'react';
import type { PartnerWithMetrics } from './page';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

type ActionsProps = {
  row: Row<PartnerWithMetrics>;
  handleOpenModal: (partner: Partner) => void;
  handleDeleteConfirm: (partner: Partner) => void;
};

const getPerformanceBadge = (level: PartnerWithMetrics['performanceLevel']) => {
    if (!level) return <Badge variant="outline">N/A</Badge>;
    switch (level) {
      case 'Excelente': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Excelente</Badge>;
      case 'Bueno': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Bueno</Badge>;
      case 'Regular': return <Badge variant="secondary">Regular</Badge>;
      case 'Bajo': return <Badge variant="destructive">Bajo</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
};

const PartnerActions: React.FC<ActionsProps> = ({ row, handleOpenModal, handleDeleteConfirm }) => {
    const item = row.original;
    const router = useRouter();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
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
                <Link href={`/dashboard/partners/${row.original.id}`} className="font-medium text-primary hover:underline">
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
                    <div className="flex flex-col">
                        {getPerformanceBadge(performanceLevel)}
                        <span className="text-xs text-muted-foreground mt-1">
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
                    <div className="flex items-center gap-1">
                        <Car className="h-3 w-3 text-muted-foreground" />
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
                const colorClass = margin > 15 ? 'text-emerald-600' : margin > 5 ? 'text-amber-600' : 'text-red-600';
                return (
                    <div className={`font-medium ${colorClass}`}>
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
                    <div>{row.original.email || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{row.original.phone || ''}</div>
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
