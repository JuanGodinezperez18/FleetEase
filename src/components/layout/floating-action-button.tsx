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
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] dark:bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div
        className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 ${className}`}
        data-fab-root
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="mb-1 flex flex-col items-end gap-2.5"
              data-fab-actions
              role="menu"
              aria-label="Acciones rápidas"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: {
                  transition: { staggerChildren: 0.06, delayChildren: 0.04 },
                },
                closed: {
                  transition: { staggerChildren: 0.04, staggerDirection: -1 },
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
                    className="group flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-[var(--fe-surface,#fff)] px-4 py-3 text-sm font-medium text-foreground shadow-[0_8px_28px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors hover:border-[#d7ff3f]/40 hover:bg-[#d7ff3f]/10 dark:border-white/10 dark:bg-[#0e1117]/95 dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)] dark:hover:border-[#d7ff3f]/35"
                    onClick={() => handleActionClick(action.action)}
                    variants={{
                      open: {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        transition: { type: 'spring', stiffness: 420, damping: 28 },
                      },
                      closed: {
                        y: 16,
                        opacity: 0,
                        scale: 0.92,
                        transition: { duration: 0.15 },
                      },
                    }}
                    whileHover={{ scale: 1.03, x: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d7ff3f]/15 text-[#5a6b00] transition-colors group-hover:bg-[#d7ff3f]/30 dark:text-[#d7ff3f]">
                      <Icon className="h-4.5 w-4.5" strokeWidth={1.9} aria-hidden="true" />
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
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d7ff3f] text-[#080a0f] shadow-[0_10px_30px_rgba(215,255,63,.22)] transition-shadow duration-200 hover:shadow-[0_14px_40px_rgba(215,255,63,.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          onClick={() => setIsOpen((open) => !open)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          animate={{
            rotate: isOpen ? 45 : 0,
            boxShadow: isOpen
              ? '0 8px 24px rgba(215,255,63,0.15)'
              : '0 10px 30px rgba(215,255,63,0.22)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Cerrar menú de acciones rápidas' : 'Abrir menú de acciones rápidas'}
          aria-haspopup="menu"
        >
          {/* Soft pulse when closed */}
          {!isOpen && (
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-2xl bg-[#d7ff3f]"
              animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            />
          )}
          <span className="relative z-[1]">
            {isOpen ? (
              <X className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            ) : (
              <Plus className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            )}
          </span>

          {!isOpen && urgentActionsCount > 0 && (
            <motion.span
              className="absolute -right-1 -top-1 z-[2] flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d6d] px-1 text-xs font-bold text-white ring-2 ring-white dark:ring-[#080a0f]"
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
