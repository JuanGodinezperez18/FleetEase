'use client';

import { toast as sonnerToast } from 'sonner';
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useEnhancedToast() {
  const success = (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 3000,
      icon: <CheckCircle2 />,
      className: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      icon: <XCircle />,
      className: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: <AlertCircle />,
      className: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 3000,
      icon: <Info />,
      className: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  };

  const loading = (message: string, options?: Omit<ToastOptions, 'action'>) => {
    return sonnerToast.loading(message, {
      description: options?.description,
      icon: <Loader2 />,
      className: 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800',
    });
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss: sonnerToast.dismiss,
  };
}
