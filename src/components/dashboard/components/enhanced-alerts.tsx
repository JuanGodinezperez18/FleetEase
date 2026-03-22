// src/components/dashboard/components/enhanced-alerts.tsx
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, X, ChevronDown, Share2, Copy, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AnalyzedNotification } from '@/hooks/use-notifications-analytics';
import { getNotificationLink } from '@/lib/notification-utils';
import Link from 'next/link';


interface EnhancedAlertsProps {
  criticalAlerts: AnalyzedNotification[];
  importantAlerts: AnalyzedNotification[];
}

export const EnhancedAlerts = ({ criticalAlerts, importantAlerts }: EnhancedAlertsProps) => {
  const [expandedCritical, setExpandedCritical] = useState(true);
  const [expandedImportant, setExpandedImportant] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  
  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
    toast.success('Alerta descartada');
  };
  
  const handleShare = (alert: AnalyzedNotification) => {
    const text = alert.message;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copiado al portapapeles');
    }
  };
  
  const visibleCriticalAlerts = criticalAlerts.filter(a => !dismissedAlerts.has(a.id));
  const visibleImportantAlerts = importantAlerts.filter(a => !dismissedAlerts.has(a.id));
  
  if (visibleCriticalAlerts.length === 0 && visibleImportantAlerts.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      {/* ALERTAS CRÍTICAS */}
      <AnimatePresence>
        {visibleCriticalAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
              <div className="p-4">
                {/* Header */}
                <button
                  onClick={() => setExpandedCritical(!expandedCritical)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="p-2 bg-red-500 rounded-full"
                      >
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </motion.div>
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-red-500 rounded-full"
                      />
                    </div>
                    
                    <div className="text-left">
                      <h3 className="font-bold text-red-900 dark:text-red-100 flex items-center gap-2">
                        Alertas Críticas
                        <Badge variant="destructive" className="animate-pulse">
                          {visibleCriticalAlerts.length}
                        </Badge>
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Requieren atención inmediata
                      </p>
                    </div>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: expandedCritical ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </motion.div>
                </button>
                
                {/* Alerts List */}
                <AnimatePresence>
                  {expandedCritical && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 space-y-2 overflow-hidden"
                    >
                      {visibleCriticalAlerts.map((alert, index) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.1 }}
                          className="group relative"
                        >
                          <Link href={getNotificationLink(alert)} passHref>
                            <div className="flex items-start gap-3 p-3 bg-white dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                              <div className="flex-shrink-0 mt-0.5">
                                {alert.icon}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-red-900 dark:text-red-100">
                                  {alert.message}
                                </p>
                                {alert.timestamp && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    {alert.timestamp}
                                  </p>
                                )}
                              </div>
                              
                              {/* Actions */}
                              <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.preventDefault(); handleShare(alert); }}
                                >
                                  <Share2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 hover:bg-red-200"
                                  onClick={(e) => { e.preventDefault(); handleDismiss(alert.id); }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* AVISOS IMPORTANTES */}
      <AnimatePresence>
        {visibleImportantAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="overflow-hidden border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
              <div className="p-4">
                {/* Header */}
                <button
                  onClick={() => setExpandedImportant(!expandedImportant)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500 rounded-full">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="text-left">
                      <h3 className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        Avisos Importantes
                        <Badge variant="secondary" className="bg-amber-200 text-amber-900">
                          {visibleImportantAlerts.length}
                        </Badge>
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Información relevante para tu operación
                      </p>
                    </div>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: expandedImportant ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </motion.div>
                </button>
                
                {/* Alerts List */}
                <AnimatePresence>
                  {expandedImportant && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 space-y-2 overflow-hidden"
                    >
                      {visibleImportantAlerts.map((alert, index) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.1 }}
                          className="group relative"
                        >
                          <Link href={getNotificationLink(alert)} passHref>
                            <div className="flex items-start gap-3 p-3 bg-white dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                              <div className="flex-shrink-0 mt-0.5">
                                {alert.icon}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-amber-900 dark:text-amber-100">
                                  {alert.message}
                                </p>
                                {alert.timestamp && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    {alert.timestamp}
                                  </p>
                                )}
                              </div>
                              
                              {/* Actions */}
                              <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.preventDefault(); handleShare(alert); }}
                                >
                                  <Share2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 hover:bg-amber-200"
                                  onClick={(e) => { e.preventDefault(); handleDismiss(alert.id); }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
