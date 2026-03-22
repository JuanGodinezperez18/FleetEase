
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import type { FinancialRecord, FinancialCategory } from '@/types';
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";

export const getTransactionColumns = (financialCategories: FinancialCategory[]): ColumnDef<FinancialRecord>[] => {
  const categoryMap = new Map(financialCategories.map(cat => [cat.id, cat.name]));

  return [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fecha" />
      ),
      cell: ({ row }) => formatDate(row.original.date)
    },
    { 
      id: 'category', 
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoría" />
      ),
      cell: ({ row }) => categoryMap.get(row.original.categoryId) || 'Sin Categoría'
    },
    { 
      accessorKey: 'description', 
      header: 'Descripción',
      cell: ({ row }) => row.original.description
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Monto" className="text-right" />
      ),
      cell: ({ row }) => {
          const item = row.original;
          const category = financialCategories.find(c => c.id === item.categoryId);
          const isCharge = item.type === 'income' && category?.affects === 'client_balance';
          const formattedAmount = formatCurrency(item.amount);

          return (
              <div className="text-right">
                  <span className={isCharge ? 'text-destructive' : 'text-green-600'}>
                      {isCharge ? `+ ${formattedAmount}` : `- ${formattedAmount}`}
                  </span>
              </div>
          )
      }
    },
  ];
};
