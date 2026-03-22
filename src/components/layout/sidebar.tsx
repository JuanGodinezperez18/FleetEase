
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SidebarNav } from './sidebar-nav';
import { useAuth } from '@/contexts/auth-provider';
import { LogOut as LogOutIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FleetEaseLogo } from '../icons/fleet-ease-logo';
import { GlobalLoader } from '../common/GlobalLoader';
import { CompanySwitcher } from './company-switcher';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SidebarHeaderContent = () => {
  const { state } = useSidebar();
  
  return (
    <div className={cn(
      "flex items-center gap-2.5 transition-all duration-300",
      state === 'collapsed' ? "justify-center" : "justify-start"
    )}>
      <div className="relative shrink-0">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
        <FleetEaseLogo className={cn(
          "relative transition-all duration-300",
          state === 'collapsed' ? "h-10 w-10" : "h-8 w-8"
        )} />
      </div>
      {state === 'expanded' && (
        <span className="text-lg font-headline font-bold text-sidebar-foreground whitespace-nowrap">
          FleetEase
        </span>
      )}
    </div>
  );
};

const UserProfileSection = () => {
  const { currentUser } = useAuth();
  const { state } = useSidebar();
  
  if (!currentUser) return null;

  const initials = currentUser.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser.email[0].toUpperCase();

  const roleLabels: Record<string, string> = {
    superAdmin: 'Super Admin',
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador'
  };

  return (
    <div className={cn(
      "flex items-center gap-3 transition-all duration-300",
      state === 'collapsed' ? "justify-center" : "justify-start"
    )}>
      <Avatar className={cn(
        "ring-2 ring-sidebar-accent transition-all duration-300 shrink-0",
        state === 'collapsed' ? "h-10 w-10" : "h-9 w-9"
      )}>
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      {state === 'expanded' && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">
            {currentUser.name || currentUser.email}
          </p>
          <p className="text-xs text-sidebar-foreground/60 truncate">
            {roleLabels[currentUser.role] || currentUser.role}
          </p>
        </div>
      )}
    </div>
  );
};

const SidebarFooterContent = () => {
  const { logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { state } = useSidebar();

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Sesión cerrada exitosamente." });
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ 
        title: "Falló el cierre de sesión", 
        description: (error as Error).message, 
        variant: "destructive" 
      });
    }
  };

  if (state === 'collapsed') {
    return (
      <div className="p-2 mt-auto border-t border-sidebar-border/50 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          <LogOutIcon className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 mt-auto border-t border-sidebar-border/50 shrink-0">
      <Button
        variant="ghost"
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group"
        onClick={handleLogout}
      >
        <LogOutIcon className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
        Cerrar Sesión
      </Button>
    </div>
  );
};

export function Sidebar() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { state } = useSidebar();

  React.useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, authLoading, router]);

  if (authLoading || !currentUser) {
    return <GlobalLoader />;
  }

  return (
    <aside
      className="flex flex-col h-full bg-sidebar text-sidebar-foreground"
      role="navigation"
      aria-label="Panel de navegación principal"
    >
      {/* Header con logo y nombre de la app */}
      <div className={cn(
        "border-b border-sidebar-border/50 shrink-0 transition-all duration-300",
        state === 'collapsed' ? "p-3" : "p-4"
      )}>
        <SidebarHeaderContent />
      </div>

      {/* Sección de perfil de usuario - SEPARADA */}
      <div className={cn(
        "border-b border-sidebar-border/50 shrink-0 transition-all duration-300",
        state === 'collapsed' ? "p-3" : "px-4 py-3"
      )}>
        <UserProfileSection />
      </div>

      {/* Company Switcher para SuperAdmin */}
      {currentUser.role === 'superAdmin' && (
        <div className={cn(
          "shrink-0 border-b border-sidebar-border/50 transition-all duration-300",
          state === 'collapsed' ? "p-2" : "p-3"
        )}>
          <CompanySwitcher />
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-4 transition-all duration-300 scrollbar-thin scrollbar-thumb-sidebar-accent scrollbar-track-transparent",
        state === 'collapsed' ? "px-2" : "px-3"
      )}>
        <SidebarNav />
      </nav>
      
      {/* Footer */}
      <SidebarFooterContent />
    </aside>
  );
}
