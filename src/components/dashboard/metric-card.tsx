// components/dashboard/metric-card.tsx
// Animated entry variant — same design tokens as canonical MetricCard.

"use client";

import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Clock,
  Activity,
  Target,
  Calculator,
  Calendar,
  CalendarCheck,
  Shield,
  Truck,
  Car,
  Wrench,
  Gauge,
  Key,
  AlertCircle,
  Settings,
  Users,
  UserPlus,
  Heart,
  UserCheck,
  UserX,
  Star,
  XCircle,
  Landmark,
  CreditCard,
  Lock,
  Bell,
  FileText,
  Server,
  Zap,
  Banknote,
  Trophy,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Sparkline } from '@/components/ui/sparkline';

// Re-export canonical card for a single import path
export { MetricCard, InteractiveMetricCard } from '@/components/dashboard/components/MetricCard';
export type { MetricCardProps, InteractiveMetricCardProps } from '@/components/dashboard/components/MetricCard';

const iconMap = {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Clock,
  Activity,
  Target,
  Calculator,
  Calendar,
  CalendarCheck,
  Shield,
  Truck,
  Car,
  Wrench,
  Gauge,
  Key,
  AlertCircle,
  Settings,
  Users,
  UserPlus,
  Heart,
  UserCheck,
  UserX,
  Star,
  XCircle,
  Landmark,
  CreditCard,
  Lock,
  Bell,
  FileText,
  Server,
  Zap,
  Banknote,
  Trophy,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
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
  sparklineData?: number[];
}

/**
 * Entrance-animated metric card.
 * Visual tokens match MetricCard / DraggableMetricCard.
 */
export function AnimatedMetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color: _color,
  delay = 0,
  sparklineData,
}: AnimatedMetricCardProps) {
  const IconComponent = iconMap[icon] || DollarSign;

  const numericValue =
    typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : value;
  const prefix = typeof value === 'string' && value.includes('$') ? '$' : '';
  const suffix = typeof value === 'string' && value.includes('%') ? '%' : '';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      className={cn('fe-metric-card group')}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#d7ff3f]/[0.045] blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] opacity-70 shadow-[0_0_10px_#d7ff3f]" />
            <p className="fe-metric-title truncate">
              {title}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <h3 className="font-heading text-[32px] font-semibold leading-none tracking-[-0.04em] text-white tabular-nums sm:text-[34px]">
              {prefix}
              <AnimatedCounter
                value={numericValue}
                duration={1.5}
                decimals={numericValue % 1 !== 0 ? 2 : 0}
              />
              {suffix}
            </h3>

            {trend && (
              <motion.div
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
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

          {subtitle && (
            <motion.p
              className="fe-metric-description mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.25 }}
            >
              {subtitle}
            </motion.p>
          )}

          {sparklineData && sparklineData.length >= 2 && (
            <motion.div
              className="fe-metric-divider mt-4 border-t pt-3 opacity-80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.35 }}
            >
              <Sparkline
                data={sparklineData}
                height={32}
                negative={trend ? !trend.isPositive : false}
              />
            </motion.div>
          )}
        </div>

        <motion.div
          className="fe-metric-icon"
          whileHover={{ scale: 1.08, rotate: 6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
        >
          <IconComponent className="h-5 w-5" strokeWidth={1.75} />
        </motion.div>
      </div>
    </motion.article>
  );
}
