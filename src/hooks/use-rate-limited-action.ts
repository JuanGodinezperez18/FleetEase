// src/hooks/use-rate-limited-action.ts
'use client';

import { useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface RateLimitState {
  attempts: number[];
  isLimited: boolean;
  resetTime: number | null;
}

interface UseRateLimitedActionOptions {
  limit?: number;
  windowMs?: number;
  errorMessage?: string;
  onLimitReached?: () => void;
}

/**
 * Hook para rate limiting de acciones en el cliente
 * Previene abuso accidental o intencional de acciones
 */
export function useRateLimitedAction<T extends any[]>(
  action: (...args: T) => Promise<void>,
  {
    limit = 5,
    windowMs = 60000, // 1 minuto por defecto
    errorMessage = 'Demasiadas solicitudes. Por favor espera un momento.',
    onLimitReached,
  }: UseRateLimitedActionOptions = {}
) {
  const [state, setState] = useState<RateLimitState>({
    attempts: [],
    isLimited: false,
    resetTime: null,
  });

  // Limpiar attempts expirados periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const validAttempts = prev.attempts.filter(timestamp => now - timestamp < windowMs);
        
        return {
          attempts: validAttempts,
          isLimited: validAttempts.length >= limit,
          resetTime: validAttempts.length >= limit 
            ? validAttempts[0] + windowMs 
            : null,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [limit, windowMs]);

  const executeAction = useCallback(async (...args: T) => {
    const now = Date.now();

    setState(prev => {
      // Verificar si estamos limitados
      const validAttempts = prev.attempts.filter(timestamp => now - timestamp < windowMs);
      
      if (validAttempts.length >= limit) {
        return {
          ...prev,
          isLimited: true,
          resetTime: validAttempts[0] + windowMs,
        };
      }

      return prev;
    });

    // Si está limitado, mostrar error
    if (state.isLimited) {
      toast.error(errorMessage);
      onLimitReached?.();
      return;
    }

    // Agregar attempt y ejecutar acción
    setState(prev => ({
      ...prev,
      attempts: [...prev.attempts, now],
    }));

    try {
      await action(...args);
    } catch (error) {
      console.error('Error en acción rate-limited:', error);
      // Remover attempt si falló
      setState(prev => ({
        ...prev,
        attempts: prev.attempts.slice(0, -1),
      }));
      throw error;
    }
  }, [action, limit, windowMs, state.isLimited, errorMessage, onLimitReached]);

  // Calcular tiempo restante para reset
  const timeUntilReset = state.resetTime 
    ? Math.max(0, state.resetTime - Date.now()) 
    : 0;

  return {
    execute: executeAction,
    isLimited: state.isLimited,
    attemptsRemaining: Math.max(0, limit - state.attempts.filter(t => Date.now() - t < windowMs).length),
    timeUntilReset,
    resetTime: state.resetTime,
  };
}

/**
 * Hook específico para submits de formularios
 */
export function useRateLimitedSubmit(
  onSubmit: (data: any) => Promise<void>,
  limit: number = 3,
  windowMs: number = 60000
) {
  const { execute, isLimited, attemptsRemaining, timeUntilReset } = useRateLimitedAction(
    onSubmit,
    { limit, windowMs }
  );

  const handleSubmit = useCallback(async (data: any) => {
    if (isLimited) {
      return;
    }
    await execute(data);
  }, [execute, isLimited]);

  return {
    handleSubmit,
    isLimited,
    attemptsRemaining,
    timeUntilReset,
  };
}
