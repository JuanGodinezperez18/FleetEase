

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { FinancialRecord } from "@/types";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const columns: ColumnDef<FinancialRecord>[] = [
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const date = row.getValue("date");
      return date ? format(new Date(date as string), 'dd/MM/yyyy', { locale: es }) : 'N/A';
    },
  },
  {
    accessorKey: "type",
    header: "Tipo",
  },
  {
    accessorKey: "description",
    header: "Descripción",
  },
  {
    accessorKey: "category",
    header: "Categoría",
  },
  {
    accessorKey: "amount",
    header: "Monto",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
];

