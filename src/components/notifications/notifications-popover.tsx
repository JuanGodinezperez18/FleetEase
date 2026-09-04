// components/notifications/notifications-popover.tsx
'use client';

import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationsPopoverProps { children: React.ReactNode; }

export function NotificationsPopover({ children }: NotificationsPopoverProps) {
  const { currentUser } = useAuth();
  const { notifications } = useData();
  const [open, setOpen] = useState(false);

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(n => n.uid === currentUser.uid).sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 10);
  }, [notifications, currentUser]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      if (error) throw error;
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = userNotifications.filter(n => !n.isRead);
      const results = await Promise.all(unreadNotifications.map(n => supabase.from('notifications').update({ is_read: true }).eq('id', n.id)));
      const firstError = results.find(result => result.error)?.error;
      if (firstError) throw firstError;
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      toast.error('Error al marcar notificaciones');
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      credit_payment_received: '💰', vehicle_maintenance_due: '🔧', insurance_expiring: '🛡️',
      license_expiring: '📄', balance_updated: '💵', announcement: '📢', default: '🔔',
    };
    return icons[type] || icons.default;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Radix Slot requires exactly one element child. The wrapper makes the trigger safe
            even when callers provide fragments or multiple nodes. */}
        <span className="inline-flex">{children}</span>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {userNotifications.some(n => !n.isRead) && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
              <Check className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {userNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground"><p className="text-sm">No tienes notificaciones</p></div>
          ) : (
            <div className="divide-y">
              {userNotifications.map(notification => (
                <div key={notification.id} className={`p-4 hover:bg-accent cursor-pointer transition-colors ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`} onClick={() => { if (!notification.isRead) markAsRead(notification.id); }}>
                  <div className="flex gap-3">
                    <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{notification.type}</p>
                        {!notification.isRead && <Badge variant="default" className="shrink-0 h-2 w-2 p-0 rounded-full" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {notification.date ? formatDistanceToNow(new Date(notification.date), { addSuffix: true, locale: es }) : 'Hace un momento'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
