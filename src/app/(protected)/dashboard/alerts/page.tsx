"use client";

import React from "react";
import { useVehicles } from "@/contexts/providers/vehicles-provider";
import { useClients } from "@/contexts/providers/clients-provider";
import { useFinances } from "@/contexts/providers/finances-provider";
import { SmartBusinessAlerts } from "@/components/dashboard/smart-business-alerts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell } from "lucide-react";
import { InfoTip } from "@/components/ui/info-tip";

export default function AlertsPage() {
  const { vehicles = [] } = useVehicles();
  const { clients = [] } = useClients();
  const { financialRecords = [] } = useFinances();

  const hasData = vehicles.length > 0 && clients.length > 0 && financialRecords.length > 0;

  return (
    <div className="fe-page-shell space-y-5 sm:space-y-6">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="fe-module-header">
          <div className="min-w-0 flex-1">
            <div className="fe-module-eyebrow">Análisis</div>
            <h1 className="fe-module-title">Alertas de negocio</h1>
            <p className="fe-module-subtitle">Notificaciones inteligentes sobre tu operación</p>
          </div>
          <div className="fe-module-actions items-center gap-2">
            <InfoTip
              title="Análisis automático"
              label="Qué detectan las alertas"
              size="md"
            >
              <p>
                Clientes morosos, vehículos sin renta, gastos atípicos, mantenimientos vencidos y
                oportunidades de mejora.
              </p>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <span className="font-medium text-rose-500">Críticas:</span> deuda alta,
                  mantenimientos vencidos, pérdidas.
                </li>
                <li>
                  <span className="font-medium text-amber-500">Advertencias:</span> deuda moderada,
                  sin renta, gastos atípicos.
                </li>
                <li>
                  <span className="font-medium text-sky-500">Informativas:</span> mantenimientos
                  próximos, baja ocupación.
                </li>
                <li>
                  <span className="font-medium text-[var(--fe-lime-text)]">Oportunidades:</span>{' '}
                  vehículos muy rentables, clientes confiables.
                </li>
              </ul>
            </InfoTip>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--fe-lime)]/20 bg-[color:var(--fe-lime)]/[0.08] text-[var(--fe-lime)]">
              <Bell className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
        </header>

        {hasData ? (
          <SmartBusinessAlerts
            vehicles={vehicles}
            clients={clients}
            financialRecords={financialRecords}
            periodDays={30}
          />
        ) : (
          <section className="overflow-hidden rounded-[14px] border border-[var(--fe-border)] bg-[var(--fe-surface)] p-5 shadow-[var(--fe-shadow-sm)] sm:p-6">
            <h2 className="font-heading text-base font-semibold text-[var(--fe-text)]">
              Datos insuficientes
            </h2>
            <p className="mt-1 text-sm text-[var(--fe-text-muted)]">
              Registra al menos un vehículo, un cliente y un movimiento financiero.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="h-11 rounded-xl px-4 text-xs font-semibold">
                <Link href="/dashboard/vehicles">Registrar vehículo</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl text-xs">
                <Link href="/dashboard/clients">Registrar cliente</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl text-xs">
                <Link href="/dashboard/finanzas">Registrar movimiento</Link>
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
