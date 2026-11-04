"use client";

import React from 'react';
import { ArrowDown, ArrowUp, CreditCard, DollarSign, History, Tag, User } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { formatCurrency, cn } from '@/lib/utils';

export type TimelineEventType = 'income' | 'expense' | 'payment';

export interface TimelineEvent {
  id: string;
  date: Date;
  type: TimelineEventType;
  title: string;
  description: string;
  amount: number;
  userName?: string;
  categoryName?: string;
  paymentMethod?: string;
}

const eventConfig: Record<
  TimelineEventType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  income: { icon: ArrowUp, color: 'bg-red-500' },
  payment: { icon: ArrowDown, color: 'bg-green-500' },
  expense: { icon: ArrowDown, color: 'bg-orange-500' },
};

export const TransactionTimeline = ({ events }: { events: TimelineEvent[] }) => {
  if (!events || events.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-2 text-sm font-medium">Sin transacciones</h3>
        <p className="mt-1 text-sm text-muted-foreground/80">
          No hay movimientos registrados para este cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[22px] top-0 h-full w-0.5 -translate-x-1/2 bg-border" />

      <div className="space-y-8">
        {events.map((event) => {
          const config =
            eventConfig[event.type] ?? { icon: DollarSign, color: 'bg-muted-foreground' };
          const Icon = config.icon;
          const isIncome = event.type === 'income';

          return (
            <div
              key={event.id}
              className="relative flex items-start motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
            >
              <div className="absolute left-0 top-1.5 flex -translate-x-1/2 items-center">
                <span
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white',
                    config.color
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>

              <div className="ml-12 w-full min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="font-semibold text-foreground">{event.title}</p>
                  <p
                    className={cn(
                      'font-mono text-lg font-semibold tabular-nums',
                      isIncome ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {isIncome ? '+' : '−'} {formatCurrency(event.amount)}
                  </p>
                </div>

                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span>{event.description}</span>
                    {event.userName && (
                      <>
                        <span className="text-xs text-muted-foreground/60">|</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {event.userName}
                        </span>
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {event.categoryName && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {event.categoryName}
                      </span>
                    )}
                    {event.paymentMethod && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {event.paymentMethod}
                      </span>
                    )}
                    <time>{formatDate(event.date)}</time>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
