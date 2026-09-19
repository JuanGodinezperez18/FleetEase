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
      toast.success('Sesi\u00f3n cerrada exitosamente');
      router.push('/login');
    } catch {
      toast.error('Error al cerrar sesi\u00f3n');
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
      viewer: 'Visualizador',
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
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#080a0f]/90 px-4 backdrop-blur-2xl sm:h-16 md:px-6">
      {/* Mobile menu trigger (partner/client layouts) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
            aria-label="Abrir men\u00fa"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-white/[0.06] bg-[#080a0f] p-0 text-white">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              FleetEase
            </div>
            <p className="font-heading text-base font-semibold text-white">Navegaci\u00f3n</p>
            <p className="mt-1 text-xs text-white/40">Usa el men\u00fa lateral para moverte entre m\u00f3dulos.</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="hidden h-7 w-1 rounded-full bg-[#d7ff3f] shadow-[0_0_14px_rgba(215,255,63,0.4)] sm:block" />
        <div>
          <h1 className="font-heading text-base font-semibold tracking-[-0.03em] text-white sm:text-lg">
            FleetEase <span className="text-[#d7ff3f]">Manager</span>
          </h1>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <NotificationsPopover>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/65 transition-all hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
            aria-label="Notificaciones"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#080a0f] bg-[#d7ff3f] px-1 text-[10px] font-bold text-[#080a0f] shadow-[0_0_12px_rgba(215,255,63,0.35)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </NotificationsPopover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 text-white hover:border-white/[0.12] hover:bg-white/[0.06]"
            >
              <Avatar className="h-8 w-8 border border-[#d7ff3f]/25">
                <AvatarFallback className="bg-[#d7ff3f]/[0.12] text-xs font-semibold text-[#d7ff3f]">
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
              <User className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSettingsClick}
              className="cursor-pointer rounded-lg text-white/70 focus:bg-white/[0.06] focus:text-white"
            >
              <Settings className="mr-2 h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
              <span>Configuraci\u00f3n</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.07]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer rounded-lg text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
            >
              <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} />
              <span>Cerrar Sesi\u00f3n</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
