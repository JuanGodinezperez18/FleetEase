// components/layout/simple-floating-button.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, X, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FloatingAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'destructive';
  disabled?: boolean;
}

interface SimpleFloatingButtonProps {
  actions: FloatingAction[];
  className?: string;
}

const variantColors = {
  default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  secondary: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
  destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
};

export function SimpleFloatingButton({ actions, className = '' }: SimpleFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const handleActionClick = (action: FloatingAction) => {
    if (action.disabled) return;
    setIsOpen(false);
    action.onClick();
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
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className={`fixed bottom-8 right-8 z-50 ${className}`}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="flex flex-col gap-3 mb-4"
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
              {actions.map((action, index) => {
                const Icon = action.icon;
                const colorClass = variantColors[action.variant || 'default'];

                return (
                  <motion.button
                    key={index}
                    className={`${colorClass} px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3 text-sm font-medium ${
                      action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => handleActionClick(action)}
                    disabled={action.disabled}
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
                    whileHover={!action.disabled ? { scale: 1.05 } : {}}
                    whileTap={!action.disabled ? { scale: 0.95 } : {}}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="whitespace-nowrap">{action.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          className={`${
            isOpen ? 'bg-destructive' : 'bg-primary'
          } text-primary-foreground w-14 h-14 rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center`}
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </motion.button>
      </div>
    </>
  );
}
