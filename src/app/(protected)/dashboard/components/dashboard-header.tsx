'use client';

import { Settings, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardDateFilter } from '@/components/dashboard/components/DashboardDateFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DateRange } from 'react-day-picker';

interface DashboardHeaderProps {
  userName?: string;
  isConfigOpen: boolean;
  onOpenConfig: () => void;
  onDateChange: (range: DateRange | undefined) => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
}

const iconActionClass =
  'h-10 w-10 shrink-0 rounded-xl border-[var(--fe-border-strong)] bg-[var(--fe-control-bg)] p-0 text-[var(--fe-text-secondary)] shadow-[var(--fe-control-shadow)] hover:border-[color-mix(in_srgb,var(--fe-lime)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--fe-lime)_10%,var(--fe-control-bg))] hover:text-[var(--fe-text)] focus-visible:ring-2 focus-visible:ring-[var(--fe-focus-ring)]';

export function DashboardHeader({
  userName,
  isConfigOpen,
  onOpenConfig,
  onDateChange,
  onExportPdf,
  isExportingPdf = false,
}: DashboardHeaderProps) {
  return (
    <header className="relative min-w-0 rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-surface)] px-4 py-4 shadow-[var(--fe-shadow-sm)] sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fe-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" />
            Operación
          </div>
          <h1 className="font-heading text-2xl font-semibold leading-tight tracking-[-0.045em] text-[var(--fe-text)] sm:text-[30px]">
            Dashboard
          </h1>
          <p className="mt-1 truncate text-xs text-[var(--fe-text-muted)] sm:text-sm">
            Hola, <span className="text-[var(--fe-text-secondary)]">{userName || '…'}</span>
          </p>
        </div>

        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-1.5">
            <DashboardDateFilter onDateChange={onDateChange} />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onExportPdf}
                  disabled={!onExportPdf || isExportingPdf}
                  aria-label="Exportar PDF"
                  className={iconActionClass}
                >
                  {isExportingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Exportar PDF</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onOpenConfig}
                  aria-label="Personalizar KPIs"
                  aria-pressed={isConfigOpen}
                  className={iconActionClass}
                >
                  <Settings className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Personalizar KPIs</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
}
