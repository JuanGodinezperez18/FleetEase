'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({
  steps,
  isOpen,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const step = steps[currentStep];

  useEffect(() => {
    if (!isOpen || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [step, isOpen]);

  const handleNext = () => {
    if (step.action) {
      step.action();
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getTooltipPosition = () => {
    const position = step?.position || 'bottom';
    const padding = 20;

    switch (position) {
      case 'top':
        return {
          top: targetPosition.top - padding,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          top: targetPosition.top + targetPosition.height + padding,
          left: targetPosition.left + targetPosition.width / 2,
          transform: 'translate(-50%, 0)',
        };
      case 'left':
        return {
          top: targetPosition.top + targetPosition.height / 2,
          left: targetPosition.left - padding,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: targetPosition.top + targetPosition.height / 2,
          left: targetPosition.left + targetPosition.width + padding,
          transform: 'translate(0, -50%)',
        };
    }
  };

  if (!isOpen || !step) return null;

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background dim */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Spotlight */}
        <motion.div
          className="absolute bg-transparent border-4 border-primary rounded-lg pointer-events-none"
          animate={{
            top: targetPosition.top - 4,
            left: targetPosition.left - 4,
            width: targetPosition.width + 8,
            height: targetPosition.height + 8,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Tooltip */}
        <motion.div
          className="absolute z-50 w-80 max-w-[90vw]"
          style={getTooltipPosition()}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div className="bg-card border border-border rounded-lg shadow-2xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {step.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 -mt-2"
                onClick={onSkip}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === currentStep
                      ? 'w-6 bg-primary'
                      : index < currentStep
                      ? 'w-1.5 bg-primary/50'
                      : 'w-1.5 bg-muted'
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {currentStep + 1} de {steps.length}
              </div>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}

                <Button size="sm" onClick={handleNext}>
                  {currentStep === steps.length - 1 ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Finalizar
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Skip button */}
            <button
              onClick={onSkip}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-3"
            >
              Saltar tutorial
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
