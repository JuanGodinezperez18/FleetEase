'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Car, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/dashboard/finanzas', icon: FileText, label: 'Finanzas' },
  { href: '/dashboard/vehicles', icon: Car, label: 'Flota' },
  { href: '/dashboard/clients', icon: Users, label: 'Clientes' },
  { href: '/dashboard/settings', icon: Settings, label: 'Ajustes' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-border md:hidden safe-area-bottom"
      role="navigation"
      aria-label="Navegación móvil principal"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
