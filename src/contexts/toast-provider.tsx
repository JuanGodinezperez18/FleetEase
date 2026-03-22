"use client";

import React, { useState, useCallback } from 'react';
import { ToastContext, type Toast, type ToasterToast } from './toast-context';

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

export const TOAST_LIMIT = 5;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToasterToast[]>([]);

  const toast = useCallback((props: Toast) => {
    const id = genId();
    const update = (props: ToasterToast) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === props.id ? { ...t, ...props } : t))
      );
    };
    const dismiss = () => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    setToasts((prev) => {
      const newToast: ToasterToast = { id, ...props };
      const updatedToasts = [newToast, ...prev];
      return updatedToasts.slice(0, TOAST_LIMIT);
    });

    return { id, dismiss, update };
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    setToasts((prev) =>
      toastId ? prev.filter((t) => t.id !== toastId) : []
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
};
