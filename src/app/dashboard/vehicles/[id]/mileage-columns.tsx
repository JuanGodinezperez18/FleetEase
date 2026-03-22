

"use client";
import { ColumnDef } from "@tanstack/react-table";
import type { MileageLog } from "@/types";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { infallibleNormalizeDate } from "@/lib/date-utils";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";

export const mileageColumns: ColumnDef<MileageLog>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const date = infallibleNormalizeDate(row.getValue("date"));
      return date ? format(date, 'P', { locale: es }) : 'N/A';
    },
  },
  {
    accessorKey: "mileage",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Kilometraje" />,
    cell: ({ row }) => {
        const amount = parseFloat(row.getValue("mileage"));
        const formattedMileage = new Intl.NumberFormat('es-MX').format(amount);
        return `${formattedMileage} km`;
    }
  },
  {
    accessorKey: "notes",
    header: "Notas",
  },
];
