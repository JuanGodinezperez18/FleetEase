// components/dashboard/metric-card.tsx
"use client";

import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown, Percent, Clock, Activity,
  Target, Calculator, Calendar, CalendarCheck, Shield, Truck, Car,
  Wrench, Gauge, Key, AlertCircle, Settings, Users, UserPlus, Heart,
  UserCheck, UserX, Star, XCircle, Landmark, CreditCard, Lock, Bell,
  FileText, Server, Zap, Banknote, Trophy, CheckSquare, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/animated-counter';

const iconMap = {
  DollarSign, TrendingUp, TrendingDown, Percent, Clock, Activity, Target,
  Calculator, Calendar, CalendarCheck, Shield, Truck, Car, Wrench, Gauge,
  Key, AlertCircle, Settings, Users, UserPlus, Heart, UserCheck, UserX,
  Star, XCircle, Landmark, CreditCard, Lock, Bell, FileText, Server,
  Zap, Banknote, Trophy, CheckSquare, ArrowUpRight, ArrowDownRight
};

type IconName = keyof typeof iconMap;

interface AnimatedMetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend: {
    value: string;
    isPositive: boolean;
  };
  icon: IconName;
  color: string;
  delay?: number;
}

export function AnimatedMetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color: _color,
  delay = 0,
}: AnimatedMetricCardProps) {
  const IconComponent = iconMap[icon] || DollarSign;

  const numericValue = typeof value === 'string'
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
    : value;
  const prefix = typeof value === 'string' && value.includes('$') ? '$' : '';
  const suffix = typeof value === 'string' && value.includes('%') ? '%' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl p-5 sm:p-6',
        'border border-white/[0.08] bg-[#0e1117]/80 backdrop-blur-xl',
        'shadow-[0_18px_50px_rgba(0,0,0,0.18)]',
        'transition-all duration-300 hover:border-white/[0.14] hover:shadow-[0_22px_60px_rgba(0,0,0,0.26)]'
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#d7ff3f]/[0.06] blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d7ff3f]/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <motion.div
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.07] text-[#d7ff3f] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            <IconComponent className="h-5 w-5" strokeWidth={1.8} />
          </motion.div>

          {trend && (
            <motion.div
              className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm',
                trend.isPositive
                  ? 'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300'
                  : 'border-rose-400/15 bg-rose-400/[0.07] text-rose-300'
              )}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.15 }}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-3 w-3" strokeWidth={1.8} />
              ) : (
                <ArrowDownRight className="h-3 w-3" strokeWidth={1.8} />
              )}
              {trend.value}
            </motion.div>
          )}
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-white/40">{title}</p>

        <div className="flex items-baseline gap-1">
          <h3 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {prefix}
            <AnimatedCounter
              value={numericValue}
              duration={1.5}
              decimals={numericValue % 1 !== 0 ? 2 : 0}
            />
            {suffix}
          </h3>
        </div>

        {subtitle && (
          <motion.p
            className="mt-2 text-xs leading-relaxed text-white/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.25 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
