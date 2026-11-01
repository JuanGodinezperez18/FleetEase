// components/layout/floating-action-button.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Gauge, Wrench, DollarSign, Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-provider';

/** Solo acciones operativas diarias; el resto se hace en su módulo. */
const ALL_QUICK_ACTIONS = [
  { icon: DollarSign, label: 'Registro de ingreso', action: 'income', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: Wrench, label: 'Registro de gasto', action: 'expense', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: Banknote, label: 'Pagos', action: 'payments', roles: ['superAdmin', 'super_admin', 'admin', 'editor'] },
  { icon: Gauge, label: 'Registro de kilometraje', action: 'mileage', roles: ['superAdmin', 'super_admin', 'admin', 'editor', 'client'] },
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isMounted) return null;

  const handleActionClick = (actionName: string) => {
    setIsOpen(false);
    openModal(actionName);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[3px] dark:bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div
        className={`fixed z-50 flex flex-col items-end gap-2.5 bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1.25rem,env(safe-area-inset-right,0px))] ${className}`}
        data-fab-root
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="mb-1 flex flex-col items-end gap-2"
              data-fab-actions
              role="menu"
              aria-label="Acciones rápidas"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: {
                  transition: { staggerChildren: 0.05, delayChildren: 0.03 },
                },
                closed: {
                  transition: { staggerChildren: 0.03, staggerDirection: -1 },
                },
              }}
            >
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.action}
                    type="button"
                    role="menuitem"
                    className="group flex items-center gap-3 rounded-2xl border border-[color:var(--fe-border)] bg-[var(--fe-surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--fe-text)] shadow-[var(--fe-shadow-md)] backdrop-blur-md transition-colors hover:border-[color:var(--fe-lime)]/45 hover:bg-[color:var(--fe-lime)]/10"
                    onClick={() => handleActionClick(action.action)}
                    variants={{
                      open: {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        transition: { type: 'spring', stiffness: 420, damping: 28 },
                      },
                      closed: {
                        y: 12,
                        opacity: 0,
                        scale: 0.94,
                        transition: { duration: 0.12 },
                      },
                    }}
                    whileHover={{ scale: 1.02, x: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--fe-lime)]/15 text-[color:var(--fe-lime-text,#5c6d08)] dark:text-[color:var(--fe-lime)]">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap pr-1">{action.label}</span>
                  </motion.button>
                );
              })}

              {filteredActions.length === 0 && (
                <motion.div
                  className="rounded-2xl border border-[color:var(--fe-border)] bg-[var(--fe-surface)] px-4 py-3 text-xs text-[var(--fe-text-muted)] shadow-[var(--fe-shadow-md)]"
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

        {/* Main FAB — brand squircle, no infinite pulse (audit: limited motion) */}
        <motion.button
          type="button"
          className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--fe-lime,#d7ff3f)] text-[var(--fe-ink,#080a0f)] shadow-[0_8px_28px_rgba(215,255,63,0.28)] ring-1 ring-black/5 transition-shadow duration-200 hover:shadow-[0_12px_36px_rgba(215,255,63,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-bg)] dark:ring-white/10"
          onClick={() => setIsOpen((open) => !open)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Cerrar menú de acciones rápidas' : 'Abrir menú de acciones rápidas'}
          aria-haspopup="menu"
        >
          <span className="relative z-[1]">
            {isOpen ? (
              <X className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            ) : (
              <Plus className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            )}
          </span>

          {!isOpen && urgentActionsCount > 0 && (
            <motion.span
              className="absolute -right-1 -top-1 z-[2] flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d6d] px-1 text-xs font-bold text-white ring-2 ring-[var(--fe-bg)]"
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
