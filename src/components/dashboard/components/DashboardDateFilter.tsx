"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getISOWeek, getYear, format, parseISO } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
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

  // Solo sincroniza el estado visual cuando cambia externamente el preset.
  // No recalculamos el rango en un efecto dependiente del propio rango:
  // eso provocaba ciclos que hacían saltar Semana/Año sin interacción del usuario.
  useEffect(() => {
    setActiveTab(dateFilterPreset);
  }, [dateFilterPreset]);

  // Inicializar los valores desde un rango existente solo una vez por cambio real de preset.
  useEffect(() => {
    if (!dateRange?.from) return;
    const from = dateRange.from;
    if (dateFilterPreset === 'month') setSelectedMonth(format(from, 'yyyy-MM'));
    if (dateFilterPreset === 'year') setSelectedYear(String(getYear(from)));
    if (dateFilterPreset === 'week') {
      setSelectedWeek(`${getYear(from)}-W${String(getISOWeek(from)).padStart(2, '0')}`);
    }
  }, [dateFilterPreset]);

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

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const preset = value as DateFilterPreset;
          setActiveTab(preset);
          applyRange(preset);
        }}
        className="w-full sm:w-auto"
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mes</TabsTrigger>
          <TabsTrigger value="year">Año</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="w-full sm:w-auto">
        {activeTab === 'week' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="week-picker" className="text-xs text-muted-foreground">Seleccionar semana (Lunes - Domingo)</Label>
            <input id="week-picker" type="week" value={selectedWeek} onChange={(e) => { setSelectedWeek(e.target.value); const [year, week] = e.target.value.split('-W').map(Number); const anchor = new Date(year, 0, 4); const from = startOfWeek(new Date(anchor.getTime() + (week - 1) * 7 * 86400000), { weekStartsOn: 1 }); const range = { from, to: endOfWeek(from, { weekStartsOn: 1 }) }; setDateRange(range); onDateChange(range); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        )}
        {activeTab === 'month' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="month-picker" className="text-xs text-muted-foreground">Seleccionar mes completo</Label>
            <input id="month-picker" type="month" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); const date = parseISO(`${e.target.value}-01`); const range = { from: startOfMonth(date), to: endOfMonth(date) }; setDateRange(range); onDateChange(range); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        )}
        {activeTab === 'year' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="year-picker" className="text-xs text-muted-foreground">Seleccionar año completo</Label>
            <input id="year-picker" type="number" min="2020" max="2100" value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); const date = new Date(Number(e.target.value), 0, 1); const range = { from: startOfYear(date), to: endOfYear(date) }; setDateRange(range); onDateChange(range); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        )}
      </div>
    </div>
  );
}
