"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🔴 [GlobalErrorBoundary] Uncaught error:", error, errorInfo);

    // Prevenir loops infinitos de recarga
    const errorCount = parseInt(sessionStorage.getItem('errorReloadCount') || '0');
    sessionStorage.setItem('errorReloadCount', (errorCount + 1).toString());

    if (errorCount >= 3) {
      console.error('🔴 [GlobalErrorBoundary] Demasiados errores consecutivos. Deteniendo auto-recargas.');
      sessionStorage.setItem('preventAutoReload', 'true');
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md m-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive" />
                        Error en la Aplicación
                    </CardTitle>
                    <CardDescription>
                        Se ha producido un error inesperado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Lo sentimos, algo salió mal. La mejor solución suele ser recargar la página.
                    </p>
                    {this.state.error && (
                         <details className="mt-4 p-2 bg-muted rounded-lg text-xs">
                            <summary className="cursor-pointer font-medium mb-1">Detalles técnicos</summary>
                            <pre className="overflow-auto whitespace-pre-wrap">
                                {this.state.error.name}: {this.state.error.message}
                            </pre>
                         </details>
                    )}
                    <Button
                        className="w-full mt-6"
                        onClick={() => {
                            sessionStorage.removeItem('errorReloadCount');
                            sessionStorage.removeItem('preventAutoReload');
                            window.location.reload();
                        }}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Recargar Página
                    </Button>
                </CardContent>
            </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
