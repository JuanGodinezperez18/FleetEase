"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Credit, Client, Vehicle } from "@/types";
import { MoreHorizontal, Eye, Edit, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import { format, differenceInDays } from 'date-fns';
import type { CreditWithMetrics } from '@/hooks/use-credits-search';

const formatCurrency = (amount: number | null | undefined) => {
    const num = Number(amount);
    if (isNaN(num)) {
        return "$0.00";
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
};

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  completed: "border-white/10 bg-white/[0.06] text-white/55",
  defaulted: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  inactive: "border-white/10 bg-white/[0.06] text-white/40",
  cancelled: "border-white/10 bg-white/[0.06] text-white/40",
};

const BEHAVIOR_STYLES: Record<string, string> = {
  Puntual: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  'Ligero Retraso': "border-amber-400/20 bg-amber-400/10 text-amber-300",
  'Retraso Severo': "border-rose-400/20 bg-rose-400/10 text-rose-300",
};

const menuContentClass =
  'min-w-[200px] rounded-xl border border-white/10 bg-[#0e1117] p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.55)] z-[80]';
const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-white/80 focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white';
const menuItemWarnClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-amber-300 focus:bg-amber-500/15 focus:text-amber-200 data-[highlighted]:bg-amber-500/15 data-[highlighted]:text-amber-200';
const menuItemDangerClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-rose-400 focus:bg-rose-500/15 focus:text-rose-300 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-300';

type GetCreditColumnsProps = {
  clients: Client[];
  vehicles: Vehicle[];
  onEdit: (credit: Credit) => void;
  onDelete: (creditId: string) => void;
  onDeactivate: (creditId: string) => void;
  onViewDetails: (creditId: string) => void;
};

export const getCreditColumns = ({ clients, vehicles, onEdit, onDelete, onDeactivate, onViewDetails }: GetCreditColumnsProps): ColumnDef<CreditWithMetrics>[] => [
  {
    accessorKey: "clientName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => {
      const clientName = row.original.clientName;
      return clientName ? (
        <span className="font-medium text-white/90">{clientName}</span>
      ) : (
        <span className="text-white/35">Desconocido</span>
      );
    },
  },
  {
    accessorKey: "paymentBehavior",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Comportamiento" />,
    cell: ({ row }) => {
      const { paymentBehavior, weeksOverdue } = row.original;
      const style = BEHAVIOR_STYLES[paymentBehavior || ''] || "border-white/10 bg-white/[0.06] text-white/50";
      return (
        <div className="flex flex-col gap-1">
          <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style}`}>
            {paymentBehavior || 'N/A'}
          </span>
          {weeksOverdue && weeksOverdue > 0 ? (
             <span className="text-xs text-rose-300">
                {weeksOverdue} sem. de atraso
             </span>
          ) : null}
        </div>
      );
    }
  },
  {
    accessorKey: "remainingBalance",
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Saldo Restante" />
    ),
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-white/90">{formatCurrency(row.getValue("remainingBalance"))}</span>
    ),
  },
  {
    accessorKey: "paidAmount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Progreso" />,
    cell: ({ row }) => {
      const paid = Number(row.original.paidAmount) || 0;
      const total = Number(row.original.totalAmount) || 0;
      const progress = total > 0 ? (paid / total) * 100 : 0;
      return (
        <div className="flex flex-col">
            <span className="text-xs font-medium text-white/70">{formatCurrency(paid)} / {formatCurrency(total)}</span>
            <Progress value={progress} className="mt-1 h-1.5 w-full bg-white/[0.08]" />
        </div>
      );
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as Credit['status'];
      const style = STATUS_STYLES[status] || STATUS_STYLES.inactive;
      return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "estimatedCompletionDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Finalización Est." />,
    cell: ({ row }) => {
      const date = row.original.estimatedCompletionDate;
      if (!date) return <span className="text-white/35">—</span>;
      const daysToCompletion = differenceInDays(date, new Date());
      const isOverdue = daysToCompletion < 0;
      return (
        <div className={`text-sm ${isOverdue ? 'text-rose-300' : 'text-white/70'}`}>
          {format(date, 'dd/MM/yyyy')}
          {isOverdue && (
            <span className="ml-1.5 rounded-full border border-rose-400/20 bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
              Vencido
            </span>
          )}
        </div>
      );
    },
    sortingFn: 'datetime'
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const credit = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-11 w-11 rounded-xl p-0 text-white/50 hover:bg-white/[0.06] hover:text-white">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={menuContentClass} sideOffset={6}>
            <DropdownMenuLabel className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
              Acciones
            </DropdownMenuLabel>
            <DropdownMenuItem className={menuItemClass} onSelect={() => onViewDetails(credit.id)}>
              <Eye className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={() => onEdit(credit)}>
              <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
              Editar
            </DropdownMenuItem>
            {credit.status === 'active' && (
              <DropdownMenuItem className={menuItemWarnClass} onSelect={() => onDeactivate(credit.id)}>
                <XCircle className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
                Desactivar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="my-1.5 bg-white/10" />
            <DropdownMenuItem className={menuItemDangerClass} onSelect={() => onDelete(credit.id)}>
              <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
              Cancelar crédito
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
