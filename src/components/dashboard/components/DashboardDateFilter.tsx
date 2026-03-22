// src/components/dashboard/components/DashboardDateFilter.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  getISOWeek, getYear, format, parseISO, getWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import type { DateRange } from 'react-day-picker';
import { useDashboardDate, type DateFilterPreset } from '@/contexts/dashboard-date-context';

interface DashboardDateFilterProps {
  onDateChange: (range: DateRange | undefined) => void;
}

export function DashboardDateFilter({ onDateChange }: DashboardDateFilterProps) {
  const { dateRange, dateFilterPreset, setDateRange, setDateFilterPreset } = useDashboardDate();
  const [activeTab, setActiveTab] = useState<DateFilterPreset>(dateFilterPreset);

  // Estados para los valores de los inputs nativos
  const now = new Date();
  const currentYear = getYear(now);
  const currentMonth = format(now, 'yyyy-MM');
  const currentWeek = `${currentYear}-W${String(getISOWeek(now)).padStart(2, '0')}`;

  const [selectedWeek, setSelectedWeek] = useState<string>(currentWeek);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  // Sincronizar con el contexto cuando cambie el preset
  useEffect(() => {
    setActiveTab(dateFilterPreset);
  }, [dateFilterPreset]);

  // Sincronizar los selectores con el contexto
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const from = dateRange.from;
      if (activeTab === 'month') {
        setSelectedMonth(format(from, 'yyyy-MM'));
      } else if (activeTab === 'year') {
        setSelectedYear(getYear(from).toString());
      } else if (activeTab === 'week') {
        const year = getYear(from);
        const week = getISOWeek(from);
        setSelectedWeek(`${year}-W${String(week).padStart(2, '0')}`);
      }
    }
  }, [dateRange, activeTab]);

  useEffect(() => {
    let from: Date, to: Date;

    switch (activeTab) {
      case 'week': {
        // Parsear el formato de semana ISO: "2024-W01"
        const [year, weekStr] = selectedWeek.split('-W').map(Number);

        // Calcular el primer día del año y encontrar el primer lunes
        const firstDayOfYear = new Date(year, 0, 1);
        const firstMonday = startOfWeek(firstDayOfYear, { weekStartsOn: 1 });

        // Si el primer día del año es después del primer lunes, ajustar
        const daysOffset = (weekStr - 1) * 7;
        from = new Date(firstMonday);
        from.setDate(from.getDate() + daysOffset);

        // Asegurar que el lunes es realmente lunes
        if (from.getDay() !== 1) {
          from = startOfWeek(from, { weekStartsOn: 1 });
        }

        to = endOfWeek(from, { weekStartsOn: 1 });
        break;
      }
      case 'month': {
        // Parsear el formato de mes: "2024-01"
        const date = parseISO(`${selectedMonth}-01`);
        from = startOfMonth(date);
        to = endOfMonth(date);
        break;
      }
      case 'year': {
        from = startOfYear(new Date(Number(selectedYear), 0, 1));
        to = endOfYear(new Date(Number(selectedYear), 0, 1));
        break;
      }
    }

    const range = { from, to };
    setDateRange(range);
    setDateFilterPreset(activeTab);
    onDateChange(range);
  }, [activeTab, selectedWeek, selectedMonth, selectedYear, onDateChange, setDateRange, setDateFilterPreset]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DateFilterPreset)} className="w-full sm:w-auto">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mes</TabsTrigger>
          <TabsTrigger value="year">Año</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="w-full sm:w-auto">
        {activeTab === 'week' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="week-picker" className="text-xs text-muted-foreground">
              Seleccionar semana (Lunes - Domingo)
            </Label>
            <input
              id="week-picker"
              type="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}

        {activeTab === 'month' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="month-picker" className="text-xs text-muted-foreground">
              Seleccionar mes completo
            </Label>
            <input
              id="month-picker"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}

        {activeTab === 'year' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="year-picker" className="text-xs text-muted-foreground">
              Seleccionar año completo
            </Label>
            <input
              id="year-picker"
              type="number"
              min="2020"
              max="2030"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
