"use client";

import { useMemo, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/hooks/use-data";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  credit_payment_received: "Pago de crédito",
  vehicle_maintenance_due: "Mantenimiento",
  insurance_expiring: "Seguro",
  license_expiring: "Licencia",
  balance_updated: "Balance",
  announcement: "Aviso",
};

export function UnreadNotificationsCard() {
  const { currentUser } = useAuth();
  const { notifications } = useData();
  const [busy, setBusy] = useState(false);

  const unread = useMemo(() => {
    if (!currentUser) return [];
    return (notifications || [])
      .filter(
        (n: any) =>
          !n.isDeleted &&
          !n.isRead &&
          (n.userId === currentUser.uid || n.user_id === currentUser.uid || !n.userId)
      )
      .sort((a: any, b: any) => {
        const da = new Date(a.date || a.createdAt || 0).getTime();
        const db = new Date(b.date || b.createdAt || 0).getTime();
        return db - da;
      })
      .slice(0, 8);
  }, [notifications, currentUser]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    } catch {
      toast.error("No se pudo marcar como leída");
    }
  };

  const markAll = async () => {
    if (!currentUser || unread.length === 0) return;
    setBusy(true);
    try {
      const ids = unread.map((n: any) => n.id);
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", ids);
      if (error) throw error;
      toast.success("Notificaciones marcadas como leídas");
    } catch {
      toast.error("No se pudieron actualizar las notificaciones");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#0e1117] shadow-[0_12px_40px_rgba(0,0,0,.2)]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <Bell className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Notificaciones sin leer</p>
            <p className="text-[11px] text-white/40">
              {unread.length === 0
                ? "Todo al día"
                : `${unread.length} pendiente${unread.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {unread.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={markAll}
              className="h-8 px-2 text-[11px] text-white/50 hover:bg-white/[0.06] hover:text-white"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
              Leer todas
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
            className="h-8 px-2 text-[11px] text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            <Link href="/dashboard/notifications">Ver todas</Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {unread.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-white/35">
            No tienes notificaciones sin leer.
          </p>
        ) : (
          unread.map((n: any) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markAsRead(n.id)}
              className={cn(
                "flex w-full flex-col gap-1 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors",
                "hover:border-white/[0.06] hover:bg-white/[0.03]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white/90">
                  {TYPE_LABELS[n.type] || n.title || n.type || "Aviso"}
                </p>
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25" strokeWidth={1.75} />
              </div>
              <p className="line-clamp-2 text-xs text-white/45">{n.message}</p>
              <p className="text-[10px] text-white/30">
                {n.date || n.createdAt
                  ? formatDistanceToNow(new Date(n.date || n.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })
                  : ""}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
