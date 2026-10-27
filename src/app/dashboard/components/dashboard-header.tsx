'use client';

import { Settings, Activity, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardDateFilter } from '@/components/dashboard/components/DashboardDateFilter';
import type { DateRange } from 'react-day-picker';

interface DashboardHeaderProps {
  userName?: string;
  isConfigOpen: boolean;
  onOpenConfig: () => void;
  onDateChange: (range: DateRange | undefined) => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
}

/** Shared classes for secondary actions on the header (PDF / Personalizar). */
const headerActionClass =
  'h-10 gap-2 rounded-xl border-[var(--fe-border-strong)] bg-[var(--fe-control-bg)] px-4 text-xs font-semibold text-[var(--fe-text-secondary)] shadow-[var(--fe-control-shadow)] hover:border-[color-mix(in_srgb,var(--fe-lime)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--fe-lime)_10%,var(--fe-control-bg))] hover:text-[var(--fe-text)]';

export function DashboardHeader({
  userName,
  isConfigOpen,
  onOpenConfig,
  onDateChange,
  onExportPdf,
  isExportingPdf = false,
}: DashboardHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-surface)] px-4 py-5 shadow-[var(--fe-shadow-sm)] sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--fe-lime)_8%,transparent)] blur-[90px]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fe-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" />
            Operación
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.045em] text-[var(--fe-text)] sm:text-[40px] sm:leading-none">
            Dashboard
          </h1>
          <p className="mt-2 truncate text-sm text-[var(--fe-text-muted)]">
            Hola, <span className="text-[var(--fe-text-secondary)]">{userName || '…'}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-control-bg)] p-1 shadow-[var(--fe-control-shadow)] [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[var(--fe-text-muted)]">
            <DashboardDateFilter onDateChange={onDateChange} />
          </div>
          <Button
            variant="outline"
            onClick={onExportPdf}
            disabled={!onExportPdf || isExportingPdf}
            className={headerActionClass}
          >
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <FileText className="h-4 w-4" strokeWidth={1.75} />
            )}
            <span>PDF</span>
          </Button>
          <Button
            variant="outline"
            onClick={onOpenConfig}
            aria-pressed={isConfigOpen}
            className={headerActionClass}
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
            <span>Personalizar</span>
          </Button>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-[var(--fe-border)] pt-3 text-[10px] text-[var(--fe-text-faint)]">
        <Activity className="h-3.5 w-3.5 text-[var(--fe-lime)]" strokeWidth={1.75} />
        <span>Indicadores operativos y financieros</span>
        <span className="hidden text-[var(--fe-text-faint)] sm:inline">Vista general</span>
      </div>
    </header>
  );
}
