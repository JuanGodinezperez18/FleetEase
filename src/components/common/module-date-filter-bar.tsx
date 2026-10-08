"use client";

import { useCallback } from "react";
import type { DateRange } from "react-day-picker";
import { DashboardDateFilter } from "@/components/dashboard/components/DashboardDateFilter";
import { useDashboardDate } from "@/contexts/dashboard-date-context";

interface ModuleDateFilterBarProps {
  className?: string;
  /** Si se pasa, no usa el contexto compartido y notifica al padre. */
  onDateChange?: (range: DateRange | undefined) => void;
}

/**
 * Mismo control de fechas del Dashboard (semana / mes / año).
 * Por defecto comparte el rango con el dashboard vía DashboardDateProvider.
 */
export function ModuleDateFilterBar({ className = "", onDateChange }: ModuleDateFilterBarProps) {
  const { setDateRange } = useDashboardDate();

  const handleChange = useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range);
      onDateChange?.(range);
    },
    [setDateRange, onDateChange],
  );

  return (
    <div
      className={`w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1 sm:w-auto [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-white/60 ${className}`}
    >
      <DashboardDateFilter onDateChange={handleChange} />
    </div>
  );
}
