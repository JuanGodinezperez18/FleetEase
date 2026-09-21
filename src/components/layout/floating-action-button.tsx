// components/layout/floating-action-button.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Gauge, Wrench, DollarSign, Landmark, Users, Car, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-provider';

const ALL_QUICK_ACTIONS = [
  { icon: Gauge, label: 'Registrar Kilometraje', action: 'mileage', roles: ['superAdmin', 'super_admin', 'admin', 'editor', 'client'] },
  { icon: Wrench, label: 'Registrar Gasto', action: 'expense', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: DollarSign, label: 'Registrar Ingreso', action: 'income', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: DollarSign, label: 'Pagos', action: 'payments', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: Landmark, label: 'Nuevo Crédito', action: 'credit', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: Users, label: 'Nuevo Cliente', action: 'client', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: Car, label: 'Nuevo Vehículo', action: 'vehicle', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: Camera, label: 'Inspección de Vehículo', action: 'vehicle-inspection', roles: ['superAdmin', 'super_admin', 'admin', 'editor', 'client'] },
];

interface FloatingActionButtonProps {
  openModal: (modal: string) => void;
  availableActions?: string[];
  className?: string;
  urgentActionsCount?: number;
}

export function FloatingActionButton({
  openModal,
  availableActions,
  className = '',
  urgentActionsCount = 0,
}: FloatingActionButtonProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredActions = useMemo(() => {
    const userRole = currentUser?.role || 'client';

    return ALL_QUICK_ACTIONS.filter((action) => {
      if (!action.roles.includes(userRole)) return false;
      if (availableActions && availableActions.length > 0) {
        return availableActions.includes(action.action);
      }
      return true;
    });
  }, [currentUser?.role, availableActions]);

  if (!isMounted) return null;

  const handleActionClick = (actionName: string) => {
    setIsOpen(false);
    openModal(actionName);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-fab-overlay
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[3px] dark:bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div
        className={`fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 md:bottom-8 md:right-8 z-50 ${className}`}
        role="region"
        aria-label="Acciones rápidas"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="mb-4 flex flex-col items-end gap-2.5"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
                closed: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
              }}
              role="menu"
              aria-label="Acciones rápidas de FleetEase"
            >
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.action}
                    type="button"
                    role="menuitem"
                    className="group flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#0a0c12] shadow-[0_12px_35px_rgba(0,0,0,.12)] backdrop-blur-xl transition-all duration-200 hover:-translate-x-1 hover:border-[#d7ff3f]/50 hover:bg-[#f6f7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f] dark:border-white/10 dark:bg-[#0e1117]/95 dark:text-white dark:shadow-[0_12px_35px_rgba(0,0,0,.35)] dark:hover:border-[#d7ff3f]/35 dark:hover:bg-[#151922]"
                    onClick={() => handleActionClick(action.action)}
                    variants={{
                      open: { y: 0, opacity: 1, scale: 1 },
                      closed: { y: 24, opacity: 0, scale: 0.92 },
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d7ff3f]/15 text-[#5c6d08] ring-1 ring-inset ring-[#d7ff3f]/25 transition-colors group-hover:bg-[#d7ff3f]/25 dark:bg-[#d7ff3f]/10 dark:text-[#d7ff3f] dark:ring-[#d7ff3f]/15">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap pr-1">{action.label}</span>
                  </motion.button>
                );
              })}

              {filteredActions.length === 0 && (
                <motion.div
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs text-black/55 shadow-xl dark:border-white/10 dark:bg-[#0e1117]/95 dark:text-white/55"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  No hay acciones disponibles para este perfil.
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d7ff3f] text-[#080a0f] shadow-[0_10px_30px_rgba(215,255,63,.20)] transition-shadow duration-200 hover:shadow-[0_14px_40px_rgba(215,255,63,.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          onClick={() => setIsOpen((open) => !open)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && isOpen) setIsOpen(false);
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Cerrar menú de acciones rápidas' : 'Abrir menú de acciones rápidas'}
          aria-haspopup="menu"
        >
          {isOpen ? (
            <X className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Plus className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
          )}

          {!isOpen && urgentActionsCount > 0 && (
            <motion.span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d6d] px-1 text-xs font-bold text-white ring-2 ring-white dark:ring-[#080a0f]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {urgentActionsCount}
            </motion.span>
          )}
        </motion.button>
      </div>
    </>
  );
}

export default FloatingActionButton;
