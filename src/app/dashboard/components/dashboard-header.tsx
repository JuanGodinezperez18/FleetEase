'use client';

import { Settings, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardDateFilter } from '@/components/dashboard/components/DashboardDateFilter';
import type { DateRange } from 'react-day-picker';

interface DashboardHeaderProps {
  userName?: string;
  isConfigOpen: boolean;
  onOpenConfig: () => void;
  onDateChange: (range: DateRange | undefined) => void;
}

export function DashboardHeader({
  userName,
  isConfigOpen,
  onOpenConfig,
  onDateChange,
}: DashboardHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0e1117] px-4 py-4 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:rounded-[26px] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-[#d7ff3f]/[0.07] blur-[80px]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Operación
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-[38px] sm:leading-none">
            Dashboard
          </h1>
          <p className="mt-1.5 truncate text-sm text-white/40">
            Hola, <span className="text-white/70">{userName || '…'}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1 [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-white/60">
            <DashboardDateFilter onDateChange={onDateChange} />
          </div>
          <Button
            variant="outline"
            onClick={onOpenConfig}
            aria-pressed={isConfigOpen}
            className="h-10 gap-2 rounded-xl border-white/[0.1] bg-white/[0.035] px-4 text-xs font-semibold text-white/70 hover:border-[#d7ff3f]/30 hover:bg-[#d7ff3f]/[0.06] hover:text-[#d7ff3f]"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
            <span>Personalizar</span>
          </Button>
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[10px] text-white/30">
        <Activity className="h-3.5 w-3.5 text-[#d7ff3f]" strokeWidth={1.75} />
        <span>Indicadores en tiempo real</span>
      </div>
    </header>
  );
}
