"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getISOWeek, getYear, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';
import { useDashboardDate, type DateFilterPreset } from '@/contexts/dashboard-date-context';

interface DashboardDateFilterProps {
  onDateChange: (range: DateRange | undefined) => void;
}

export function DashboardDateFilter({ onDateChange }: DashboardDateFilterProps) {
  const { dateRange, dateFilterPreset, setDateRange, setDateFilterPreset } = useDashboardDate();
  const now = useMemo(() => new Date(), []);
  const currentYear = getYear(now);
  const currentMonth = format(now, 'yyyy-MM');
  const currentWeek = `${currentYear}-W${String(getISOWeek(now)).padStart(2, '0')}`;

  const [activeTab, setActiveTab] = useState<DateFilterPreset>(dateFilterPreset);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  useEffect(() => {
    setActiveTab(dateFilterPreset);
  }, [dateFilterPreset]);

  useEffect(() => {
    if (!dateRange?.from) return;
    const from = dateRange.from;
    if (dateFilterPreset === 'month') setSelectedMonth(format(from, 'yyyy-MM'));
    if (dateFilterPreset === 'year') setSelectedYear(String(getYear(from)));
    if (dateFilterPreset === 'week') {
      setSelectedWeek(`${getYear(from)}-W${String(getISOWeek(from)).padStart(2, '0')}`);
    }
  }, [dateRange?.from, dateFilterPreset]);

  const buildRange = (preset: DateFilterPreset): DateRange => {
    switch (preset) {
      case 'week': {
        const [year, week] = selectedWeek.split('-W').map(Number);
        const anchor = new Date(year, 0, 4);
        const from = startOfWeek(new Date(anchor.getTime() + (week - 1) * 7 * 86400000), { weekStartsOn: 1 });
        return { from, to: endOfWeek(from, { weekStartsOn: 1 }) };
      }
      case 'month': {
        const date = parseISO(`${selectedMonth}-01`);
        return { from: startOfMonth(date), to: endOfMonth(date) };
      }
      case 'year': {
        const date = new Date(Number(selectedYear), 0, 1);
        return { from: startOfYear(date), to: endOfYear(date) };
      }
    }
  };

  const applyRange = (preset: DateFilterPreset) => {
    const range = buildRange(preset);
    setDateFilterPreset(preset);
    setDateRange(range);
    onDateChange(range);
  };

  const fieldClassName =
    'h-10 w-full min-w-0 rounded-xl border border-[var(--fe-border-strong)] bg-[var(--fe-control-bg)] px-3 text-sm font-medium text-[var(--fe-text)] shadow-[var(--fe-control-shadow)] outline-none transition-colors hover:bg-[var(--fe-hover-strong)] focus:border-[color-mix(in_srgb,var(--fe-lime)_45%,transparent)] focus:ring-2 focus:ring-[var(--fe-focus-ring)]';

  const periodLabel = useMemo(() => {
    if (!dateRange?.from) return 'Seleccionar periodo';
    if (dateFilterPreset === 'year') return format(dateRange.from, 'yyyy');
    if (dateFilterPreset === 'week' && dateRange.to) {
      return `${format(dateRange.from, 'd MMM', { locale: es })} – ${format(dateRange.to, 'd MMM yyyy', { locale: es })}`;
    }
    return format(dateRange.from, "MMMM 'de' yyyy", { locale: es });
  }, [dateRange?.from, dateRange?.to, dateFilterPreset]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Cambiar periodo. Periodo actual: ${periodLabel}`}
          title={`Periodo: ${periodLabel}`}
          className="h-10 w-10 shrink-0 rounded-xl border-[var(--fe-border-strong)] bg-[var(--fe-control-bg)] p-0 text-[var(--fe-text-secondary)] shadow-[var(--fe-control-shadow)] hover:border-[color-mix(in_srgb,var(--fe-lime)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--fe-lime)_10%,var(--fe-control-bg))] hover:text-[var(--fe-text)] focus-visible:ring-2 focus-visible:ring-[var(--fe-focus-ring)]"
        >
          <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(92vw,20rem)] space-y-4 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--fe-text)]">Periodo del dashboard</p>
          <p className="text-xs text-[var(--fe-text-muted)]">{periodLabel}</p>
        </div>

        <div
          role="group"
          aria-label="Tipo de periodo"
          className="grid h-10 grid-cols-3 gap-1 rounded-xl border border-[var(--fe-border)] bg-[var(--fe-control-bg)] p-1"
        >
          {([
            ['week', 'Semana'],
            ['month', 'Mes'],
            ['year', 'Año'],
          ] as const).map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              aria-pressed={activeTab === preset}
              onClick={() => {
                setActiveTab(preset);
                applyRange(preset);
              }}
              className="rounded-lg px-2 text-xs font-semibold text-[var(--fe-text-faint)] transition-all hover:bg-[var(--fe-hover-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-focus-ring)] data-[active=true]:bg-[var(--fe-surface)] data-[active=true]:text-[var(--fe-lime)] data-[active=true]:shadow-sm"
              data-active={activeTab === preset}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-w-0">
          {activeTab === 'week' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="week-picker" className="text-xs text-[var(--fe-text-muted)]">Seleccionar semana</Label>
              <input
                id="week-picker"
                type="week"
                value={selectedWeek}
                onChange={(e) => {
                  setSelectedWeek(e.target.value);
                  const [year, week] = e.target.value.split('-W').map(Number);
                  const anchor = new Date(year, 0, 4);
                  const from = startOfWeek(new Date(anchor.getTime() + (week - 1) * 7 * 86400000), { weekStartsOn: 1 });
                  const range = { from, to: endOfWeek(from, { weekStartsOn: 1 }) };
                  setDateRange(range);
                  onDateChange(range);
                }}
                className={fieldClassName}
              />
            </div>
          )}
          {activeTab === 'month' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="month-picker" className="text-xs text-[var(--fe-text-muted)]">Seleccionar mes</Label>
              <input
                id="month-picker"
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  const date = parseISO(`${e.target.value}-01`);
                  const range = { from: startOfMonth(date), to: endOfMonth(date) };
                  setDateRange(range);
                  onDateChange(range);
                }}
                className={fieldClassName}
              />
            </div>
          )}
          {activeTab === 'year' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="year-picker" className="text-xs text-[var(--fe-text-muted)]">Seleccionar año</Label>
              <input
                id="year-picker"
                type="number"
                min="2020"
                max="2100"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  const date = new Date(Number(e.target.value), 0, 1);
                  const range = { from: startOfYear(date), to: endOfYear(date) };
                  setDateRange(range);
                  onDateChange(range);
                }}
                className={fieldClassName}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
