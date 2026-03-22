
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    DollarSign, 
    ArrowUp,
    ArrowDown,
    CalendarCheck,
    History,
    User,
    Tag,
    CreditCard,
} from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

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

const eventConfig: Record<TimelineEventType, { icon: React.ComponentType<{className?: string}>, color: string }> = {
    income: { icon: ArrowUp, color: 'bg-red-500' }, // Cargo al cliente
    payment: { icon: ArrowDown, color: 'bg-green-500' }, // Abono del cliente
    expense: { icon: ArrowDown, color: 'bg-green-500' }, // Gasto que es un abono (pago a conductor)
};

export const TransactionTimeline = ({ events }: { events: TimelineEvent[] }) => {
    if (!events || events.length === 0) {
        return (
             <div className="py-12 text-center text-muted-foreground">
                <History className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">Sin Transacciones</h3>
                <p className="mt-1 text-sm text-gray-500">No hay movimientos registrados para esta entidad.</p>
            </div>
        );
    }
    
    return (
        <div className="relative pl-6">
            {/* Vertical Line */}
            <div className="absolute left-[22px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
            
            <div className="space-y-8">
                {events.map((event) => {
                    const { icon: Icon, color } = eventConfig[event.type] || { icon: DollarSign, color: 'bg-gray-400' };
                    const isIncome = event.type === 'income';

                    return (
                        <div key={event.id} className="relative flex items-start">
                            {/* Icon and Dot */}
                            <div className="absolute left-0 top-1.5 flex -translate-x-1/2 items-center">
                                <span className={cn("relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white", color)}>
                                    <Icon className="h-4 w-4" />
                                </span>
                            </div>

                            {/* Content */}
                            <div className="ml-12 w-full">
                                <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1">
                                    <p className="font-semibold text-foreground">{event.title}</p>
                                    <p className={`font-mono font-semibold text-lg ${isIncome ? 'text-destructive' : 'text-green-600'}`}>
                                        {isIncome ? '+' : '-'} {formatCurrency(event.amount)}
                                    </p>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                     <p className="flex items-center gap-1.5 flex-wrap">
                                        <span>{event.description}</span>
                                        {event.userName && (
                                            <>
                                            <span className="text-xs">|</span>
                                            <span className="flex items-center gap-1"><User className="h-3 w-3"/>{event.userName}</span>
                                            </>
                                        )}
                                     </p>
                                     <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                        {event.categoryName && (
                                            <span className="flex items-center gap-1"><Tag className="h-3 w-3"/>{event.categoryName}</span>
                                        )}
                                        {event.paymentMethod && (
                                            <span className="flex items-center gap-1"><CreditCard className="h-3 w-3"/>{event.paymentMethod}</span>
                                        )}
                                     </div>
                                </div>
                                 <div className="text-right text-xs text-muted-foreground/80 mt-1">
                                    <time>{formatDate(event.date)}</time>
                                 </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
