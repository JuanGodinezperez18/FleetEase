'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Home,
  Users,
  Car,
  DollarSign,
  CreditCard,
  Settings,
  FileText,
  Gauge,
  Building,
  UserPlus,
  TruckIcon,
  Calculator,
  Search,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ElementType;
  action: () => void;
  category: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customCommands?: CommandItem[];
}

export function CommandPalette({
  open,
  onOpenChange,
  customCommands = [],
}: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const defaultCommands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Ir al Dashboard',
        description: 'Página principal',
        icon: Home,
        category: 'Navegación',
        action: () => {
          router.push('/dashboard');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-clients',
        label: 'Ver Clientes',
        description: 'Lista de clientes',
        icon: Users,
        category: 'Navegación',
        action: () => {
          router.push('/dashboard/clients');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-vehicles',
        label: 'Ver Vehículos',
        description: 'Flota de vehículos',
        icon: Car,
        category: 'Navegación',
        keywords: ['flota', 'autos'],
        action: () => {
          router.push('/dashboard/vehicles');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-finanzas',
        label: 'Ver Finanzas',
        description: 'Ingresos y gastos',
        icon: DollarSign,
        category: 'Navegación',
        keywords: ['dinero', 'plata', 'ingresos', 'gastos'],
        action: () => {
          router.push('/dashboard/finanzas');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-credits',
        label: 'Ver Créditos',
        description: 'Gestión de créditos',
        icon: CreditCard,
        category: 'Navegación',
        keywords: ['préstamos', 'pagos'],
        action: () => {
          router.push('/dashboard/credits');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-partners',
        label: 'Ver Socios',
        description: 'Lista de socios',
        icon: UserPlus,
        category: 'Navegación',
        action: () => {
          router.push('/dashboard/partners');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-companies',
        label: 'Ver Compañías',
        description: 'Gestión de compañías',
        icon: Building,
        category: 'Navegación',
        keywords: ['empresas'],
        action: () => {
          router.push('/dashboard/companies');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-mileage',
        label: 'Ver Kilometraje',
        description: 'Registros de kilometraje',
        icon: Gauge,
        category: 'Navegación',
        keywords: ['km', 'mantenimiento'],
        action: () => {
          router.push('/dashboard/mileage');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-reports',
        label: 'Ver Reportes',
        description: 'Reportes y estadísticas',
        icon: FileText,
        category: 'Navegación',
        keywords: ['estadísticas', 'análisis'],
        action: () => {
          router.push('/dashboard/reports');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-settings',
        label: 'Configuración',
        description: 'Ajustes del sistema',
        icon: Settings,
        category: 'Navegación',
        action: () => {
          router.push('/dashboard/settings');
          onOpenChange(false);
        },
      },
    ],
    [router, onOpenChange]
  );

  const allCommands = useMemo(
    () => [...defaultCommands, ...customCommands],
    [defaultCommands, customCommands]
  );

  const groupedCommands = useMemo(() => {
    return allCommands.reduce((acc, command) => {
      if (!acc[command.category]) {
        acc[command.category] = [];
      }
      acc[command.category].push(command);
      return acc;
    }, {} as Record<string, CommandItem[]>);
  }, [allCommands]);

  const handleSelect = (command: CommandItem) => {
    command.action();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar comandos, páginas..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No se encontraron resultados
            </p>
          </div>
        </CommandEmpty>

        {Object.entries(groupedCommands).map(([category, commands], index) => (
          <React.Fragment key={category}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={category}>
              {commands.map((command) => {
                const Icon = command.icon;
                return (
                  <CommandItem
                    key={command.id}
                    value={`${command.label} ${command.description} ${command.keywords?.join(' ') || ''}`}
                    onSelect={() => handleSelect(command)}
                    className="flex items-center gap-2 py-3"
                  >
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex-1">
                      <div className="font-medium">{command.label}</div>
                      {command.description && (
                        <div className="text-xs text-muted-foreground">
                          {command.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
