"use client";

import React from 'react';
import {
  Car,
  User,
  Wrench,
  DollarSign,
  Gauge,
  CalendarCheck,
  History,
} from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

export type TimelineEventType = 'acquisition' | 'assignment' | 'maintenance' | 'mileage' | 'income';

export interface TimelineEvent {
  id: string;
  date: Date;
  type: TimelineEventType;
  title: string;
  description: string;
}

const eventConfig: Record<
  TimelineEventType,
  { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; color: string }
> = {
  acquisition: { icon: CalendarCheck, color: 'bg-sky-500' },
  assignment: { icon: User, color: 'bg-cyan-500' },
  maintenance: { icon: Wrench, color: 'bg-amber-500' },
  mileage: { icon: Gauge, color: 'bg-white/30' },
  income: { icon: DollarSign, color: 'bg-emerald-500' },
};

export const VehicleTimeline = ({ events }: { events: TimelineEvent[] }) => {
  if (!events || events.length === 0) {
    return (
      <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
        <div className="border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="font-heading flex items-center gap-2 text-sm font-semibold text-white">
            <History className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            Historial del vehículo
          </h2>
        </div>
        <div className="px-5 py-10 text-center text-sm text-white/40">
          No hay eventos registrados para este vehículo.
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="font-heading flex items-center gap-2 text-sm font-semibold text-white">
          <History className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
          Historial del vehículo
        </h2>
        <p className="text-xs text-white/40">Línea de tiempo de eventos importantes</p>
      </div>
      <div className="p-5">
        <div className="relative pl-6">
          <div className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-white/10" />
          <div className="space-y-6">
            {events.map(event => {
              const { icon: Icon, color } =
                eventConfig[event.type] || { icon: Car, color: 'bg-white/20' };
              return (
                <div key={event.id} className="relative flex items-start">
                  <div className="absolute left-0 top-0.5 flex -translate-x-1/2 items-center">
                    <span
                      className={cn(
                        'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white',
                        color
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                  </div>
                  <div className="ml-8 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-heading text-sm font-semibold text-white/90">{event.title}</p>
                      <time className="text-[11px] text-white/35">{formatDate(event.date)}</time>
                    </div>
                    <p className="mt-0.5 text-sm text-white/45">{event.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
