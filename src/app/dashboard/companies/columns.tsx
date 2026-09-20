"use client";

import type { Company } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, History, Edit, Trash2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
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

const CompanyActions: React.FC<ActionsProps> = ({
  row,
  handleOpenModal,
  handleDeleteConfirm,
}) => {
  const item = row.original;
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-lg p-0 text-white/40 hover:bg-white/[0.06] hover:text-white"
        >
          <span className="sr-only">Abrir menú</span>
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6}>
        <DropdownMenuItem onSelect={() => handleOpenModal(item)}>
          <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => router.push(`/dashboard/companies/${item.id}/history`)}
        >
          <History className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
          Ver historial
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-rose-400 focus:bg-rose-500/15 focus:text-rose-300"
          onSelect={() => handleDeleteConfirm(item)}
        >
          <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
          Eliminar
        </DropdownMenuItem>
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Empresa" />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-white/90">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'vehicleCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vehículos" />
      ),
      cell: ({ row }) => {
        const count = companyMetrics[row.original.id]?.vehicleCount || 0;
        const limit = row.original.vehicleLimit;
        if (typeof limit !== 'number') {
          return (
            <span className="tabular-nums text-white/70">{formatNumber(count)}</span>
          );
        }

        const usage = limit > 0 ? (count / limit) * 100 : count > 0 ? 101 : 0;
        const isNearLimit = usage >= 80 && usage <= 100;
        const isOverLimit = usage > 100;

        return (
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-white/70">
              {formatNumber(count)} / {formatNumber(limit)}
            </span>
            {isOverLimit && (
              <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                Excedido
              </span>
            )}
            {isNearLimit && !isOverLimit && (
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Cerca
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'userCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Usuarios" />
      ),
      cell: ({ row }) => {
        const count = companyMetrics[row.original.id]?.userCount || 0;
        return (
          <span className="tabular-nums text-white/70">{formatNumber(count)}</span>
        );
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Correo" />
      ),
      cell: ({ row }) => (
        <span className="text-white/55">{row.original.email || '—'}</span>
      ),
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Teléfono" />
      ),
      cell: ({ row }) => (
        <span className="text-white/55">{row.original.phone || '—'}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Creación" />
      ),
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return (
          <span className="text-white/50">
            {date ? new Date(date).toLocaleDateString('es-MX') : 'N/A'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: props => (
        <CompanyActions
          {...props}
          handleOpenModal={handleOpenModal}
          handleDeleteConfirm={handleDeleteConfirm}
        />
      ),
    },
  ];
};
