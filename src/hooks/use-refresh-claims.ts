/**
 * Hook para refrescar custom claims del usuario actual
 * Útil cuando hay errores de permisos en Firebase
 */

import { useCallback, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/auth-provider';
import { logger } from '@/lib/logger';

interface RefreshClaimsResult {
  success: boolean;
  message?: string;
  claims?: Record<string, any>;
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
      logger.info('[RefreshClaims] Solicitando refresco de claims...');
      
      const functions = getFunctions();
      const refreshMyClaimsFn = httpsCallable<Record<string, never>, RefreshClaimsResult>(
        functions,
        'refreshMyClaims'
      );

      const result = await refreshMyClaimsFn({});

      logger.info('[RefreshClaims] Claims refrescados', { data: result.data });

      // Forzar refresco del token
      const auth = (await import('@/lib/firebase')).auth;
      await auth.currentUser?.getIdToken(true);

      return result.data;
    } catch (err: any) {
      logger.error('[RefreshClaims] Error refrescando claims:', err);
      setError(err instanceof Error ? err : new Error(err.message || 'Error desconocido'));
      return { success: false, message: err.message || 'Error al refrescar claims' };
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
