

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Car, 
    User, 
    Wrench, 
    DollarSign, 
    Gauge,
    CalendarCheck,
    History
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

const eventConfig: Record<TimelineEventType, { icon: React.ComponentType<{className?: string}>, color: string }> = {
    acquisition: { icon: CalendarCheck, color: 'bg-blue-500' },
    assignment: { icon: User, color: 'bg-cyan-500' },
    maintenance: { icon: Wrench, color: 'bg-amber-500' },
    mileage: { icon: Gauge, color: 'bg-gray-500' },
    income: { icon: DollarSign, color: 'bg-green-500' },
};

export const VehicleTimeline = ({ events }: { events: TimelineEvent[] }) => {
    if (!events || events.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><History className="mr-2"/> Historial del Vehículo</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No hay eventos registrados para este vehículo.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><History className="mr-2"/> Historial del Vehículo</CardTitle>
                <CardDescription>Una línea de tiempo de todos los eventos importantes en la vida del vehículo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6">
                    {/* Vertical Line */}
                    <div className="absolute left-[34px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                    
                    <div className="space-y-8">
                        {events.map((event, index) => {
                            const { icon: Icon, color } = eventConfig[event.type] || { icon: Car, color: 'bg-gray-400' };
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
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-foreground">{event.title}</p>
                                            <time className="text-sm text-muted-foreground">{formatDate(event.date)}</time>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
