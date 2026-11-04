
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { FinancialRecord } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp } from "lucide-react";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";

export const transactionsColumns: ColumnDef<FinancialRecord & { categoryName?: string }>[] = [
    {
        accessorKey: 'date',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
        cell: ({ row }) => formatDate(row.original.date),
    },
    {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
        cell: ({ row }) => {
            const isIncome = row.original.type === 'income';
            return (
                <Badge variant={isIncome ? 'default' : 'destructive'}>
                    {isIncome ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
                    {isIncome ? 'Ingreso' : 'Gasto'}
                </Badge>
            );
        }
    },
    {
        accessorKey: 'description',
        header: 'Descripción',
    },
    {
        accessorKey: 'categoryName',
        header: 'Categoría',
        cell: ({ row }) => row.original.categoryName || 'General',
    },
    {
        accessorKey: 'amount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Monto" className="text-right" />,
        cell: ({ row }) => {
            const isIncome = row.original.type === 'income';
            const amount = row.original.amount;
            return (
                <div className="text-right">
                    <span className={isIncome ? 'text-green-600' : 'text-destructive'}>
                        {isIncome ? `+ ${formatCurrency(amount)}` : `- ${formatCurrency(amount)}`}
                    </span>
                </div>
            )
        }
    },
];

    