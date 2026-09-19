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
      <DialogContent className="flex max-h-[95dvh] w-[min(100vw-1rem,56rem)] max-w-[calc(100vw-1rem)] flex-col gap-3 overflow-hidden rounded-[20px] border-white/10 bg-[#0b0f14] p-4 text-white sm:max-h-[92vh] sm:w-full sm:max-w-xl sm:rounded-2xl sm:p-6 md:max-w-3xl lg:max-w-4xl">
        <DialogHeader className="shrink-0 space-y-1 pr-8">
          <DialogTitle className="font-heading text-base font-semibold tracking-tight text-white sm:text-lg">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-white/45 sm:text-sm">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="pb-2">{children}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
