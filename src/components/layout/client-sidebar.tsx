
// components/layout/client-sidebar.tsx
'use client';

import { Home, Car, CreditCard, FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const clientNavItems = [
  { href: '/client', icon: Home, label: 'Inicio' },
  { href: '/client/vehicle', icon: Car, label: 'Mi Vehículo' },
  { href: '/client/payments', icon: CreditCard, label: 'Pagos' },
  { href: '/client/mileage', icon: FileText, label: 'Kilometraje' },
  { href: '/client/settings', icon: Settings, label: 'Configuración' },
];

export function ClientSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-background border-r">
      <div className="p-6">
        <h2 className="text-lg font-semibold">FleetEase</h2>
      </div>
      <nav className="px-3 space-y-1">
        {clientNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}