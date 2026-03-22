// components/dashboard/components/ProfessionalMetricCard.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DollarSign, Percent, Clock, Activity, 
  Target, Calculator, Calendar, CalendarCheck, Shield, Truck, Car, 
  Wrench, Gauge, Key, AlertCircle, Settings, Users, UserPlus, Heart, 
  UserCheck, UserX, Star, XCircle, Landmark, CreditCard, Lock, Bell, 
  FileText, Server, Zap, Banknote, Trophy, CheckSquare
} from 'lucide-react';

const iconMap = {
  DollarSign, TrendingUp, TrendingDown, Percent, Clock, Activity, Target,
  Calculator, Calendar, CalendarCheck, Shield, Truck, Car, Wrench, Gauge,
  Key, AlertCircle, Settings, Users, UserPlus, Heart, UserCheck, UserX,
  Star, XCircle, Landmark, CreditCard, Lock, Bell, FileText, Server,
  Zap, Banknote, Trophy, CheckSquare
};

type IconName = keyof typeof iconMap;

const fadeIn = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export function ProfessionalMetricCard({ 
  title, value, change, iconName, subtitle, onClick 
}: {
  title: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  iconName: IconName;
  subtitle?: string;
  onClick?: () => void;
}) {
  const Icon = iconMap[iconName] || DollarSign;

  const cardContent = (
    <div className="bg-white dark:bg-slate-900/50 p-5 rounded-lg border border-slate-100 dark:border-slate-800/50 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-transform hover:scale-110" aria-hidden="true" />
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-sm font-medium ${
          change.isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {change.isPositive ? 
            <TrendingUp className="w-4 h-4" /> : 
            <TrendingDown className="w-4 h-4" />
          }
          <span>{Math.abs(change.value).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );

  return (
    <motion.div 
      variants={fadeIn} 
      onClick={onClick} 
      className={cn(onClick && "cursor-pointer")}
      whileTap={onClick ? { scale: 0.97 } : {}}
      whileHover={onClick ? { y: -2, scale: 1.02 } : {}}
    >
      {cardContent}
    </motion.div>
  );
}
