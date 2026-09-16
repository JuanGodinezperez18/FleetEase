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
        setTimeout(() => {
          restoreBodyInteraction();
        }, 300);
      }
    },
    [onClose]
  );

  useEffect(() => {
    return () => {
      if (!isOpen) {
        restoreBodyInteraction();
      }
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[92vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[72vh] pr-2 sm:max-h-[78vh]">
          {children}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
