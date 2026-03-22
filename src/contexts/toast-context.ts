
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// Este archivo se mantiene como estaba, no se necesita lógica adicional aquí
// ya que el problema estaba en cómo se usaba, no en su definición.

export type ToasterToast = ToastProps & {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
};

export type Toast = Omit<ToasterToast, "id">;

export interface ToastContextType {
    toasts: ToasterToast[];
    toast: (props: Toast) => {
        id: string;
        dismiss: () => void;
        update: (props: ToasterToast) => void;
    };
    dismiss: (toastId?: string) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(undefined);
