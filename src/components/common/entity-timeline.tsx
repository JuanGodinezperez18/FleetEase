
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  DollarSign,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

export type TimelineEventType = 
  | 'created'
  | 'payment'
  | 'credit_approved'
  | 'credit_paid'
  | 'balance_change'
  | 'vehicle_assigned'
  | 'vehicle_returned'
  | 'note'
  | 'income'
  | 'expense';

export interface TimelineEvent {
  id: string;
  date: Date | string;
  type: TimelineEventType;
  title: string;
  description: string;
  amount?: number;
  metadata?: Record<string, any>;
}

interface EntityTimelineProps {
  events: TimelineEvent[];
  entityType?: 'client' | 'partner' | 'vehicle';
}

const eventConfig: Record<TimelineEventType, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  created: { 
    icon: Calendar, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-500' 
  },
  payment: { 
    icon: DollarSign, 
    color: 'text-green-600', 
    bgColor: 'bg-green-500' 
  },
  credit_approved: { 
    icon: CreditCard, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-500' 
  },
  credit_paid: { 
    icon: CheckCircle, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-500' 
  },
  balance_change: { 
    icon: TrendingUp, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-500' 
  },
  vehicle_assigned: { 
    icon: User, 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-500' 
  },
  vehicle_returned: { 
    icon: CheckCircle, 
    color: 'text-teal-600', 
    bgColor: 'bg-teal-500' 
  },
  note: { 
    icon: FileText, 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-500' 
  },
  income: { 
    icon: TrendingUp, 
    color: 'text-green-600', 
    bgColor: 'bg-green-500' 
  },
  expense: { 
    icon: AlertCircle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-500' 
  },
};

export const EntityTimeline = ({ events, entityType = 'client' }: EntityTimelineProps) => {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [events]);

  if (!sortedEvents || sortedEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historial de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay eventos registrados aún
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Historial de Actividad
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {sortedEvents.length} eventos registrados
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />
          
          <div className="space-y-6">
            {sortedEvents.map((event, index) => {
              const config = eventConfig[event.type];
              const Icon = config.icon;
              const eventDate = typeof event.date === 'string' 
                ? new Date(event.date) 
                : event.date;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="relative flex gap-4"
                >
                  {/* Icon Circle */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center relative z-10 shadow-lg",
                      config.bgColor
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {/* Pulse animation for first item */}
                    {index === 0 && (
                      <motion.div
                        animate={{ 
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 0, 0.5]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity 
                        }}
                        className={cn(
                          "absolute inset-0 rounded-full",
                          config.bgColor,
                          "opacity-50"
                        )}
                      />
                    )}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 pb-4">
                    <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">
                            {event.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                        {event.amount && (
                          <div className={cn(
                            "text-sm font-semibold whitespace-nowrap",
                            event.type === 'payment' || event.type === 'income'
                              ? "text-green-600"
                              : event.type === 'expense'
                              ? "text-red-600"
                              : "text-foreground"
                          )}>
                            {event.type === 'payment' || event.type === 'income' ? '+' : ''}
                            {event.type === 'expense' ? '-' : ''}
                            {formatCurrency(event.amount)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(eventDate, "PPP 'a las' p", { locale: es })}
                      </div>

                      {/* Metadata chips */}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs"
                            >
                              <span className="font-medium">{key}:</span>
                              <span className="ml-1">{String(value)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
