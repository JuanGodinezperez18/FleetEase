/**
 * Alerta de error de permisos de Firebase
 * Muestra un botón para refrescar claims cuando hay errores de permisos
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useRefreshClaims } from '@/hooks/use-refresh-claims';
import { useState } from 'react';

interface FirebasePermissionErrorAlertProps {
  error?: Error | null;
  onDismiss?: () => void;
}

export function FirebasePermissionErrorAlert({ error, onDismiss }: FirebasePermissionErrorAlertProps) {
  const { refreshClaims, isLoading } = useRefreshClaims();
  const [retryCount, setRetryCount] = useState(0);

  const isPermissionError = error?.message?.includes('Missing or insufficient permissions') ||
                            error?.message?.includes('permission-denied');

  if (!isPermissionError) {
    return null;
  }

  const handleRefresh = async () => {
    const result = await refreshClaims();
    if (result?.success) {
      setRetryCount(prev => prev + 1);
      // Opcional: recargar la página después de refrescar claims
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error de Permisos</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>
          No tienes permisos suficientes para cargar esta información. Esto puede deberse a:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
          <li>Tu rol no está correctamente configurado</li>
          <li>Falta asignar tu companyId en el perfil</li>
          <li>Los permisos del token necesitan actualizarse</li>
        </ul>
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refrescando...' : 'Refrescar Permisos'}
          </Button>
          {onDismiss && (
            <Button onClick={onDismiss} variant="ghost" size="sm">
              Descartar
            </Button>
          )}
        </div>
        {retryCount > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Intento #{retryCount} - Si el problema persiste, contacta al administrador.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
