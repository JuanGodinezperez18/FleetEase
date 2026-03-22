
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
import { useMemo, useState } from 'react';
import { NotificationsPopover } from '@/components/notifications/notifications-popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Header() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const { notifications } = useData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // React 19: No useMemo needed for simple filter
  const unreadCount = !currentUser ? 0 :
    notifications.filter(n => n.uid === currentUser.uid && !n.isRead).length;

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

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500',
      editor: 'bg-blue-500',
      partner: 'bg-green-500',
      client: 'bg-purple-500',
      superAdmin: 'bg-orange-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  const handleSettingsClick = () => {
    // Redirigir según el rol
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
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      {/* Mobile Menu Button (solo visible en móvil) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          {/* Aquí puedes agregar la versión móvil del sidebar si lo necesitas */}
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Menu móvil</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo / Título */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold hidden md:block">
          FleetEase Manager
        </h1>
        <h1 className="text-lg font-bold md:hidden">
          FleetEase
        </h1>
      </div>

      {/* Acciones del Usuario */}
      <div className="flex items-center gap-2">
        {/* Notificaciones */}
        <NotificationsPopover>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </NotificationsPopover>

        {/* Menú de Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`${getRoleColor(currentUser?.role || 'client')} text-white`}>
                  {currentUser?.name ? getInitials(currentUser.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-medium">
                  {currentUser?.name || 'Usuario'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentUser?.role ? getRoleLabel(currentUser.role) : 'Cargando...'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}