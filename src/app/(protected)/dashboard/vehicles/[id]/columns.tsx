
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { FinancialRecord, VehicleAssignmentLog } from "@/types";
import { formatDate } from '@/lib/date-utils';
import { formatCurrency } from "@/lib/utils";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";

export const transactionsColumns: ColumnDef<FinancialRecord>[] = [
    {
        accessorKey: 'date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
        cell: ({ row }) => formatDate(row.original.date),
    },
    {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => row.original.type === 'income' ? 'Ingreso' : 'Gasto',
    },
    {
        accessorKey: 'description',
        header: 'Descripción',
    },
    {
        accessorKey: 'amount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Monto" className="text-right" />,
        cell: ({ row }) => {
            const isIncome = row.original.type === 'income';
            return (
                <div className="text-right">
                    <span className={isIncome ? 'text-green-600' : 'text-destructive'}>
                        {isIncome ? '+' : '-'} {formatCurrency(row.original.amount)}
                    </span>
                </div>
            )
        }
    },
];


export const assignmentColumns: ColumnDef<VehicleAssignmentLog>[] = [
    {
        accessorKey: 'startDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Inicio" />,
        cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
        accessorKey: 'endDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Fin" />,
        cell: ({ row }) => row.original.endDate ? formatDate(row.original.endDate) : 'Presente',
    },
    {
        accessorKey: 'clientId',
        header: 'ID Cliente',
    },
     {
        accessorKey: 'notes',
        header: 'Notas',
    },
];
