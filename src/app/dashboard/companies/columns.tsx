
"use client";

import type { Company } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, History } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type ActionsProps = {
  row: { original: Company };
  handleOpenModal: (company: Company) => void;
  handleDeleteConfirm: (company: Company) => void;
};

interface CompanyMetrics {
  vehicleCount: number;
  userCount: number;
}

const CompanyActions: React.FC<ActionsProps> = ({ row, handleOpenModal, handleDeleteConfirm }) => {
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
                <DropdownMenuItem onSelect={() => handleOpenModal(item)}>Editar</DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => router.push(`/dashboard/companies/${item.id}/history`)}>
                  <History className="mr-2 h-4 w-4" /> Ver Historial
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleDeleteConfirm(item)}>Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const getColumns = (
  handleOpenModal: (company: Company) => void,
  handleDeleteConfirm: (company: Company) => void,
  companyMetrics: Record<string, CompanyMetrics>
): ColumnDef<Company>[] => {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre de la Empresa" />,
        },
        {
            accessorKey: 'vehicleCount',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículos" />,
            cell: ({ row }) => {
                const count = companyMetrics[row.original.id]?.vehicleCount || 0;
                const limit = row.original.vehicleLimit;
                if(typeof limit !== 'number') return <div className="text-center">{formatNumber(count)}</div>;

                const usage = limit > 0 ? (count / limit) * 100 : (count > 0 ? 101 : 0); // If limit is 0 but count > 0, it's over limit.
                const isNearLimit = usage >= 80 && usage <= 100;
                const isOverLimit = usage > 100;

                return (
                    <div className="flex items-center gap-2">
                        <span>{formatNumber(count)} / {formatNumber(limit)}</span>
                        {isOverLimit && <Badge variant="destructive">Excedido</Badge>}
                        {isNearLimit && !isOverLimit && <Badge variant="secondary">Cerca</Badge>}
                    </div>
                );
            }
        },
        {
            accessorKey: 'userCount',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Usuarios" />,
            cell: ({ row }) => {
                const count = companyMetrics[row.original.id]?.userCount || 0;
                return <div className="text-center">{formatNumber(count)}</div>
            }
        },
        {
            accessorKey: 'email',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Correo" />,
        },
        {
            accessorKey: 'phone',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
        },
        {
            accessorKey: 'createdAt',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Creación" />,
            cell: ({ row }) => {
                const date = row.original.createdAt;
                return date ? new Date(date).toLocaleDateString() : 'N/A';
            }
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: (props) => (
                <CompanyActions
                    {...props}
                    handleOpenModal={handleOpenModal}
                    handleDeleteConfirm={handleDeleteConfirm}
                />
            ),
        }
    ];
};
