/**
 * Alertas de Negocio Inteligentes
 */

"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import type { Vehicle, Client, FinancialRecord } from "@/types";
import Link from "next/link";
import { getMaintenanceIntervalKm, calculateNetProfit, calculateProfitMargin, sumRentalIncome, sumExpense } from "@/lib/financial-metrics";
import { MetricCard } from "@/components/dashboard/components/MetricCard";
import { cn } from "@/lib/utils";

interface BusinessAlert {
  id: string;
  type: "critical" | "warning" | "info" | "opportunity";
  category: "client" | "vehicle" | "finance" | "maintenance";
  title: string;
  description: string;
  impact: string;
  action?: { label: string; href: string };
  data?: any;
}

interface SmartBusinessAlertsProps {
  vehicles: Vehicle[];
  clients: Client[];
  financialRecords: FinancialRecord[];
  periodDays?: number;
}

const TYPE_STYLES: Record<
  BusinessAlert["type"],
  { border: string; bg: string; badge: string; icon: string }
> = {
  critical: {
    border: "border-l-rose-400 border-rose-400/20",
    bg: "bg-rose-400/[0.04]",
    badge: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    icon: "text-rose-300",
  },
  warning: {
    border: "border-l-amber-400 border-amber-400/20",
    bg: "bg-amber-400/[0.04]",
    badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    icon: "text-amber-300",
  },
  info: {
    border: "border-l-sky-400 border-sky-400/20",
    bg: "bg-sky-400/[0.04]",
    badge: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    icon: "text-sky-300",
  },
  opportunity: {
    border: "border-l-[#d7ff3f] border-[#d7ff3f]/20",
    bg: "bg-[#d7ff3f]/[0.04]",
    badge: "border-[#d7ff3f]/20 bg-[#d7ff3f]/10 text-[#d7ff3f]",
    icon: "text-[#d7ff3f]",
  },
};

const TYPE_LABELS: Record<BusinessAlert["type"], string> = {
  critical: "Crítico",
  warning: "Advertencia",
  info: "Informativo",
  opportunity: "Oportunidad",
};

function AlertIcon({ type }: { type: BusinessAlert["type"] }) {
  const cls = cn("h-5 w-5", TYPE_STYLES[type].icon);
  switch (type) {
    case "critical":
      return <AlertTriangle className={cls} strokeWidth={1.75} />;
    case "warning":
      return <AlertCircle className={cls} strokeWidth={1.75} />;
    case "info":
      return <Clock className={cls} strokeWidth={1.75} />;
    case "opportunity":
      return <TrendingUp className={cls} strokeWidth={1.75} />;
    default:
      return <AlertCircle className={cls} strokeWidth={1.75} />;
  }
}

