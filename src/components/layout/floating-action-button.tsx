
// components/layout/floating-action-button.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Gauge, Wrench, DollarSign, Landmark, Users, Car, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-provider';

const ALL_QUICK_ACTIONS = [
  {
    icon: Gauge,
    label: 'Registrar Kilometraje',
    action: 'mileage',
    color: 'bg-blue-500',
    roles: ['admin', 'editor', 'client']
  },
  {
    icon: Wrench,
    label: 'Registrar Gasto',
    action: 'expense',
    color: 'bg-orange-500',
    roles: ['admin', 'editor']
  },
  {
    icon: DollarSign,
    label: 'Registrar Ingreso/Pago',
    action: 'income',
    color: 'bg-green-500',
    roles: ['admin', 'editor']
  },
  {
    icon: Landmark,
    label: 'Nuevo Crédito',
    action: 'credit',
    color: 'bg-purple-500',
    roles: ['admin', 'editor']
  },
  {
    icon: Users,
    label: 'Nuevo Cliente',
    action: 'client',
    color: 'bg-cyan-500',
    roles: ['admin', 'editor']
  },
  {
    icon: Car,
    label: 'Nuevo Vehículo',
    action: 'vehicle',
    color: 'bg-indigo-500',
    roles: ['admin', 'editor']
  },
  {
    icon: Camera,
    label: 'Inspección de Vehículo',
    action: 'vehicle-inspection',
    color: 'bg-pink-500',
    roles: ['admin', 'editor', 'client'] // ✅ Agregado para admins
  },
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
    
    return ALL_QUICK_ACTIONS.filter(action => {
      // Filtrar por roles permitidos
      if (!action.roles.includes(userRole)) return false;
      
      // Si se especificaron acciones disponibles, filtrar por ellas
      if (availableActions && availableActions.length > 0) {
        return availableActions.includes(action.action);
      }
      
      return true;
    });
  }, [currentUser, availableActions]);

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
            className="fixed inset-0 bg-black/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div
        className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 ${className}`}
        role="region"
        aria-label="Acciones rápidas"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="flex flex-col gap-3 mb-4 items-end"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: {
                  transition: { staggerChildren: 0.07, delayChildren: 0.1 }
                },
                closed: {
                  transition: { staggerChildren: 0.05, staggerDirection: -1 }
                }
              }}
            >
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.action}
                    className={`${action.color} text-white px-3 py-2 sm:px-4 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium max-w-[280px] sm:max-w-none`}
                    onClick={() => handleActionClick(action.action)}
                    variants={{
                      open: {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        transition: {
                          y: { stiffness: 1000, velocity: -100 }
                        }
                      },
                      closed: {
                        y: 50,
                        opacity: 0,
                        scale: 0.8,
                        transition: {
                          y: { stiffness: 1000 }
                        }
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="whitespace-nowrap truncate">{action.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          type="button"
          className="relative bg-primary text-primary-foreground h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && isOpen) {
              setIsOpen(false);
            }
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Cerrar menú de acciones rápidas' : 'Abrir menú de acciones rápidas'}
          aria-haspopup="menu"
        >
          {isOpen ? (
            <X className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          ) : (
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          )}

          {/* Badge de urgencia */}
          {!isOpen && urgentActionsCount > 0 && (
            <motion.span
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center"
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
