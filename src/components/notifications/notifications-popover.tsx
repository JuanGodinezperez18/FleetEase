'use client';

import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotificationsPopoverProps {
  children: React.ReactNode;
}

const TYPE_LABELS: Record<string, string> = {
  credit_payment_received: 'Pago de cr\u00e9dito',
  vehicle_maintenance_due: 'Mantenimiento',
  insurance_expiring: 'Seguro',
  license_expiring: 'Licencia',
  balance_updated: 'Balance',
  announcement: 'Aviso',
};

export function NotificationsPopover({ children }: NotificationsPopoverProps) {
  const { currentUser } = useAuth();
  const { notifications } = useData();
  const [open, setOpen] = useState(false);

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter(n => n.uid === currentUser.uid)
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);
  }, [notifications, currentUser]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      if (error) throw error;
    } catch (error) {
      console.error('Error marcando notificaci\u00f3n como le\u00edda:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = userNotifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length === 0 || !currentUser?.uid) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)
        .eq('uid', currentUser.uid);

      if (error) throw error;
    } catch {
      toast.error('Error al marcar notificaciones');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className="inline-flex">{children}</span>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 border-white/10 bg-[#0e1117] p-0 text-white shadow-2xl"
        align="end"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div>
            <h3 className="font-heading text-sm font-semibold text-white">Notificaciones</h3>
            {userNotifications.some(n => !n.isRead) && (
              <p className="text-[11px] text-white/40">
                {userNotifications.filter(n => !n.isRead).length} sin leer
              </p>
            )}
          </div>
          {userNotifications.some(n => !n.isRead) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 rounded-lg px-2 text-xs text-white/50 hover:bg-white/[0.06] hover:text-white"
            >
              <Check className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {userNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/30">
                <Bell className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <p className="text-sm text-white/35">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {userNotifications.map(notification => (
                <button
                  key={notification.id}
                  type="button"
                  className={cn(
                    'w-full cursor-pointer p-4 text-left transition-colors hover:bg-white/[0.04]',
                    !notification.isRead && 'bg-[#d7ff3f]/[0.04]'
                  )}
                  onClick={() => {
                    if (!notification.isRead) markAsRead(notification.id);
                  }}
                >
                  <div className="flex gap-3">
                    {!notification.isRead ? (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#d7ff3f] shadow-[0_0_8px_#d7ff3f80]" />
                    ) : (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm text-white/90', !notification.isRead && 'font-semibold')}>
                          {TYPE_LABELS[notification.type] || notification.type}
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-white/45">{notification.message}</p>
                      <p className="mt-2 text-[11px] text-white/30">
                        {notification.date
                          ? formatDistanceToNow(new Date(notification.date), { addSuffix: true, locale: es })
                          : 'Hace un momento'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
