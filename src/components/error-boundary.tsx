// src/components/error-boundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary para capturar y mostrar errores de React
 * Usar como wrapper de componentes críticos
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error caught:', error, errorInfo);
    
    // Log a servicio de error tracking
    this.logErrorToService(error, errorInfo);

    // Callback opcional
    this.props.onError?.(error, errorInfo);

    this.setState({ errorInfo });
  }

  private async logErrorToService(error: Error, errorInfo: ErrorInfo) {
    try {
      // Aquí iría el código para enviar a Sentry, LogRocket, etc.
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      console.error('[ErrorBoundary] Error details:', errorData);

      // Ejemplo: enviar a API
      // await fetch('/api/log-error', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // });
    } catch (logError) {
      console.error('[ErrorBoundary] Failed to log error:', logError);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      // Usar fallback customizado si se proporciona
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de error por defecto
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-md w-full">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>
              {this.props.componentName 
                ? `Error en ${this.props.componentName}`
                : 'Algo salió mal'}
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-4">
              <p className="text-sm">
                Ha ocurrido un error inesperado. Por favor intenta recargar la página.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Ver detalles del error
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-48 text-destructive">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recargar
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="sm"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir al Dashboard
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error Boundary funcional con hooks
 * Para usar dentro de componentes funcionales
 */
interface FunctionalErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

export function FunctionalErrorBoundary({
  children,
  fallback,
  onError,
}: FunctionalErrorBoundaryProps) {
  const [error, setError] = React.useState<Error | null>(null);

  const reset = React.useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    if (fallback) {
      return fallback(error, reset);
    }

    return (
      <ErrorBoundary onError={onError}>
        {children}
      </ErrorBoundary>
    );
  }

  // Wrapper que captura errores
  return (
    <ErrorBoundary
      onError={(err) => {
        setError(err);
        onError?.(err);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
