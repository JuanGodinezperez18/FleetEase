

"use client";

import React, { useMemo } from 'react';
import type { UserProfile } from '@/types';
import type { UserMetric } from '@/hooks/use-user-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Users,
  UserX,
  ShieldCheck,
  AlertTriangle,
  BarChart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarChart as RechartsBarChart, Bar as RechartsBar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface UserAdminDashboardProps {
  users: UserProfile[];
  userMetrics: UserMetric[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border rounded-lg shadow-sm">
        <p className="font-bold">{label}</p>
        {payload.map((p: any, index: number) => (
            <p key={index} style={{ color: p.fill }}>{`${p.name}: ${p.value}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

export const UserAdminDashboard: React.FC<UserAdminDashboardProps> = ({ users, userMetrics }) => {
  const overallStats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => !u.isDeleted).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    const roleDistribution = users.reduce((acc, user) => {
      const role = user.role || 'Desconocido';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const activityDistribution = userMetrics.reduce((acc, metric) => {
      acc[metric.activityLevel] = (acc[metric.activityLevel] || 0) + 1;
      return acc;
    }, {} as Record<UserMetric['activityLevel'], number>);

    const highRiskUsers = userMetrics.filter(m => m.riskLevel === 'Alto');

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleDistribution: Object.entries(roleDistribution).map(([name, value]) => ({ name, Usuarios: value })),
      activityDistribution: Object.entries(activityDistribution).map(([name, value]) => ({ name, Usuarios: value })),
      highRiskUsers,
    };
  }, [users, userMetrics]);
  
  const getPermissionBadge = (level: UserMetric['permissionLevel']) => {
    switch (level) {
      case 'Acceso Total': return <Badge variant="destructive">Total</Badge>;
      case 'Acceso de Edición': return <Badge variant="secondary">Edición</Badge>;
      case 'Acceso Limitado': return <Badge variant="outline">Limitado</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };
  
  const getUserDetails = (metric: UserMetric) => {
    return users.find(u => u.uid === metric.userId);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{overallStats.activeUsers} activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Inactivos</CardTitle>
            <UserX className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">Cuentas desactivadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios de Alto Riesgo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.highRiskUsers.length}</div>
            <p className="text-xs text-muted-foreground">Roles con altos privilegios</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribución de Roles</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.roleDistribution.length}</div>
            <p className="text-xs text-muted-foreground">Tipos de roles activos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Rol</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={overallStats.roleDistribution} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <RechartsBar dataKey="Usuarios" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Actividad</CardTitle>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={overallStats.activityDistribution}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <RechartsBar dataKey="Usuarios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {overallStats.highRiskUsers.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Revisión de Seguridad Recomendada</AlertTitle>
          <AlertDescription>
            <p>Los siguientes usuarios tienen roles de alto privilegio. Se recomienda revisar su actividad periódicamente.</p>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Actividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overallStats.highRiskUsers.map(metric => {
                  const user = getUserDetails(metric);
                  return (
                    <TableRow key={metric.userId}>
                      <TableCell>{user?.name || 'Desconocido'}</TableCell>
                      <TableCell>{getPermissionBadge(metric.permissionLevel)}</TableCell>
                      <TableCell>
                        <Badge variant={metric.activityLevel === 'Inactivo' ? 'destructive' : 'outline'}>{metric.activityLevel}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
