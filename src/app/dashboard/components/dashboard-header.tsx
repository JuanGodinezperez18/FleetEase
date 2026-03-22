'use client';

import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard General</h1>
        <p className="text-muted-foreground">Bienvenido, {userName || 'Usuario'}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <DashboardDateFilter onDateChange={onDateChange} />
        <Button
          variant="outline"
          onClick={onOpenConfig}
          className="gap-2 w-full sm:w-auto"
          aria-pressed={isConfigOpen}
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Personalizar</span>
        </Button>
      </div>
    </div>
  );
}
