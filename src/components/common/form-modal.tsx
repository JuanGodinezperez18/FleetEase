// components/common/form-modal.tsx
"use client";
import React, { useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { restoreBodyInteraction } from "@/lib/cleanup-radix";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormModal({ isOpen, onClose, title, description, children }: FormModalProps) {
  
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
        // Forzar restauración del body 300ms después para asegurar que la animación del modal termine
        setTimeout(() => {
          restoreBodyInteraction();
        }, 300);
      }
    },
    [onClose]
  );

  useEffect(() => {
    // Si el modal se cierra abruptamente, intentar limpiar
    return () => {
      if (!isOpen) {
        restoreBodyInteraction();
      }
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] sm:max-h-[70vh] pr-2">
          {children}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
