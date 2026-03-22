// components/dashboard/metric-card.tsx
"use client";

import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, TrendingDown, Percent, Clock, Activity, 
  Target, Calculator, Calendar, CalendarCheck, Shield, Truck, Car, 
  Wrench, Gauge, Key, AlertCircle, Settings, Users, UserPlus, Heart, 
  UserCheck, UserX, Star, XCircle, Landmark, CreditCard, Lock, Bell, 
  FileText, Server, Zap, Banknote, Trophy, CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapeo de strings a componentes de íconos
const iconMap = {
  DollarSign, TrendingUp, TrendingDown, Percent, Clock, Activity, Target,
  Calculator, Calendar, CalendarCheck, Shield, Truck, Car, Wrench, Gauge,
  Key, AlertCircle, Settings, Users, UserPlus, Heart, UserCheck, UserX,
  Star, XCircle, Landmark, CreditCard, Lock, Bell, FileText, Server,
  Zap, Banknote, Trophy, CheckSquare
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

  const gradientClasses: Record<string, { from: string, to: string, shadow: string }> = {
    green: { from: 'from-green-500', to: 'to-emerald-600', shadow: 'shadow-green-900/50' },
    red: { from: 'from-red-500', to: 'to-rose-600', shadow: 'shadow-red-900/50' },
    blue: { from: 'from-blue-500', to: 'to-cyan-600', shadow: 'shadow-blue-900/50' },
    orange: { from: 'from-orange-500', to: 'to-amber-600', shadow: 'shadow-orange-900/50' },
    purple: { from: 'from-purple-500', to: 'to-violet-600', shadow: 'shadow-purple-900/50' },
    cyan: { from: 'from-cyan-500', to: 'to-sky-600', shadow: 'shadow-cyan-900/50' },
    pink: { from: 'from-pink-500', to: 'to-rose-500', shadow: 'shadow-pink-900/50' },
    yellow: { from: 'from-yellow-400', to: 'to-amber-500', shadow: 'shadow-yellow-900/50' },
    gray: { from: 'from-slate-500', to: 'to-gray-600', shadow: 'shadow-slate-900/50' },
    indigo: { from: 'from-indigo-500', to: 'to-violet-600', shadow: 'shadow-indigo-900/50' }
  };
  
  const { from, to, shadow } = gradientClasses[color] || gradientClasses.gray;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.03, y: -5 }}
      className={cn(
        'bg-gradient-to-br rounded-3xl p-6 shadow-lg border border-white/10 backdrop-blur-sm cursor-pointer',
        'dark:bg-slate-800/50 dark:border-slate-700', // Clases para modo oscuro
        from, to, shadow
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
          <IconComponent className="w-7 h-7 text-white" />
        </div>
        {trend && (
          <motion.div 
            className={cn('flex items-center gap-1 px-2 py-1 rounded-full',
              trend.isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
            )}
            whileHover={{ scale: 1.1 }}
          >
            <span className={cn('text-xs font-bold',
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            )}>
              {trend.value}
            </span>
          </motion.div>
        )}
      </div>
      <p className="text-white/70 dark:text-slate-300 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-4xl font-black text-white dark:text-white mb-2">{value}</h3>
      {subtitle && (
        <p className="text-white/60 dark:text-slate-400 text-xs capitalize">{subtitle}</p>
      )}
    </motion.div>
  );
}
