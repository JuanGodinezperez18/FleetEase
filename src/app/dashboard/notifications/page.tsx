"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '@/hooks/use-data';
import type { AnalyzedNotification } from '@/hooks/use-notifications-analytics';
import { NotificationsDashboard } from './components/notifications-dashboard';
import { NotificationsAdvancedFilters } from './components/notifications-advanced-filters';
import { useNotificationsSearch } from '@/hooks/use-notifications-search';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useNotificationsAnalytics } from '@/hooks/use-notifications-analytics';
import { getColumns } from './columns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getNotificationLink } from '@/lib/notification-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

const GroupedNotifications = ({ notifications }: { notifications: AnalyzedNotification[] }) => {
  const grouped: [string, AnalyzedNotification[]][] = useMemo(() => {
    const groups: Record<string, AnalyzedNotification[]> = {};
    notifications.forEach(notif => {
      const key = `${notif.category}_${notif.priority}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(notif);
    });
    return Object.entries(groups).sort(([keyA], [keyB]) => {
      const priorityOrder = { 'Crítica': 4, 'Alta': 3, 'Media': 2, 'Baja': 1 };
      const priorityA = keyA.split('_')[1] as AnalyzedNotification['priority'];
      const priorityB = keyB.split('_')[1] as AnalyzedNotification['priority'];
      return (priorityOrder[priorityB] || 0) - (priorityOrder[priorityA] || 0);
    });
  }, [notifications]);

  if (notifications.length === 0) return <div className="text-center text-muted-foreground py-10">No hay notificaciones para mostrar.</div>;

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {grouped.map(([key, notifs]) => (
          <Card key={key}>
            <CardHeader className="pb-4"><div className="flex items-center justify-between"><CardTitle className="text-lg">{notifs[0].category}</CardTitle><Badge variant={notifs[0].priority === 'Crítica' || notifs[0].priority === 'Alta' ? 'destructive' : 'secondary'}>{notifs.length} Notificación(es)</Badge></div></CardHeader>
            <CardContent><div className="space-y-3">{notifs.map(n => <div key={n.id} className="py-2 border-b last:border-0 text-sm"><Link href={getNotificationLink(n)} className="hover:underline">{n.message}</Link></div>)}</div></CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};

const NotificationMobileCard = ({ notification, markAsRead }: { notification: AnalyzedNotification, markAsRead: (id: string) => void }) => {
  const getPriorityBadge = (priority: AnalyzedNotification['priority']) => {
    switch (priority) {
      case 'Crítica': return <Badge variant="destructive">Crítica</Badge>;
      case 'Alta': return <Badge className="bg-amber-500 hover:bg-amber-600">Alta</Badge>;
      case 'Media': return <Badge variant="secondary">Media</Badge>;
      case 'Baja': return <Badge variant="outline">Baja</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };
  return (
    <Card className="p-4"><div className="space-y-2"><div className="flex items-center justify-between gap-2">{getPriorityBadge(notification.priority)}<span className="text-xs text-muted-foreground">{new Date(notification.date).toLocaleDateString()}</span></div><p className="font-medium text-sm">{notification.message}</p><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{notification.category} / {notification.entityType}</span>{notification.isRead ? <Badge variant="outline">Leída</Badge> : <Badge>No Leída</Badge>}</div><div className="flex gap-2 pt-2 border-t mt-2"><Button variant="default" size="sm" asChild><Link href={getNotificationLink(notification)}>Revisar</Link></Button>{!notification.isRead && <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>Marcar como leída</Button>}</div></div></Card>
  );
};

export default function NotificationsPage() {
  const { notifications: rawNotifications, clients, vehicles, partners, financialRecords, clientBalances, markNotificationAsRead: markSingleAsRead, loadingData } = useData();
  const queryClient = useQueryClient();
  const { analyzedNotifications } = useNotificationsAnalytics(rawNotifications, clients, vehicles, partners, financialRecords, clientBalances);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const notification = analyzedNotifications.find(n => n.id === id);
      if (!notification) return;
      const readAt = new Date().toISOString();

      if (notification.isAutoGenerated) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error('No se pudo identificar al usuario actual.');
        const { error } = await (supabase as any)
          .from('notification_read_states')
          .upsert({ user_id: userId, notification_key: id, read_at: readAt }, { onConflict: 'user_id,notification_key' });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['notification-read-states', userId] });
      } else {
        await markSingleAsRead(id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al marcar la notificación como leída');
    }
  }, [analyzedNotifications, markSingleAsRead, queryClient]);

  const { filters, filteredNotifications, updateFilter, resetFilters, debouncedSetQuery, totalResults } = useNotificationsSearch(analyzedNotifications);
  const columns: ColumnDef<AnalyzedNotification>[] = useMemo(() => getColumns(markAsRead), [markAsRead]);

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = filteredNotifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) { toast.info('No hay notificaciones sin leer para marcar.'); return; }
    const toastId = toast.loading(`Marcando ${unreadNotifications.length} notificaciones como leídas...`);
    try {
      const regularIds = unreadNotifications.filter(n => !n.isAutoGenerated).map(n => n.id);
      if (regularIds.length > 0) {
        const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', regularIds);
        if (error) throw error;
      }

      const automaticKeys = unreadNotifications.filter(n => n.isAutoGenerated).map(n => n.id);
      if (automaticKeys.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error('No se pudo identificar al usuario actual.');
        const readAt = new Date().toISOString();
        const rows = automaticKeys.map(notification_key => ({ user_id: userId, notification_key, read_at: readAt }));
        const { error } = await (supabase as any).from('notification_read_states').upsert(rows, { onConflict: 'user_id,notification_key' });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['notification-read-states', userId] });
      }

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notificaciones marcadas como leídas', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Error al marcar notificaciones', { id: toastId });
    }
  };

  const handleExportNotifications = () => {
    const data = filteredNotifications.map(n => ({ 'Fecha': format(new Date(n.date), 'dd/MM/yyyy HH:mm', { locale: es }), 'Mensaje': n.message, 'Prioridad': n.priority, 'Categoría': n.category, 'Tipo': n.entityType, 'Estado': n.isRead ? 'Leída' : 'No leída' }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Notificaciones');
    XLSX.writeFile(wb, `notificaciones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Notificaciones exportadas');
  };

  if (loadingData && !analyzedNotifications.length) return <p>Cargando notificaciones...</p>;

  return (
    <div className="space-y-6">
      <NotificationsDashboard analyzedNotifications={analyzedNotifications} />
      <NotificationsAdvancedFilters filters={filters} onFilterChange={updateFilter} onReset={resetFilters} onSearch={debouncedSetQuery} totalResults={totalResults} isLoading={loadingData} />
      <Card><CardHeader><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><CardTitle>Bandeja de Notificaciones</CardTitle><CardDescription>Todas las alertas y avisos del sistema, filtradas según tus criterios.</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={handleExportNotifications} disabled={filteredNotifications.length === 0}><Download className="mr-2 h-4 w-4" />Exportar</Button><Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={filteredNotifications.filter(n => !n.isRead).length === 0}><CheckCircle className="h-4 w-4 mr-2" />Marcar todas leídas</Button></div></div></CardHeader>
        <CardContent><Tabs defaultValue="list"><TabsList className="mb-4"><TabsTrigger value="list">Lista</TabsTrigger><TabsTrigger value="grouped">Agrupado</TabsTrigger></TabsList><TabsContent value="list"><ResponsiveTable columns={columns} data={filteredNotifications} loading={loadingData} searchPlaceholder="Buscar por mensaje, entidad..." noResultsText="No se encontraron notificaciones con los filtros aplicados." mobileCardRenderer={(notification) => <NotificationMobileCard notification={notification} markAsRead={markAsRead} />} /></TabsContent><TabsContent value="grouped"><GroupedNotifications notifications={filteredNotifications} /></TabsContent></Tabs></CardContent>
      </Card>
    </div>
  );
}
