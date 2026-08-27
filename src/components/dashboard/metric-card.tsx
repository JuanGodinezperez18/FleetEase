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

// Mapeo de strings a componentes de íconos
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
  color,
  delay = 0,
}: AnimatedMetricCardProps) {
  const IconComponent = iconMap[icon] || DollarSign;

  const gradientClasses: Record<string, { from: string, to: string, shadow: string, glow: string }> = {
    green: {
      from: 'from-emerald-500/20',
      to: 'to-emerald-600/10',
      shadow: 'shadow-emerald-900/20',
      glow: 'group-hover:shadow-emerald-500/30'
    },
    red: {
      from: 'from-rose-500/20',
      to: 'to-rose-600/10',
      shadow: 'shadow-rose-900/20',
      glow: 'group-hover:shadow-rose-500/30'
    },
    blue: {
      from: 'from-blue-500/20',
      to: 'to-cyan-600/10',
      shadow: 'shadow-blue-900/20',
      glow: 'group-hover:shadow-blue-500/30'
    },
    orange: {
      from: 'from-orange-500/20',
      to: 'to-amber-600/10',
      shadow: 'shadow-orange-900/20',
      glow: 'group-hover:shadow-orange-500/30'
    },
    purple: {
      from: 'from-violet-500/20',
      to: 'to-purple-600/10',
      shadow: 'shadow-violet-900/20',
      glow: 'group-hover:shadow-violet-500/30'
    },
    cyan: {
      from: 'from-cyan-500/20',
      to: 'to-sky-600/10',
      shadow: 'shadow-cyan-900/20',
      glow: 'group-hover:shadow-cyan-500/30'
    },
    pink: {
      from: 'from-pink-500/20',
      to: 'to-rose-500/10',
      shadow: 'shadow-pink-900/20',
      glow: 'group-hover:shadow-pink-500/30'
    },
    yellow: {
      from: 'from-amber-400/20',
      to: 'to-yellow-500/10',
      shadow: 'shadow-amber-900/20',
      glow: 'group-hover:shadow-amber-500/30'
    },
    gray: {
      from: 'from-slate-500/20',
      to: 'to-slate-600/10',
      shadow: 'shadow-slate-900/20',
      glow: 'group-hover:shadow-slate-500/30'
    },
    indigo: {
      from: 'from-indigo-500/20',
      to: 'to-violet-600/10',
      shadow: 'shadow-indigo-900/20',
      glow: 'group-hover:shadow-indigo-500/30'
    }
  };

  const { from, to, shadow, glow } = gradientClasses[color] || gradientClasses.gray;

  // Parse numeric value for counter animation
  const numericValue = typeof value === 'string'
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
    : value;
  const prefix = typeof value === 'string' && value.includes('$') ? '$' : '';
  const suffix = typeof value === 'string' && value.includes('%') ? '%' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -8 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl p-6 cursor-pointer',
        'glass-premium border border-white/10 backdrop-blur-xl',
        'bg-gradient-to-br',
        from, to, shadow, glow,
        'transition-shadow duration-500'
      )}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />

      {/* Floating glow effect */}
      <motion.div
        className={cn(
          "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700",
          color === 'green' && 'bg-emerald-500',
          color === 'red' && 'bg-rose-500',
          color === 'blue' && 'bg-blue-500',
          color === 'orange' && 'bg-orange-500',
          color === 'purple' && 'bg-violet-500',
          color === 'cyan' && 'bg-cyan-500',
          color === 'pink' && 'bg-pink-500',
          color === 'yellow' && 'bg-amber-500',
          color === 'gray' && 'bg-slate-500',
          color === 'indigo' && 'bg-indigo-500'
        )}
      />

      <div className="relative z-10">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-6">
          <motion.div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm",
              "border border-white/10 shadow-inner"
            )}
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <IconComponent className="w-6 h-6 text-white" />
          </motion.div>

          {trend && (
            <motion.div
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold',
                'backdrop-blur-sm border',
                trend.isPositive
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.2 }}
              whileHover={{ scale: 1.05 }}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {trend.value}
            </motion.div>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-white/60 mb-2">{title}</p>

        {/* Value with counter animation */}
        <div className="flex items-baseline gap-1">
          <h3 className="text-3xl font-bold text-white">
            {prefix}
            <AnimatedCounter
              value={numericValue}
              duration={1.5}
              decimals={numericValue % 1 !== 0 ? 2 : 0}
            />
            {suffix}
          </h3>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <motion.p
            className="text-xs text-white/40 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Bottom gradient line */}
      <motion.div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        )}
      />
    </motion.div>
  );
}