export function SmartBusinessAlerts({
  vehicles,
  clients,
  financialRecords,
  periodDays = 30,
}: SmartBusinessAlertsProps) {
  const alerts: BusinessAlert[] = useMemo(() => {
    const generatedAlerts: BusinessAlert[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    clients.forEach(client => {
      if (client.balance > 5000) {
        generatedAlerts.push({
          id: `client-debt-${client.id}`,
          type: "critical",
          category: "client",
          title: `Cliente con deuda alta: ${client.firstname} ${client.lastname}`,
          description: `Saldo pendiente de $${client.balance.toLocaleString("es-MX")}`,
          impact: "Riesgo alto de no pago. Acción inmediata recomendada.",
          action: { label: "Ver cliente", href: `/dashboard/clients/${client.id}` },
          data: { balance: client.balance, clientId: client.id },
        });
      } else if (client.balance > 2000) {
        generatedAlerts.push({
          id: `client-debt-warning-${client.id}`,
          type: "warning",
          category: "client",
          title: `Cliente con deuda moderada: ${client.firstname} ${client.lastname}`,
          description: `Saldo pendiente de $${client.balance.toLocaleString("es-MX")}`,
          impact: "Monitorear de cerca. Contactar si supera $5,000.",
          action: { label: "Ver cliente", href: `/dashboard/clients/${client.id}` },
          data: { balance: client.balance, clientId: client.id },
        });
      }
    });

    // Index recent financial records once so vehicle alerts and profitability
    // do not repeatedly scan the full financialRecords array.
    const recentRecordsByVehicle = new Map<string, FinancialRecord[]>();
    const recentExpenseRecords: FinancialRecord[] = [];
    let recentExpenseTotal = 0;

    financialRecords.forEach(record => {
      if (new Date(record.date) < cutoffDate) return;

      if (record.vehicleId) {
        const records = recentRecordsByVehicle.get(record.vehicleId);
        if (records) records.push(record);
        else recentRecordsByVehicle.set(record.vehicleId, [record]);
      }

      if (record.type === "expense") {
        recentExpenseRecords.push(record);
        recentExpenseTotal += record.amount || 0;
      }
    });

    const activeVehicles = vehicles.filter(v => v.status === "active" && !v.isDeleted);
    activeVehicles.forEach(vehicle => {
      const vehicleRecords = recentRecordsByVehicle.get(vehicle.id) ?? [];
      const vehicleIncomeRecords = vehicleRecords.filter(r => r.type === "income");

      if (vehicleIncomeRecords.length === 0) {
        generatedAlerts.push({
          id: `vehicle-idle-${vehicle.id}`,
          type: "warning",
          category: "vehicle",
          title: `Vehículo sin ingresos: ${vehicle.alias || vehicle.plate}`,
          description: "Sin ingresos en los últimos 30 días",
          impact: "Pérdida de ingresos potenciales.",
          action: { label: "Ver vehículo", href: `/dashboard/vehicles/${vehicle.id}` },
          data: { vehicleId: vehicle.id, daysIdle: 30 },
        });
      } else if (vehicleIncomeRecords.length <= 2) {
        generatedAlerts.push({
          id: `vehicle-low-occupancy-${vehicle.id}`,
          type: "info",
          category: "vehicle",
          title: `Baja ocupación: ${vehicle.alias || vehicle.plate}`,
          description: "Pocas rentas en el último mes",
          impact: "Oportunidad de mejora en ocupación.",
          action: { label: "Ver vehículo", href: `/dashboard/vehicles/${vehicle.id}` },
          data: { vehicleId: vehicle.id, rentalCount: vehicleIncomeRecords.length },
        });
      }
    });

    recentExpenseRecords.forEach(record => {
      // Equivalent to averaging all other expenses, without rescanning the
      // entire expense list for every record.
      const otherExpenseCount = recentExpenseRecords.length - 1;
      const otherExpenseTotal = recentExpenseTotal - (record.amount || 0);
      const avgOtherExpense =
        otherExpenseCount > 0 ? otherExpenseTotal / otherExpenseCount : 0;
      if (record.amount && avgOtherExpense > 0 && record.amount > avgOtherExpense * 2 && record.amount > 5000) {
        generatedAlerts.push({
          id: `expense-spike-${record.id}`,
          type: "warning",
          category: "finance",
          title: `Gasto atípico: $${record.amount.toLocaleString("es-MX")}`,
          description: `${Math.round((record.amount / avgOtherExpense) * 100)}% mayor al promedio`,
          impact: "Puede afectar la rentabilidad.",
          action: { label: "Ver gasto", href: `/dashboard/finanzas?transaction=${record.id}` },
          data: { recordId: record.id, amount: record.amount, avgExpense: avgOtherExpense },
        });
      }
    });

    vehicles
      .filter(v => !v.isDeleted && v.status !== "sold")
      .forEach(vehicle => {
        const vehicleRecords = recentRecordsByVehicle.get(vehicle.id) ?? [];
        const income = sumRentalIncome(vehicleRecords);
        const expenses = sumExpense(vehicleRecords);
        const netProfit = calculateNetProfit(vehicleRecords);
        const margin = calculateProfitMargin(income, expenses);

        if (margin > 50 && income > 10000) {
          generatedAlerts.push({
            id: `vehicle-high-profit-${vehicle.id}`,
            type: "opportunity",
            category: "vehicle",
            title: `Muy rentable: ${vehicle.alias || vehicle.plate}`,
            description: `Margen ${margin.toFixed(0)}% ($${netProfit.toLocaleString("es-MX")})`,
            impact: "Considera ajustar precio para maximizar ganancias.",
            action: { label: "Ver vehículo", href: `/dashboard/vehicles/${vehicle.id}` },
            data: { vehicleId: vehicle.id, margin, netProfit },
          });
        }
      });

    vehicles
      .filter(v => !v.isDeleted && v.status !== "sold" && v.currentMileage)
      .forEach(vehicle => {
        const maintenanceInterval = getMaintenanceIntervalKm(vehicle);
        const nextMaintenance = (vehicle.lastMaintenanceMileage || 0) + maintenanceInterval;
        const kmToMaintenance = nextMaintenance - vehicle.currentMileage;

        if (kmToMaintenance < 500 && kmToMaintenance > 0) {
          generatedAlerts.push({
            id: `maintenance-soon-${vehicle.id}`,
            type: "info",
            category: "maintenance",
            title: `Mantenimiento próximo: ${vehicle.alias || vehicle.plate}`,
            description: `Faltan ${kmToMaintenance} km`,
            impact: "Programa el servicio para evitar daños.",
            action: { label: "Ver vehículo", href: `/dashboard/vehicles/${vehicle.id}` },
            data: { vehicleId: vehicle.id, kmToMaintenance },
          });
        } else if (kmToMaintenance <= 0) {
          generatedAlerts.push({
            id: `maintenance-overdue-${vehicle.id}`,
            type: "critical",
            category: "maintenance",
            title: `Mantenimiento vencido: ${vehicle.alias || vehicle.plate}`,
            description: `Vencido por ${Math.abs(kmToMaintenance)} km`,
            impact: "Riesgo de fallas. Programa servicio urgente.",
            action: { label: "Ver vehículo", href: `/dashboard/vehicles/${vehicle.id}` },
            data: { vehicleId: vehicle.id, kmOverdue: Math.abs(kmToMaintenance) },
          });
        }
      });

    const priorityOrder = { critical: 0, warning: 1, info: 2, opportunity: 3 };
    return generatedAlerts.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
  }, [vehicles, clients, financialRecords, periodDays]);

  const alertCounts = useMemo(
    () => ({
      critical: alerts.filter(a => a.type === "critical").length,
      warning: alerts.filter(a => a.type === "warning").length,
      info: alerts.filter(a => a.type === "info").length,
      opportunity: alerts.filter(a => a.type === "opportunity").length,
    }),
    [alerts]
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Críticas"
          value={String(alertCounts.critical)}
          description="Atención inmediata"
          icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.75} />}
          variant="danger"
        />
        <MetricCard
          title="Advertencias"
          value={String(alertCounts.warning)}
          description="Monitorear"
          icon={<AlertCircle className="h-5 w-5" strokeWidth={1.75} />}
          variant="warning"
        />
        <MetricCard
          title="Informativas"
          value={String(alertCounts.info)}
          description="Para tu conocimiento"
          icon={<Clock className="h-5 w-5" strokeWidth={1.75} />}
        />
        <MetricCard
          title="Oportunidades"
          value={String(alertCounts.opportunity)}
          description="Mejorar ganancias"
          icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />}
          variant="success"
        />
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map(alert => {
            const style = TYPE_STYLES[alert.type];
            return (
              <article
                key={alert.id}
                className={cn(
                  "overflow-hidden rounded-[16px] border border-l-4 border-white/[0.07] p-4 sm:p-5",
                  style.border,
                  style.bg
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="mt-0.5 shrink-0">
                      <AlertIcon type={alert.type} />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-sm font-semibold text-white sm:text-base">
                          {alert.title}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            style.badge
                          )}
                        >
                          {TYPE_LABELS[alert.type]}
                        </span>
                      </div>
                      <p className="text-sm text-white/55">{alert.description}</p>
                      <p className="mt-2 text-xs text-white/35">
                        <span className="text-white/50">Impacto:</span> {alert.impact}
                      </p>
                    </div>
                  </div>
                  {alert.action && (
                    <Button
                      asChild
                      size="sm"
                      className={cn(
                        "h-9 shrink-0 rounded-xl text-xs font-semibold",
                        alert.type === "critical"
                          ? "bg-rose-500 text-white hover:bg-rose-600"
                          : "border border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.08] hover:text-white"
                      )}
                    >
                      <Link href={alert.action.href}>
                        {alert.action.label}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                      </Link>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-white/[0.07] bg-[#0e1117] py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <CheckCircle className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h3 className="font-heading text-lg font-semibold text-white">Todo en orden</h3>
          <p className="mt-1 max-w-sm text-sm text-white/40">
            No hay alertas de negocio en este momento.
          </p>
        </div>
      )}
    </div>
  );
}
