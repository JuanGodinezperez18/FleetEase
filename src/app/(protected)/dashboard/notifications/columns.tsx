

"use client";

import type { ColumnDef } from '@tanstack/react-table';
import type { AnalyzedNotification } from '@/hooks/use-notifications-analytics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Bell, Wrench, FileText, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getNotificationLink } from '@/lib/notification-utils'; // Importar la utilidad

const getPriorityBadge = (priority: AnalyzedNotification['priority']) => {
    switch (priority) {
      case 'Crítica': return <Badge variant="destructive">Crítica</Badge>;
      case 'Alta': return <Badge className="bg-amber-500 hover:bg-amber-600">Alta</Badge>;
      case 'Media': return <Badge variant="secondary">Media</Badge>;
      case 'Baja': return <Badge variant="outline">Baja</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
};

const getNotificationIcon = (type: AnalyzedNotification['type']) => {
    switch (type) {
      case 'maintenance_mileage':
      case 'maintenance_date':
        return <Wrench className="h-5 w-5 text-blue-500" />;
      case 'insurance_expiry':
      case 'license_expiry':
        return <FileText className="h-5 w-5 text-yellow-500" />;
      case 'driver_payment_pending':
        return <UserCheck className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
};

export const getColumns = (
  markAsRead: (notificationId: string) => void
): ColumnDef<AnalyzedNotification>[] => [
    {
        id: 'icon',
        cell: ({row}) => getNotificationIcon(row.original.type),
        header: '',
        size: 20
    },
    {
      accessorKey: 'message',
      header: 'Mensaje',
      cell: ({ row }) => (
        <div className="flex flex-col">
            <Link href={getNotificationLink(row.original)} className="font-medium hover:underline">
                {row.original.message}
            </Link>
            <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(row.original.date), {
                  addSuffix: true,
                  locale: es
                })}
            </span>
        </div>
      )
    },
    {
        accessorKey: 'priority',
        header: 'Prioridad',
        cell: ({row}) => getPriorityBadge(row.original.priority)
    },
    {
        accessorKey: 'category',
        header: 'Categoría',
    },
    {
        accessorKey: 'isRead',
        header: 'Estado',
        cell: ({row}) => row.original.isRead ? <Badge variant="outline">Leída</Badge> : <Badge>No Leída</Badge>,
        filterFn: (row, id, value) => {
          if (value === 'all') return true;
          if (value === 'read') return row.original.isRead;
          if (value === 'unread') return !row.original.isRead;
          return true;
        },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link href={getNotificationLink(row.original)}>Revisar</Link>
            </Button>
            {!row.original.isRead && (
                <Button variant="ghost" size="sm" onClick={() => markAsRead(row.original.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Marcar Leída
                </Button>
            )}
        </div>
      )
    }
];
