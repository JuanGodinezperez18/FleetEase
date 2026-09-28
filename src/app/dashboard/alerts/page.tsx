"use client";

import React from "react";
import { useVehicles } from "@/contexts/providers/vehicles-provider";
import { useClients } from "@/contexts/providers/clients-provider";
import { useFinances } from "@/contexts/providers/finances-provider";
import { SmartBusinessAlerts } from "@/components/dashboard/smart-business-alerts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bell } from "lucide-react";

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
          <div>
            <div className="fe-module-eyebrow">Análisis</div>
            <h1 className="fe-module-title">Alertas de negocio</h1>
            <p className="fe-module-subtitle">Notificaciones inteligentes sobre tu operación</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[var(--fe-lime)]">
            <Bell className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </header>

        <section className="rounded-[14px] border border-[color:var(--fe-lime)]/15 bg-[color:var(--fe-lime)]/[0.04] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[var(--fe-lime)]" strokeWidth={1.75} />
            <div>
              <h2 className="font-heading text-sm font-semibold text-white">Análisis automático</h2>
              <p className="mt-1 text-sm fe-text-secondary">
                Clientes morosos, vehículos sin renta, gastos atípicos, mantenimientos vencidos y oportunidades de mejora.
              </p>
            </div>
          </div>
        </section>

        {hasData ? (
          <SmartBusinessAlerts
            vehicles={vehicles}
            clients={clients}
            financialRecords={financialRecords}
            periodDays={30}
          />
        ) : (
          <section className="overflow-hidden fe-panel-bg rounded-[14px] p-5 shadow-[0_18px_50px_rgba(0,0,0,.16)] sm:p-6">
            <h2 className="font-heading text-base font-semibold text-white">Datos insuficientes</h2>
            <p className="mt-1 text-sm fe-text-muted">Registra al menos un vehículo, un cliente y un movimiento financiero.</p>
            <ul className="mt-4 space-y-1.5 text-sm fe-text-secondary">
              <li>· Al menos 1 vehículo</li>
              <li>· Al menos 1 cliente</li>
              <li>· Al menos 1 registro financiero</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="h-11 rounded-xl px-4 text-xs font-semibold">
                <Link href="/dashboard/vehicles">Registrar vehículo</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-[color:var(--fe-border)] bg-transparent text-xs fe-text-secondary hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]"
              >
                <Link href="/dashboard/clients">Registrar cliente</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-[color:var(--fe-border)] bg-transparent text-xs fe-text-secondary hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]"
              >
                <Link href="/dashboard/finanzas">Registrar movimiento</Link>
              </Button>
            </div>
          </section>
        )}

        <section className="overflow-hidden fe-panel-bg rounded-[14px] shadow-[0_18px_50px_rgba(0,0,0,.16)]">
          <div className="border-b border-[color:var(--fe-border)] px-5 py-4">
            <h2 className="font-heading text-base font-semibold fe-text">Tipos de alertas</h2>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            {(
              [
                ["Críticas", "Problemas graves: deuda alta, mantenimientos vencidos, pérdidas.", "bg-rose-400", "text-rose-300"],
                ["Advertencias", "Monitorear: deuda moderada, vehículos sin renta, gastos atípicos.", "bg-amber-400", "text-amber-300"],
                ["Informativas", "Útiles: mantenimientos próximos, baja ocupación.", "bg-sky-400", "text-sky-300"],
                ["Oportunidades", "Mejorar ganancias: vehículos muy rentables, clientes confiables.", "bg-[#d7ff3f]", "text-[var(--fe-lime)]"],
              ] as const
            ).map(([title, desc, dot, text]) => (
              <div key={title} className="rounded-[12px] border border-[color:var(--fe-border)] bg-[color:var(--fe-surface)]/30 p-4">
                <div className={`mb-2 flex items-center gap-2 text-xs font-semibold ${text}`}>
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {title}
                </div>
                <p className="text-sm fe-text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
