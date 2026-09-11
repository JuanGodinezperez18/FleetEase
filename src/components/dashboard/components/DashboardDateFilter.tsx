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

  const fieldClassName =
    'h-9 w-full min-w-[150px] rounded-xl border border-white/[0.08] bg-[#0b0e13] px-3 text-xs font-medium text-white/75 outline-none transition-colors hover:border-white/[0.14] focus:border-[#d7ff3f]/45 focus:ring-2 focus:ring-[#d7ff3f]/10';

  return (
    <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3 p-1">
      <div className="flex items-center gap-2 px-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_10px_#d7ff3f]" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Periodo</span>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const preset = value as DateFilterPreset;
          setActiveTab(preset);
          applyRange(preset);
        }}
        className="w-full sm:w-auto"
      >
        <TabsList className="grid h-9 w-full grid-cols-3 gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.025] p-0.5 sm:w-[210px]">
          <TabsTrigger value="week" className="rounded-lg px-3 text-[11px] font-semibold text-white/40 transition-all data-[state=active]:bg-white/[0.08] data-[state=active]:text-[#d7ff3f] data-[state=active]:shadow-none">
            Semana
          </TabsTrigger>
          <TabsTrigger value="month" className="rounded-lg px-3 text-[11px] font-semibold text-white/40 transition-all data-[state=active]:bg-white/[0.08] data-[state=active]:text-[#d7ff3f] data-[state=active]:shadow-none">
            Mes
          </TabsTrigger>
          <TabsTrigger value="year" className="rounded-lg px-3 text-[11px] font-semibold text-white/40 transition-all data-[state=active]:bg-white/[0.08] data-[state=active]:text-[#d7ff3f] data-[state=active]:shadow-none">
            Año
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="min-w-0 flex-1 sm:max-w-[190px]">
        {activeTab === 'week' && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="week-picker" className="sr-only">Seleccionar semana</Label>
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
          <div className="flex flex-col gap-1">
            <Label htmlFor="month-picker" className="sr-only">Seleccionar mes</Label>
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
          <div className="flex flex-col gap-1">
            <Label htmlFor="year-picker" className="sr-only">Seleccionar año</Label>
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
    </div>
  );
}
