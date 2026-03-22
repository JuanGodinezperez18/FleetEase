// app/(partner)/vehicles/columns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

export function getPartnerVehicleColumns(): ColumnDef<any>[] {
  return [
    {
      accessorKey: 'alias',
      header: 'Alias',
    },
    {
      accessorKey: 'make',
      header: 'Marca',
    },
    {
      accessorKey: 'model',
      header: 'Modelo',
    },
    {
      accessorKey: 'year',
      header: 'Año',
    },
    {
      accessorKey: 'currentMileage',
      header: 'Kilometraje',
      cell: ({ row }) => `${row.original.currentMileage?.toLocaleString() || 0} km`,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.clientId ? 'default' : 'secondary'}>
          {row.original.clientId ? 'Rentado' : 'Disponible'}
        </Badge>
      ),
    },
  ];
}