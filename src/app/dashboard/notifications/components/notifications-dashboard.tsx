
"use client";

import React, { useMemo } from 'react';
import type { AnalyzedNotification } from '@/hooks/use-notifications-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface NotificationsDashboardProps {
  analyzedNotifications: AnalyzedNotification[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border rounded-lg shadow-sm">
        <p className="font-bold">{label}</p>
        {payload.map((p: any, index: number) => (
            <p key={index} style={{ color: p.color }}>{`${p.name}: ${p.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};


export const NotificationsDashboard: React.FC<NotificationsDashboardProps> = ({ analyzedNotifications }) => {
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
      categoryDistribution: Object.entries(categoryDistribution).map(([name, value]) => ({ name, Notificaciones: value })),
    };
  }, [analyzedNotifications]);

  const criticalNotifications = useMemo(() => {
    return analyzedNotifications.filter(n => n.priority === 'Crítica' && !n.isRead);
  }, [analyzedNotifications]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };
  
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
        // Fallback para otros tipos de notificaciones
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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificaciones Sin Leer</CardTitle>
            <BellRing className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.unread}</div>
            <p className="text-xs text-muted-foreground">De {overallStats.total} notificaciones totales.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <Siren className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overallStats.critical}</div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acción Requerida</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.actionRequired}</div>
            <p className="text-xs text-muted-foreground">Notificaciones que necesitan una acción.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribución</CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.categoryDistribution.length}</div>
            <p className="text-xs text-muted-foreground">Categorías de alertas activas.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Distribución por Categoría</CardTitle>
                <CardDescription>Volumen de notificaciones por área de operación.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overallStats.categoryDistribution} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }}/>
                        <Bar dataKey="Notificaciones" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><AlertTriangle className="mr-2 text-destructive"/> Alertas Críticas Activas</CardTitle>
            <CardDescription>Notificaciones que requieren atención inmediata, priorizadas por urgencia.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Mensaje</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {criticalNotifications.length > 0 ? (
                        criticalNotifications.slice(0, 5).map(n => (
                            <TableRow key={n.id}>
                                <TableCell>
                                    <p className="font-medium truncate max-w-xs">{n.message}</p>
                                    <span className="text-xs text-muted-foreground">{n.category} / Score: {n.urgencyScore}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleNavigate(getRelatedEntityLink(n))}>
                                        Revisar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">No hay alertas críticas activas.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
