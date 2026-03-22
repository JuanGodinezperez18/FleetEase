"use client";

import * as React from "react";
import { KeyboardIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface KeyboardShortcut {
  key: string;
  handler: () => void;
  description?: string;
  category?: string;
}

function formatShortcut(shortcut: KeyboardShortcut): string {
  return shortcut.key.split('+').map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' + ');
}

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({
  shortcuts,
  open: controlledOpen,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  // Agrupar shortcuts por categoría
  const shortcutsByCategory = React.useMemo(() => {
    const grouped = new Map<string, KeyboardShortcut[]>();

    shortcuts.forEach(shortcut => {
      const category = shortcut.category || 'General';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(shortcut);
    });

    return grouped;
  }, [shortcuts]);

  // Listener para abrir con ?
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + / = ?
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setOpen(true);
      }
      // Escape para cerrar
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyboardIcon className="h-5 w-5" />
            Atajos de Teclado
          </DialogTitle>
          <DialogDescription>
            Usa estos atajos para navegar más rápido por la aplicación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Array.from(shortcutsByCategory.entries()).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={`${category}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <Badge
                      variant="outline"
                      className="font-mono text-xs px-2 py-1 bg-background"
                    >
                      {formatShortcut(shortcut)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
              <span className="text-sm font-medium">Ver esta ayuda</span>
              <Badge variant="outline" className="font-mono text-xs px-2 py-1 bg-background">
                ?
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-close-button="true"
          >
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Trigger button para abrir el diálogo de ayuda
 */
interface KeyboardShortcutsButtonProps {
  onClick: () => void;
}

export function KeyboardShortcutsButton({ onClick }: KeyboardShortcutsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="gap-2"
      title="Ver atajos de teclado (Shift + ?)"
    >
      <KeyboardIcon className="h-4 w-4" />
      <span className="hidden md:inline">Atajos</span>
      <Badge variant="outline" className="font-mono text-xs hidden lg:inline-flex">
        ?
      </Badge>
    </Button>
  );
}
