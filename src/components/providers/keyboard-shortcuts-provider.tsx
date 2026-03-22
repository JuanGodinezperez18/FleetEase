'use client';

import React, { useState } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { CommandPalette } from '@/components/common/command-palette';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const router = useRouter();

  useKeyboardShortcuts([
    // Command Palette
    {
      key: 'cmd+k',
      handler: () => setCommandPaletteOpen(true),
      description: 'Abrir paleta de comandos',
      preventDefault: true,
    },
    {
      key: 'ctrl+k',
      handler: () => setCommandPaletteOpen(true),
      description: 'Abrir paleta de comandos',
      preventDefault: true,
    },
    // Quick Navigation
    {
      key: 'alt+h',
      handler: () => router.push('/dashboard'),
      description: 'Ir al inicio',
    },
    {
      key: 'alt+c',
      handler: () => router.push('/dashboard/clients'),
      description: 'Ir a clientes',
    },
    {
      key: 'alt+v',
      handler: () => router.push('/dashboard/vehicles'),
      description: 'Ir a vehículos',
    },
    {
      key: 'alt+f',
      handler: () => router.push('/dashboard/finanzas'),
      description: 'Ir a finanzas',
    },
    {
      key: 'alt+s',
      handler: () => router.push('/dashboard/settings'),
      description: 'Ir a configuración',
    },
    // Search
    {
      key: '/',
      handler: () => {
        const searchInput = document.querySelector('[data-datatable-search-input="true"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          setCommandPaletteOpen(true);
        }
      },
      description: 'Enfocar búsqueda',
    },
    // Help
    {
      key: '?',
      handler: () => {
        toast('Atajos de Teclado', {
          description: (
            <div className="space-y-2 text-sm">
              <div><kbd>Cmd/Ctrl + K</kbd> - Paleta de comandos</div>
              <div><kbd>Alt + H</kbd> - Ir al inicio</div>
              <div><kbd>Alt + C</kbd> - Ir a clientes</div>
              <div><kbd>Alt + V</kbd> - Ir a vehículos</div>
              <div><kbd>Alt + F</kbd> - Ir a finanzas</div>
              <div><kbd>/</kbd> - Enfocar búsqueda</div>
              <div><kbd>?</kbd> - Ver atajos</div>
            </div>
          ),
        });
      },
      description: 'Mostrar atajos de teclado',
      preventDefault: true,
    },
  ], { enabled: true, ignoreInputFields: false });

  return (
    <>
      {children}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  );
}
