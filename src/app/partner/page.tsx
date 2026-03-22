// app/(partner)/page.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar as CalendarIcon,
  ShieldAlert,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { getPartnerVehicleColumns } from './columns';
import { useRouter } from 'next/navigation';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { DashboardDateFilter } from '@/components/dashboard/components/DashboardDateFilter';
import { isWithinInterval } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

type WidgetType = 'balance' | 'income-expense' | 'multas';

interface DashboardWidget {
  id: WidgetType;
  title: string;
  order: number;
}

// Widget Sorteable
function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-4 left-4 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

export default function PartnerDashboard() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const {
    rawVehicles,
    partnerBalances,
    partners,
    financialRecords,
    multas
  } = useData();

  // Estado de filtros de fecha
  const [dateFilterType, setDateFilterType] = useState<'month' | 'week' | 'year' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  // Inicializar rango de fechas
  useEffect(() => {
    const today = new Date();
    setCustomDateRange({
      from: startOfMonth(today),
      to: endOfMonth(today),
    });
  }, []);

  // Estado de orden de widgets
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    { id: 'balance', title: 'Saldo del Socio', order: 0 },
    { id: 'income-expense', title: 'Gastos e Ingresos', order: 1 },
    { id: 'multas', title: 'Multas de tus Vehículos', order: 2 },
  ]);

  // Configurar sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index
        }));
      });
    }
  };

  // Obtener información del socio actual
  const currentPartner = useMemo(() => {
    return partners.find(p => p.userId === currentUser?.uid);
  }, [partners, currentUser]);

  // Balance del socio
  const partnerBalance = useMemo(() => {
    if (!currentPartner) return 0;
    const balance = partnerBalances.find(pb => pb.id === currentPartner.id);
    return balance?.balance || 0;
  }, [currentPartner, partnerBalances]);

  // Vehículos del socio
  const partnerVehicles = useMemo(() => {
    if (!currentPartner) return [];
    return rawVehicles.filter(v =>
      v.partnerId === currentPartner.id && v.status !== 'sold'
    );
  }, [currentPartner, rawVehicles]);

  // IDs de vehículos del socio
  const partnerVehicleIds = useMemo(() => {
    return new Set(partnerVehicles.map(v => v.id));
  }, [partnerVehicles]);

  // Filtrar registros financieros por fecha
  const filteredRecords = useMemo(() => {
    if (!customDateRange?.from || !customDateRange?.to) {
      return financialRecords.filter(r =>
        r.vehicleId && partnerVehicleIds.has(r.vehicleId) && !r.isDeleted
      );
    }

    return financialRecords.filter(r => {
      if (r.isDeleted || !r.vehicleId || !partnerVehicleIds.has(r.vehicleId)) return false;

      const recordDate = infallibleNormalizeDate(r.date);
      if (!recordDate) return false;

      return isWithinInterval(recordDate, {
        start: customDateRange.from!,
        end: customDateRange.to!
      });
    });
  }, [financialRecords, partnerVehicleIds, customDateRange]);

  // Calcular ingresos totales de sus vehículos
  const totalIncome = useMemo(() => {
    return filteredRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [filteredRecords]);

  // Calcular gastos totales de sus vehículos
  const totalExpenses = useMemo(() => {
    return filteredRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [filteredRecords]);

  // Multas de los vehículos del socio
  const partnerMultas = useMemo(() => {
    if (!currentPartner) return [];
    return multas.filter(m =>
      !m.isDeleted && partnerVehicleIds.has(m.vehicleId)
    );
  }, [multas, partnerVehicleIds, currentPartner]);

  // Estadísticas de multas
  const multasStats = useMemo(() => {
    const pendientes = partnerMultas.filter(m => m.status === 'pendiente');
    const pagadas = partnerMultas.filter(m => m.status === 'pagada');
    const totalPendiente = pendientes.reduce((sum, m) => sum + m.total, 0);
    const totalPagado = pagadas.reduce((sum, m) => sum + m.total, 0);

    return {
      total: partnerMultas.length,
      pendientes: pendientes.length,
      pagadas: pagadas.length,
      totalPendiente,
      totalPagado
    };
  }, [partnerMultas]);

  const sortedWidgets = useMemo(() => {
    return [...widgets].sort((a, b) => a.order - b.order);
  }, [widgets]);

  if (!currentPartner) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          No se encontró información del socio. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">
            Bienvenido, {currentPartner.firstname} {currentPartner.lastname}
          </h1>
          <p className="text-muted-foreground mt-1">
            Panel de control de socio
          </p>
        </div>

        {/* Filtro de Fechas */}
        <DashboardDateFilter
          onDateChange={setCustomDateRange}
        />
      </motion.div>

      {/* Widgets con Drag & Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <SortableContext
          items={sortedWidgets.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-6 md:grid-cols-2">
            {sortedWidgets.map((widget) => {
              if (widget.id === 'balance') {
                return (
                  <SortableWidget key={widget.id} id={widget.id}>
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-shadow h-full"
                      onClick={() => router.push('/partner/transactions')}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-12">
                        <CardTitle className="text-xl font-semibold">
                          Saldo del Socio
                        </CardTitle>
                        <DollarSign className="h-8 w-8 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="pl-12">
                        <div className={`text-4xl font-bold ${partnerBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(partnerBalance)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {partnerBalance >= 0 ? '✓ A tu favor' : '⚠ Pendiente de pago'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-4 hover:text-primary transition-colors">
                          Haz clic para ver transacciones →
                        </p>
                      </CardContent>
                    </Card>
                  </SortableWidget>
                );
              }

              if (widget.id === 'income-expense') {
                return (
                  <SortableWidget key={widget.id} id={widget.id}>
                    <Card className="h-full">
                      <CardHeader className="pl-12">
                        <CardTitle className="text-xl font-semibold">
                          Gastos e Ingresos
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          De todos tus vehículos
                        </p>
                      </CardHeader>
                      <CardContent className="pl-12">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Columna de Ingresos */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-green-600">
                              <ArrowUpCircle className="h-5 w-5" />
                              <span className="text-sm font-medium">Ingresos</span>
                            </div>
                            <div className="text-3xl font-bold text-green-600">
                              {formatCurrency(totalIncome)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Total de rentas y pagos
                            </p>
                          </div>

                          {/* Columna de Gastos */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-600">
                              <ArrowDownCircle className="h-5 w-5" />
                              <span className="text-sm font-medium">Gastos</span>
                            </div>
                            <div className="text-3xl font-bold text-red-600">
                              {formatCurrency(totalExpenses)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Mantenimiento y operación
                            </p>
                          </div>
                        </div>

                        {/* Utilidad Neta */}
                        <div className="mt-6 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Utilidad Neta</span>
                            <span className={`text-xl font-bold ${(totalIncome - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(totalIncome - totalExpenses)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </SortableWidget>
                );
              }

              if (widget.id === 'multas') {
                return (
                  <SortableWidget key={widget.id} id={widget.id}>
                    <Card
                      className="h-full cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => router.push('/partner/multas')}
                    >
                      <CardHeader className="pl-12">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-6 w-6 text-yellow-600" />
                          <CardTitle className="text-xl font-semibold">
                            Multas de tus Vehículos
                          </CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Infracciones de tránsito
                        </p>
                      </CardHeader>
                      <CardContent className="pl-12">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Columna de Pendientes */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-yellow-600">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="text-sm font-medium">Pendientes</span>
                            </div>
                            <div className="text-3xl font-bold text-yellow-600">
                              {multasStats.pendientes}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(multasStats.totalPendiente)} a pagar
                            </p>
                          </div>

                          {/* Columna de Pagadas */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-sm font-medium">Pagadas</span>
                            </div>
                            <div className="text-3xl font-bold text-green-600">
                              {multasStats.pagadas}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(multasStats.totalPagado)} histórico
                            </p>
                          </div>
                        </div>

                        {/* Total de Multas */}
                        <div className="mt-6 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Total de Multas</span>
                            <span className="text-xl font-bold text-foreground">
                              {multasStats.total}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-4 hover:text-primary transition-colors">
                          Haz clic para ver detalle →
                        </p>
                      </CardContent>
                    </Card>
                  </SortableWidget>
                );
              }

              return null;
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Tabla de vehículos */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Vehículos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Listado de tus vehículos y su estado actual
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            columns={getPartnerVehicleColumns()}
            data={partnerVehicles}
            mobileCardRenderer={(vehicle) => (
              <Card key={vehicle.id} className="mb-3">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{vehicle.alias}</h3>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.make} {vehicle.model} {vehicle.year}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${vehicle.clientId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {vehicle.clientId ? 'Rentado' : 'Disponible'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Kilometraje</p>
                      <p className="font-medium">{vehicle.currentMileage?.toLocaleString() || 0} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            searchPlaceholder="Buscar vehículo..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
