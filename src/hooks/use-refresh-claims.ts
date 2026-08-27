/**
 * Hook para refrescar sesión en Supabase
 * En Supabase no hay custom claims - los roles se leen de la tabla users directamente
 */

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

interface RefreshClaimsResult {
  success: boolean;
  message?: string;
}

export function useRefreshClaims() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser } = useAuth();

  const refreshClaims = useCallback(async (): Promise<RefreshClaimsResult | null> => {
    if (!currentUser) {
      setError(new Error('No hay usuario autenticado'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info('[RefreshClaims] Refrescando sesión Supabase...');
      
      // Refrescar sesión en Supabase
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }

      logger.info('[RefreshClaims] Sesión refrescada exitosamente');
      
      return { success: true, message: 'Sesión actualizada correctamente' };
    } catch (err: any) {
      logger.error('[RefreshClaims] Error refrescando sesión:', err);
      setError(err instanceof Error ? err : new Error(err.message || 'Error desconocido'));
      return { success: false, message: err.message || 'Error al refrescar sesión' };
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  return {
    refreshClaims,
    isLoading,
    error,
  };
}