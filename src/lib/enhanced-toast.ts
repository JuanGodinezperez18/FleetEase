import { toast as sonnerToast } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { createElement } from 'react';

/**
 * Sistema de notificaciones mejorado con iconos modernos de Lucide
 * Compatible con React 19 y optimizado para UX
 */

export const toast = {
  /**
   * Toast de éxito con icono CheckCircle2
   */
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      icon: createElement(CheckCircle2, { className: 'h-5 w-5' }),
      className: 'border-l-4 border-green-500 dark:border-green-400',
      duration: 4000,
    });
  },

  /**
   * Toast de error con icono XCircle
   * Duración más larga para permitir leer el mensaje
   */
  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      icon: createElement(XCircle, { className: 'h-5 w-5' }),
      className: 'border-l-4 border-red-500 dark:border-red-400',
      duration: 6000, // Más tiempo para errores
    });
  },

  /**
   * Toast de advertencia con icono AlertTriangle
   */
  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      icon: createElement(AlertTriangle, { className: 'h-5 w-5' }),
      className: 'border-l-4 border-yellow-500 dark:border-yellow-400',
      duration: 5000,
    });
  },

  /**
   * Toast informativo con icono Info
   */
  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      icon: createElement(Info, { className: 'h-5 w-5' }),
      className: 'border-l-4 border-blue-500 dark:border-blue-400',
      duration: 4000,
    });
  },

  /**
   * Toast de carga con spinner animado
   * Retorna el ID del toast para poder actualizarlo después
   */
  loading: (message: string) => {
    return sonnerToast.loading(message, {
      icon: createElement(Loader2, { className: 'h-5 w-5 animate-spin' }),
      duration: Infinity, // No desaparece automáticamente
    });
  },

  /**
   * Toast con promesa - Actualiza automáticamente según el estado
   * Ideal para operaciones asíncronas
   */
  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },

  /**
   * Cierra un toast específico por ID
   */
  dismiss: (toastId: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Cierra todos los toasts activos
   */
  dismissAll: () => {
    sonnerToast.dismiss();
  },
};
