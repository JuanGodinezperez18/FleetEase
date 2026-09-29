
"use client";

import { useParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUserAnalytics } from '@/hooks/use-user-analytics';
import { useMemo } from 'react';
import { User, Mail, Phone, Calendar, Shield, Activity, BarChart, AlertTriangle, PlusCircle } from 'lucide-react';

const roleTranslations: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador (Socio)',
  superAdmin: 'Super Admin'
};

const MetricCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description?: string }) => (
    <div className="bg-muted p-4 rounded-lg">
        <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <p className="text-sm font-semibold">{title}</p>
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
);

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.uid as string;
  
  const { users, financialRecords } = useData();
  const { userMetrics } = useUserAnalytics(users, financialRecords);

  const user = useMemo(() => users.find(u => u.uid === userId), [users, userId]);
  const metrics = useMemo(() => userMetrics.find(m => m.userId === userId), [userMetrics, userId]);
  
  if (!user) return <div>Usuario no encontrado</div>;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex items-center gap-4">
                <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center">
                    <User className="h-8 w-8" />
                </div>
                <div>
                    <CardTitle className="text-3xl font-bold">{user.name}</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">{roleTranslations[user.role] || user.role}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{user.phone || 'No proporcionado'}</span>
            </div>
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Miembro desde: <span className="font-semibold">{user.createdAt ? format(new Date(user.createdAt), 'PPP', { locale: es }) : 'N/A'}</span></span>
            </div>
             <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>Estado: <Badge variant={user.isDeleted ? 'destructive' : 'default'}>{user.isDeleted ? 'Eliminado' : 'Activo'}</Badge></span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Actividad y Permisos</CardTitle>
          <CardDescription>Un resumen de la actividad y el nivel de acceso del usuario en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard 
                title="Nivel de Actividad"
                value={metrics?.activityLevel || 'Bajo'}
                icon={<BarChart className="h-5 w-5" />}
                description="Basado en registros creados"
            />
            <MetricCard 
                title="Registros Creados"
                value={metrics?.recordsCreated || 0}
                icon={<PlusCircle className="h-5 w-5" />}
                description="Estimación basada en la actividad de la empresa"
            />
            <MetricCard 
                title="Nivel de Riesgo"
                value={metrics?.riskLevel || 'Bajo'}
                icon={<AlertTriangle className="h-5 w-5" />}
                description="Basado en los privilegios del rol"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
