// app/(client)/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  AlertTriangle,
  Wrench,
  Camera,
  Gauge,
  Plus,
  Bell,
  ShieldAlert,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// Lazy load de componentes
const SimpleFloatingButton = dynamic(
  () => import('@/components/layout/simple-floating-button').then(mod => mod.SimpleFloatingButton),
  { ssr: false }
);

const TrackingModal = dynamic(
  () => import('@/components/camera/tracking-modal').then(mod => mod.TrackingModal),
  { ssr: false }
);

export default function ClientDashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const {
    clients,
    clientBalances,
    rawVehicles,
    multas
  } = useData();

  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // Cliente actual
  const currentClient = useMemo(() => {
    return clients.find(c => c.userId === currentUser?.uid);
  }, [clients, currentUser]);

  // Balance del cliente
  const clientBalance = useMemo(() => {
    if (!currentClient) return 0;
    const balance = clientBalances.find(cb => cb.id === currentClient.id);
    return balance?.balance || 0;
  }, [currentClient, clientBalances]);

  // Vehículo asignado
  const assignedVehicle = useMemo(() => {
    if (!currentClient) return null;
    return rawVehicles.find(v => v.clientId === currentClient.id && v.status !== 'sold');
  }, [currentClient, rawVehicles]);

  // Calcular KM al próximo mantenimiento
  const kmToNextMaintenance = useMemo(() => {
    if (!assignedVehicle) return 0;
    return Math.max(
      0,
      (assignedVehicle.lastMaintenanceMileage || 0) +
      (assignedVehicle.maintenanceInterval || 5000) -
      (assignedVehicle.currentMileage || 0)
    );
  }, [assignedVehicle]);

  // Verificar si requiere mantenimiento pronto
  const maintenanceDueSoon = useMemo(() => {
    return kmToNextMaintenance < 500 && kmToNextMaintenance > 0;
  }, [kmToNextMaintenance]);

  const maintenanceOverdue = useMemo(() => {
    return kmToNextMaintenance <= 0;
  }, [kmToNextMaintenance]);

  // Multas del cliente (todas las que le corresponden históricamente)
  const clientMultas = useMemo(() => {
    if (!currentClient) return [];
    return multas.filter(m =>
      !m.isDeleted && m.clientId === currentClient.id
    );
  }, [multas, currentClient]);

  // Estadísticas de multas
  const multasStats = useMemo(() => {
    const pendientes = clientMultas.filter(m => m.status === 'pendiente');
    const pagadas = clientMultas.filter(m => m.status === 'pagada');
    const totalPendiente = pendientes.reduce((sum, m) => sum + m.total, 0);
    const totalPagado = pagadas.reduce((sum, m) => sum + m.total, 0);

    return {
      total: clientMultas.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      totalPendiente,
      totalPagado
    };
  }, [clientMultas]);

  // Acciones del botón flotante
  const floatingActions = [
    {
      label: 'Registro de Kilometraje',
      icon: Gauge,
      onClick: () => router.push('/client/mileage'),
      variant: 'default' as const
    },
    {
      label: 'Módulo de Seguimiento',
      icon: Camera,
      onClick: () => {
        if (!assignedVehicle) {
          toast.error('Sin vehículo asignado', {
            description: 'Necesitas tener un vehículo asignado para usar el módulo de seguimiento'
          });
          return;
        }
        setShowTrackingModal(true);
      },
      variant: 'secondary' as const,
      disabled: !assignedVehicle
    }
  ];

  if (!currentClient) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          No se encontró información del cliente. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold">
          Hola, {currentClient.firstname} {currentClient.lastname}
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido a tu panel de control
        </p>
      </motion.div>

      {/* Widgets principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Widget 1: Saldo del Cliente */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/client/payments')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Tu Saldo
            </CardTitle>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${clientBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(clientBalance))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {clientBalance > 0 ? '⚠ Adeudo pendiente' : clientBalance < 0 ? '✓ Saldo a favor' : '✓ Sin adeudo'}
            </p>
            <p className="text-xs text-muted-foreground mt-4 hover:text-primary transition-colors">
              Haz clic para ver tus pagos →
            </p>
          </CardContent>
        </Card>

        {/* Widget 2: Notificaciones de Mantenimiento */}
        <Card className={maintenanceOverdue ? 'border-red-500' : maintenanceDueSoon ? 'border-yellow-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Mantenimiento
            </CardTitle>
            <Wrench className={`h-8 w-8 ${maintenanceOverdue ? 'text-red-600' : maintenanceDueSoon ? 'text-yellow-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            {assignedVehicle ? (
              <>
                <div className="space-y-4">
                  {/* Estado del mantenimiento */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Estado del mantenimiento</p>
                    {maintenanceOverdue ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">¡Mantenimiento Vencido!</span>
                      </div>
                    ) : maintenanceDueSoon ? (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Bell className="h-5 w-5" />
                        <span className="font-semibold">Mantenimiento Próximo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <span className="font-semibold">✓ Al día</span>
                      </div>
                    )}
                  </div>

                  {/* Kilometros restantes */}
                  <div>
                    <p className="text-sm text-muted-foreground">KM al próximo mantenimiento</p>
                    <p className={`text-3xl font-bold ${maintenanceOverdue ? 'text-red-600' : maintenanceDueSoon ? 'text-yellow-600' : 'text-green-600'}`}>
                      {kmToNextMaintenance.toLocaleString()} km
                    </p>
                  </div>

                  {/* Info del vehículo */}
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground">Vehículo asignado</p>
                    <p className="font-semibold text-lg">{assignedVehicle.alias}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignedVehicle.make} {assignedVehicle.model} {assignedVehicle.year}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kilometraje actual: <span className="font-medium">{assignedVehicle.currentMileage?.toLocaleString() || 0} km</span>
                    </p>
                  </div>

                  {/* Botón de acción si requiere mantenimiento */}
                  {(maintenanceOverdue || maintenanceDueSoon) && (
                    <Button
                      className="w-full mt-2"
                      variant={maintenanceOverdue ? 'destructive' : 'default'}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/client/vehicle');
                      }}
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      {maintenanceOverdue ? 'Agendar Mantenimiento Urgente' : 'Ver Detalles'}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Sin vehículo asignado</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Contacta al administrador para que te asignen un vehículo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Widget 3: Multas del Cliente */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/client/multas')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Tus Multas
            </CardTitle>
            <ShieldAlert className={`h-8 w-8 ${multasStats.pendientes > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Multas Pendientes */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Multas pendientes</p>
                <div className={`text-4xl font-bold ${multasStats.pendientes > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {multasStats.pendientes}
                </div>
                {multasStats.pendientes > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(multasStats.totalPendiente)} a pagar
                  </p>
                )}
              </div>

              {/* Estadísticas adicionales */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de multas</span>
                  <span className="font-semibold">{multasStats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Multas pagadas</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-600">{multasStats.pagadas}</span>
                  </div>
                </div>
              </div>

              {/* Mensaje de estado */}
              <div className="pt-2">
                {multasStats.pendientes > 0 ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm font-medium">Tienes multas pendientes</span>
                  </div>
                ) : multasStats.total > 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">✓ Al corriente</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">✓ Sin multas registradas</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 hover:text-primary transition-colors">
              Haz clic para ver detalle →
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional del vehículo */}
      {assignedVehicle && (
        <Card>
          <CardHeader>
            <CardTitle>Información Completa de tu Vehículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Marca</p>
                <p className="font-medium">{assignedVehicle.make}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-medium">{assignedVehicle.model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Año</p>
                <p className="font-medium">{assignedVehicle.year}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Placas</p>
                <p className="font-medium">{assignedVehicle.plate || 'N/A'}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                className="flex-1"
                onClick={() => router.push('/client/vehicle')}
              >
                Ver Detalles Completos
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => router.push('/client/mileage')}
              >
                <Gauge className="mr-2 h-4 w-4" />
                Registrar Kilometraje
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón flotante */}
      <SimpleFloatingButton actions={floatingActions} />

      {/* Modal de seguimiento */}
      {assignedVehicle && (
        <TrackingModal
          open={showTrackingModal}
          onClose={() => setShowTrackingModal(false)}
          vehicleId={assignedVehicle.id}
          vehicleName={assignedVehicle.alias}
        />
      )}
    </div>
  );
}
