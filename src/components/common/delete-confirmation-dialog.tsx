
"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isDeleting?: boolean;
  titleText?: string;
  descriptionText?: string;
  cancelText?: string;
  confirmText?: string;
  deletingText?: string;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isDeleting = false,
  titleText = "¿Estás seguro?",
  descriptionText,
  cancelText = "Cancelar",
  confirmText = "Eliminar",
  deletingText = "Eliminando...",
}: DeleteConfirmationDialogProps) {
  const finalDescription = descriptionText || `Esta acción no se puede deshacer. Esto eliminará permanentemente "${itemName}".`;

  const handleOpenChange = (open: boolean) => {
    // Solo permitir que el diálogo se cierre si no se está eliminando
    if (!isDeleting) {
      if (!open) {
        onClose();
      }
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titleText}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            {finalDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>
              {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // Prevenir cierre automático
              onConfirm();
            }}
            disabled={isDeleting}
            asChild
          >
            <Button variant="destructive">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? deletingText : confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
