

"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Credit, Client, Vehicle } from "@/types";
import { useRouter } from 'next/navigation';
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CreditWithMetrics } from '@/hooks/use-credits-search';

// Helper to format currency safely
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

const getPaymentBehaviorBadge = (level: CreditWithMetrics['paymentBehavior']) => {
    if (!level) return <Badge variant="outline">N/A</Badge>;
    switch (level) {
        case 'Puntual': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Puntual</Badge>;
        case 'Ligero Retraso': return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600">Retraso Ligero</Badge>;
        case 'Retraso Severo': return <Badge variant="destructive">Retraso Severo</Badge>;
        default: return <Badge variant="outline">{level}</Badge>;
    }
};

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
      return clientName || <span className="text-muted-foreground">Desconocido</span>;
    },
  },
  {
    accessorKey: "paymentBehavior",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Comportamiento" />,
    cell: ({ row }) => {
      const { paymentBehavior, weeksOverdue } = row.original;
      return (
        <div className="flex flex-col gap-1">
          {getPaymentBehaviorBadge(paymentBehavior)}
          {weeksOverdue && weeksOverdue > 0 ? (
             <span className="text-xs text-destructive">
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
    cell: ({ row }) => formatCurrency(row.getValue("remainingBalance")),
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
            <span className="text-xs font-medium">{formatCurrency(paid)} / {formatCurrency(total)}</span>
            <Progress value={progress} className="w-full mt-1" />
        </div>
      );
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as Credit['status'];
      let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
      switch(status) {
          case 'active': variant = 'default'; break;
          case 'completed': variant = 'secondary'; break;
          case 'defaulted': variant = 'destructive'; break;
          case 'inactive': variant = 'outline'; break;
      }
      return <Badge variant={variant} className={status === 'active' ? 'bg-green-500' : ''}>{status}</Badge>;
    },
  },
  {
    accessorKey: "estimatedCompletionDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Finalización Est." />,
    cell: ({ row }) => {
      const date = row.original.estimatedCompletionDate;
      if (!date) return '-';
      
      const daysToCompletion = differenceInDays(date, new Date());
      const isOverdue = daysToCompletion < 0;
      
      return (
        <div className={`text-sm ${isOverdue ? 'text-red-600' : ''}`}>
          {format(date, 'dd/MM/yyyy')}
          {isOverdue && <Badge variant="destructive" className="ml-1 text-xs">Vencido</Badge>}
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
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onViewDetails(credit.id)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(credit)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            {credit.status === 'active' && (
              <DropdownMenuItem
                onClick={() => onDeactivate(credit.id)}
                className="text-orange-600 focus:text-orange-700"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Desactivar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(credit.id)}
              className="text-red-600 focus:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
