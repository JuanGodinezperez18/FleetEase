"use client";

import React, { useMemo } from 'react';
import type { AnalyzedNotification } from '@/hooks/use-notifications-analytics';
import {
  BellRing,
  AlertTriangle,
  Siren,
  Activity,
  BarChart as BarChartIcon,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { MetricCard } from '@/components/dashboard/components/MetricCard';

interface NotificationsDashboardProps {
  analyzedNotifications: AnalyzedNotification[];
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0e1117',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
};

export const NotificationsDashboard: React.FC<NotificationsDashboardProps> = ({
  analyzedNotifications,
}) => {
  const router = useRouter();

  const overallStats = useMemo(() => {
    const total = analyzedNotifications.length;
    const unread = analyzedNotifications.filter(n => !n.isRead).length;
    const critical = analyzedNotifications.filter(n => n.priority === 'Crítica').length;
    const actionRequired = analyzedNotifications.filter(n => n.actionRequired).length;

    const categoryDistribution: Record<string, number> = {};
    analyzedNotifications.forEach(n => {
      categoryDistribution[n.category] = (categoryDistribution[n.category] || 0) + 1;
    });

    return {
      total,
      unread,
      critical,
      actionRequired,
      categoryDistribution: Object.entries(categoryDistribution).map(([name, value]) => ({
        name,
        Notificaciones: value,
      })),
    };
  }, [analyzedNotifications]);

  const chartKey = overallStats.categoryDistribution.map(d => d.Notificaciones).join('-');

  const criticalNotifications = useMemo(() => {
    return analyzedNotifications.filter(n => n.priority === 'Crítica' && !n.isRead);
  }, [analyzedNotifications]);

  const getRelatedEntityLink = (notification: AnalyzedNotification) => {
    switch (notification.type) {
      case 'maintenance_mileage':
      case 'maintenance_date':
      case 'insurance_expiry':
        return `/dashboard/vehicles/${notification.relatedId}`;
      case 'license_expiry':
      case 'driver_payment_pending':
        return `/dashboard/clients/${notification.relatedId}/transactions`;
      default:
        if (notification.relatedEntityType === 'Client') {
          return `/dashboard/clients/${notification.relatedId}`;
        }
        if (notification.relatedEntityType === 'Vehicle') {
          return `/dashboard/vehicles/${notification.relatedId}`;
        }
        return '#';
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Sin leer"
          value={String(overallStats.unread)}
          description={`De ${overallStats.total} totales`}
          icon={<BellRing className="h-5 w-5" strokeWidth={1.75} />}
        />
        <MetricCard
          title="Críticas"
          value={String(overallStats.critical)}
          description="Atención inmediata"
          icon={<Siren className="h-5 w-5" strokeWidth={1.75} />}
          variant="danger"
        />
        <MetricCard
          title="Acción requerida"
          value={String(overallStats.actionRequired)}
          description="Requieren respuesta"
          icon={<Activity className="h-5 w-5" strokeWidth={1.75} />}
        />
        <MetricCard
          title="Categorías"
          value={String(overallStats.categoryDistribution.length)}
          description="Áreas activas"
          icon={<BarChartIcon className="h-5 w-5" strokeWidth={1.75} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="font-heading text-sm font-semibold text-white">Distribución por categoría</h2>
            <p className="text-xs text-white/40">Volumen por área de operación</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="h-[220px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartKey} data={overallStats.categoryDistribution} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar
                    dataKey="Notificaciones"
                    fill="#d7ff3f"
                    radius={[0, 8, 8, 0]}
                    maxBarSize={22}
                    isAnimationActive
                    animationDuration={850}
                    animationEasing="ease-out"
                    activeBar={{
                      fill: '#e8ff6b',
                      stroke: '#d7ff3f',
                      strokeWidth: 1,
                      radius: [0, 8, 8, 0],
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="font-heading flex items-center gap-2 text-sm font-semibold text-white">
              <AlertTriangle className="h-4 w-4 text-rose-400" strokeWidth={1.75} />
              Críticas activas
            </h2>
            <p className="text-xs text-white/40">Sin leer, priorizadas por urgencia</p>
          </div>
          <div className="divide-y divide-white/[0.04] p-2 sm:p-3">
            {criticalNotifications.length > 0 ? (
              criticalNotifications.slice(0, 5).map(n => (
                <div
                  key={n.id}
                  className="flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 hover:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/90">{n.message}</p>
                    <p className="text-[11px] text-white/35">
                      {n.category} · Score {n.urgencyScore}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                    onClick={() => router.push(getRelatedEntityLink(n))}
                  >
                    Revisar
                  </Button>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-white/35">No hay alertas críticas activas</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
