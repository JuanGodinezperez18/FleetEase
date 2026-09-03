// components/layout/header.tsx
'use client';

import { useAuth } from '@/contexts/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, LogOut, Settings, User, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/hooks/use-data';
import { useState } from 'react';
import { NotificationsPopover } from '@/components/notifications/notifications-popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Header() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const { notifications } = useData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = !currentUser
    ? 0
    : notifications.filter(n => n.uid === currentUser.uid && !n.isRead).length;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada exitosamente');
      router.push('/login');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      editor: 'Editor',
      partner: 'Socio',
      client: 'Cliente',
      superAdmin: 'Super Admin',
    };
    return labels[role] || role;
  };

  const handleSettingsClick = () => {
    switch (currentUser?.role) {
      case 'partner':
        router.push('/partner/settings');
        break;
      case 'client':
        router.push('/client/settings');
        break;
      default:
        router.push('/dashboard/settings');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#080a0f]/85 px-4 backdrop-blur-xl md:px-6">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-white/[0.07] bg-[#0e1117] p-0 text-white">
          <div className="p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">Navegación</p>
            <p className="mt-2 text-sm text-white/60">El menú principal está disponible en la navegación del dashboard.</p>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-3">
        <div className="hidden h-8 w-1 rounded-full bg-[#d7ff3f] shadow-[0_0_18px_rgba(215,255,63,0.35)] md:block" />
        <div>
          <h1 className="hidden font-heading text-lg font-semibold tracking-tight text-white md:block">
            FleetEase <span className="text-[#d7ff3f]">Manager</span>
          </h1>
          <h1 className="font-heading text-base font-semibold tracking-tight text-white md:hidden">
            FleetEase <span className="text-[#d7ff3f]">Manager</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationsPopover>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/65 transition-all hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <Badge
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#080a0f] bg-[#d7ff3f] p-0 px-1 text-[10px] font-bold text-[#080a0f] shadow-[0_0_12px_rgba(215,255,63,0.35)]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </NotificationsPopover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2 text-white hover:border-white/[0.12] hover:bg-white/[0.06]"
            >
              <Avatar className="h-8 w-8 border border-[#d7ff3f]/30">
                <AvatarFallback className="bg-[#151a21] text-xs font-semibold text-[#d7ff3f]">
                  {currentUser?.name ? getInitials(currentUser.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="max-w-36 truncate text-sm font-medium text-white">
                  {currentUser?.name || 'Usuario'}
                </span>
                <span className="text-[11px] text-white/40">
                  {currentUser?.role ? getRoleLabel(currentUser.role) : 'Cargando...'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 border-white/[0.08] bg-[#0e1117]/95 text-white shadow-2xl backdrop-blur-xl"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-white">{currentUser?.name}</p>
                <p className="truncate text-xs text-white/40">{currentUser?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.07]" />
            <DropdownMenuItem
              onClick={() => router.push('/profile')}
              className="cursor-pointer rounded-lg text-white/70 focus:bg-white/[0.06] focus:text-white"
            >
              <User className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.8} />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSettingsClick}
              className="cursor-pointer rounded-lg text-white/70 focus:bg-white/[0.06] focus:text-white"
            >
              <Settings className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.8} />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.07]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer rounded-lg text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
            >
              <LogOut className="mr-2 h-4 w-4" strokeWidth={1.8} />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
