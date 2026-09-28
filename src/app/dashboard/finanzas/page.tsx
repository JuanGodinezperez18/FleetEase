"use client";

import React, { useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { useFinances } from "@/contexts/providers/finances-provider";
import { useVehicles } from "@/contexts/providers/vehicles-provider";
import { useClients } from "@/contexts/providers/clients-provider";
import { useData } from "@/contexts/data-provider";
import { useFinancialAnalytics } from "@/hooks/use-financial-analytics";
import { FinancialDashboard } from "./components/financial-dashboard";
import { GlobalLoader } from "@/components/common/GlobalLoader";
import { FinancialAdvancedFilters } from "./components/financial-advanced-filters";
import type { DateRange } from "react-day-picker";
import { BarChart3 } from "lucide-react";

export default function FinancialAnalysisPage() {
  const { financialRecords, financialCategories, loading: loadingFinances } = useFinances();
  const { vehicles, vehiclesLoading } = useVehicles();
  const { clients, credits, loading: loadingClients } = useClients();
  const { companies, partners } = useData();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | "all">("all");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | "all">("all");
  const loadingData = loadingFinances || vehiclesLoading || loadingClients;

  const filteredRecords = React.useMemo(() => {
    return financialRecords.filter(record => {
      if (selectedCompanyId !== "all" && record.companyId !== selectedCompanyId) return false;
      if (selectedPartnerId !== "all") {
        if (selectedPartnerId === "none" && record.partnerId) return false;
        if (selectedPartnerId !== "none" && record.partnerId !== selectedPartnerId) return false;
      }
      if (dateRange?.from || dateRange?.to) {
        const recordDate = new Date(record.date);
        if (dateRange.from && recordDate < dateRange.from) return false;
        if (dateRange.to && recordDate > dateRange.to) return false;
      }
      return true;
    });
  }, [financialRecords, dateRange, selectedCompanyId, selectedPartnerId]);

  const analytics = useFinancialAnalytics(
    filteredRecords,
    clients,
    vehicles,
    partners,
    dateRange,
    financialCategories
  );

  if (loadingData) return <GlobalLoader />;

  return (
    <div className="fe-page-shell space-y-5 sm:space-y-6">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] fe-text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" />
              Finanzas
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] fe-text sm:text-3xl">
              Análisis financiero
            </h1>
            <p className="mt-1 text-sm fe-text-muted">
              Resumen ejecutivo del rendimiento de la flota
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--fe-lime)]/15 bg-[color:var(--fe-lime)]/[0.08] text-[var(--fe-lime)]">
            <BarChart3 className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </header>

        <section className="fe-panel-bg rounded-[14px] p-4 shadow-[0_18px_50px_rgba(0,0,0,.16)] sm:p-5">
          <FinancialAdvancedFilters
            companies={companies}
            partners={partners}
            onDateChange={setDateRange}
            onCompanyChange={setSelectedCompanyId}
            onPartnerChange={setSelectedPartnerId}
          />
        </section>

        <FinancialDashboard analytics={analytics} />
      </div>
    </div>
  );
}
