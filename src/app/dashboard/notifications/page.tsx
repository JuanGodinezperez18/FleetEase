"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '@/hooks/use-data';
import type { AnalyzedNotification } from '@/hooks/use-notifications-analytics';
import { NotificationsDashboard } from './components/notifications-dashboard';
import { useNotificationsSearch } from '@/hooks/use-notifications-search';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import type { ColumnDef } from '@tanstack/react-table';
import { useNotificationsAnalytics } from '@/hooks/use-notifications-analytics';
import { getColumns } from './columns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle, Download, Bell, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getNotificationLink } from '@/lib/notification-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const priorityStyles: Record<string, string> = {
  Crítica: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
  Alta: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  Media: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
  Baja: 'border-white/10 bg-white/[0.04] text-white/60',
};

const GroupedNotifications = ({ notifications }: { notifications: AnalyzedNotification[] }) => {
  const grouped: [string, AnalyzedNotification[]][] = useMemo(() => {
    const groups: Record<string, AnalyzedNotification[]> = {};
    notifications.forEach(notif => {
      const key = `${notif.category}_${notif.priority}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(notif);
    });
    return Object.entries(groups).sort(([keyA], [keyB]) => {
      const priorityOrder: Record<string, number> = { Crítica: 4, Alta: 3, Media: 2, Baja: 1 };
      const priorityA = keyA.split('_')[1];
      const priorityB = keyB.split('_')[1];
      return (priorityOrder[priorityB] || 0) - (priorityOrder[priorityA] || 0);
    });
  }, [notifications]);

  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-white/40">No hay notificaciones para mostrar</div>
    );
  }

  return (
    <ScrollArea className="h-[560px] pr-2">
      <div className="space-y-3">
        {grouped.map(([key, notifs]) => (
          <div
            key={key}
            className="overflow-hidden rounded-[16px] border border-white/[0.07] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
              <h3 className="font-heading text-sm font-semibold text-white">{notifs[0].category}</h3>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  priorityStyles[notifs[0].priority] || priorityStyles.Baja
                )}
              >
                {notifs.length} · {notifs[0].priority}
              </span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {notifs.map(n => (
                <Link
                  key={n.id}
                  href={getNotificationLink(n)}
                  className="block px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.03] hover:text-white"
                >
                  {n.message}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

const NotificationMobileCard = ({
  notification,
  markAsRead,
}: {
  notification: AnalyzedNotification;
  markAsRead: (id: string) => void;
}) => {
  return (
    <article className="space-y-3 rounded-[16px] border border-white/[0.07] bg-[#0e1117] p-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            priorityStyles[notification.priority] || priorityStyles.Baja
          )}
        >
          {notification.priority}
        </span>
        <span className="text-[11px] text-white/35">
          {format(new Date(notification.date), 'dd MMM yyyy', { locale: es })}
        </span>
      </div>
      <p className="text-sm font-medium text-white/90">{notification.message}</p>
      <div className="flex items-center justify-between text-[11px] text-white/40">
        <span>
          {notification.category} · {notification.entityType}
        </span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            notification.isRead
              ? 'border-white/10 bg-white/[0.04] text-white/50'
              : 'border-[#d7ff3f]/25 bg-[#d7ff3f]/10 text-[#d7ff3f]'
          )}
        >
          {notification.isRead ? 'Leída' : 'No leída'}
        </span>
      </div>
      <div className="flex gap-2 border-t border-white/[0.06] pt-3">
        <Button
          size="sm"
          asChild
          className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
        >
          <Link href={getNotificationLink(notification)}>Revisar</Link>
        </Button>
        {!notification.isRead && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            onClick={() => markAsRead(notification.id)}
          >
            Marcar leída
          </Button>
        )}
      </div>
    </article>
  );
};

export default function NotificationsPage() {
  const {
    notifications: rawNotifications,
    clients,
    vehicles,
    partners,
    financialRecords,
    clientBalances,
    markNotificationAsRead: markSingleAsRead,
    loadingData,
  } = useData();
  const queryClient = useQueryClient();
  const [readOverrides, setReadOverrides] = useState<Set<string>>(() => new Set());
  const { analyzedNotifications } = useNotificationsAnalytics(
    rawNotifications,
    clients,
    vehicles,
    partners,
    financialRecords,
    clientBalances
  );

  const displayedNotifications = useMemo(
    () =>
      analyzedNotifications.map(notification =>
        readOverrides.has(notification.id) ? { ...notification, isRead: true } : notification
      ),
    [analyzedNotifications, readOverrides]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      const notification = displayedNotifications.find(n => n.id === id);
      if (!notification || notification.isRead) return;

      const previousOverrides = new Set(readOverrides);
      setReadOverrides(previous => {
        const next = new Set(previous);
        next.add(id);
        return next;
      });

      try {
        const readAt = new Date().toISOString();

        if (notification.isAutoGenerated) {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;
          if (!userId) throw new Error('No se pudo identificar al usuario actual.');

          const { error } = await (supabase as any)
            .from('notification_read_states')
            .upsert(
              { user_id: userId, notification_key: id, read_at: readAt },
              { onConflict: 'user_id,notification_key' }
            );
          if (error) throw error;

          queryClient.setQueryData<{ notification_key: string; read_at: string }[]>(
            ['notification-read-states', userId],
            current => {
              const rows = current || [];
              const withoutCurrent = rows.filter(row => row.notification_key !== id);
              return [...withoutCurrent, { notification_key: id, read_at: readAt }];
            }
          );
          await queryClient.invalidateQueries({ queryKey: ['notification-read-states', userId] });
        } else {
          await markSingleAsRead(id);
        }
      } catch (error) {
        setReadOverrides(previousOverrides);
        console.error(error);
        toast.error('Error al marcar la notificación como leída');
      }
    },
    [displayedNotifications, markSingleAsRead, queryClient, readOverrides]
  );

  const {
    filters,
    filteredNotifications,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults,
  } = useNotificationsSearch(displayedNotifications);
  const columns: ColumnDef<AnalyzedNotification>[] = useMemo(
    () => getColumns(markAsRead),
    [markAsRead]
  );

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = filteredNotifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) {
      toast.info('No hay notificaciones sin leer');
      return;
    }
    const toastId = toast.loading(
      `Marcando ${unreadNotifications.length} notificaciones como leídas...`
    );
    const previousOverrides = new Set(readOverrides);
    setReadOverrides(previous => {
      const next = new Set(previous);
      unreadNotifications.forEach(notification => next.add(notification.id));
      return next;
    });

    try {
      const regularIds = unreadNotifications.filter(n => !n.isAutoGenerated).map(n => n.id);
      if (regularIds.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in('id', regularIds);
        if (error) throw error;
      }

      const automaticKeys = unreadNotifications.filter(n => n.isAutoGenerated).map(n => n.id);
      if (automaticKeys.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error('No se pudo identificar al usuario actual.');
        const readAt = new Date().toISOString();
        const rows = automaticKeys.map(notification_key => ({
          user_id: userId,
          notification_key,
          read_at: readAt,
        }));
        const { error } = await (supabase as any)
          .from('notification_read_states')
          .upsert(rows, { onConflict: 'user_id,notification_key' });
        if (error) throw error;

        queryClient.setQueryData<{ notification_key: string; read_at: string }[]>(
          ['notification-read-states', userId],
          current => {
            const existing = new Map((current || []).map(row => [row.notification_key, row]));
            rows.forEach(row => existing.set(row.notification_key, row));
            return Array.from(existing.values());
          }
        );
        await queryClient.invalidateQueries({ queryKey: ['notification-read-states', userId] });
      }

      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notificaciones marcadas como leídas', { id: toastId });
    } catch (error) {
      setReadOverrides(previousOverrides);
      console.error(error);
      toast.error('Error al marcar notificaciones', { id: toastId });
    }
  };

  const handleExportNotifications = () => {
    const data = filteredNotifications.map(n => ({
      Fecha: format(new Date(n.date), 'dd/MM/yyyy HH:mm', { locale: es }),
      Mensaje: n.message,
      Prioridad: n.priority,
      Categoría: n.category,
      Tipo: n.entityType,
      Estado: n.isRead ? 'Leída' : 'No leída',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Notificaciones');
    XLSX.writeFile(wb, `notificaciones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Notificaciones exportadas');
  };

  if (loadingData && !displayedNotifications.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[18px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Operación
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Notificaciones
            </h1>
            <p className="mt-1 text-sm text-white/40">Bandeja de alertas y avisos del sistema</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <Bell className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportNotifications}
              disabled={filteredNotifications.length === 0}
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Download className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Exportar
            </Button>
            <Button
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={filteredNotifications.filter(n => !n.isRead).length === 0}
              className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
            >
              <CheckCircle className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Marcar leídas
            </Button>
          </div>
        </header>

        <NotificationsDashboard analyzedNotifications={displayedNotifications} />

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
            <h2 className="font-heading text-sm font-semibold text-white">Bandeja</h2>
            <p className="text-xs text-white/40">Alertas filtradas según tus criterios</p>
          </div>
          <div className="p-3 sm:p-4">
            <Tabs defaultValue="list">
              <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 rounded-[16px] border border-white/[0.07] bg-[#080a0f] p-1 sm:w-[280px]">
                <TabsTrigger
                  value="list"
                  className="rounded-xl text-xs text-white/50 data-[state=active]:bg-[#d7ff3f] data-[state=active]:text-[#080a0f]"
                >
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="grouped"
                  className="rounded-xl text-xs text-white/50 data-[state=active]:bg-[#d7ff3f] data-[state=active]:text-[#080a0f]"
                >
                  Agrupado
                </TabsTrigger>
              </TabsList>
              <TabsContent value="list">
                <ResponsiveTable
                  columns={columns}
                  data={filteredNotifications}
                  loading={loadingData}
                  searchPlaceholder="Buscar por mensaje, entidad..."
                  noResultsText="No se encontraron notificaciones con los filtros aplicados."
                  mobileCardRenderer={notification => (
                    <NotificationMobileCard notification={notification} markAsRead={markAsRead} />
                  )}
                />
              </TabsContent>
              <TabsContent value="grouped">
                <GroupedNotifications notifications={filteredNotifications} />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </div>
  );
}
