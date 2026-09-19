"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { useAuth } from "@/contexts/auth-provider";
import { LogOut as LogOutIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FleetEaseLogo } from "../icons/fleet-ease-logo";
import { GlobalLoader } from "../common/GlobalLoader";
import { CompanySwitcher } from "./company-switcher";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SidebarHeaderContent = () => {
  const { state } = useSidebar();
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 transition-all duration-300",
        state === "collapsed" ? "justify-center" : "justify-start"
      )}
    >
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-full bg-[#d7ff3f]/15 blur-xl" />
        <FleetEaseLogo
          className={cn("relative transition-all duration-300", state === "collapsed" ? "h-10 w-10" : "h-8 w-8")}
        />
      </div>
      {state === "expanded" && (
        <div className="min-w-0">
          <span className="font-heading text-base font-semibold tracking-[-0.03em] text-white">FleetEase</span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Fleet OS</p>
        </div>
      )}
    </div>
  );
};

const UserProfileSection = () => {
  const { currentUser } = useAuth();
  const { state } = useSidebar();
  if (!currentUser) return null;

  const initials = currentUser.name
    ? currentUser.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : currentUser.email[0].toUpperCase();

  const roleLabels: Record<string, string> = {
    superAdmin: "Super Admin",
    admin: "Administrador",
    editor: "Editor",
    viewer: "Visualizador",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 transition-all duration-300",
        state === "collapsed" ? "justify-center" : "justify-start"
      )}
    >
      <Avatar
        className={cn(
          "shrink-0 ring-2 ring-[#d7ff3f]/20 transition-all duration-300",
          state === "collapsed" ? "h-10 w-10" : "h-9 w-9"
        )}
      >
        <AvatarFallback className="bg-[#d7ff3f]/[0.12] text-sm font-semibold text-[#d7ff3f]">
          {initials}
        </AvatarFallback>
      </Avatar>
      {state === "expanded" && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/90">{currentUser.name || currentUser.email}</p>
          <p className="truncate text-[11px] text-white/40">{roleLabels[currentUser.role] || currentUser.role}</p>
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
      router.push("/login");
    } catch (error) {
      toast({
        title: "Falló el cierre de sesión",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  if (state === "collapsed") {
    return (
      <div className="mt-auto shrink-0 border-t border-white/[0.06] p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-full text-white/50 hover:bg-white/[0.06] hover:text-white"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          <LogOutIcon className="h-5 w-5" strokeWidth={1.75} />
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-auto shrink-0 border-t border-white/[0.06] p-3">
      <Button
        variant="ghost"
        className="w-full justify-start rounded-xl text-white/50 hover:bg-white/[0.06] hover:text-white"
        onClick={handleLogout}
      >
        <LogOutIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
        Cerrar sesión
      </Button>
    </div>
  );
};

export function Sidebar() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { state } = useSidebar();

  React.useEffect(() => {
    if (!authLoading && !currentUser) router.replace("/login");
  }, [currentUser, authLoading, router]);

  if (authLoading || !currentUser) return <GlobalLoader />;

  return (
    <aside
      className="flex h-full flex-col bg-[#080a0f] text-white"
      role="navigation"
      aria-label="Panel de navegación principal"
    >
      <div
        className={cn(
          "shrink-0 border-b border-white/[0.06] transition-all duration-300",
          state === "collapsed" ? "p-3" : "p-4"
        )}
      >
        <SidebarHeaderContent />
      </div>

      <div
        className={cn(
          "shrink-0 border-b border-white/[0.06] transition-all duration-300",
          state === "collapsed" ? "p-3" : "px-4 py-3"
        )}
      >
        <UserProfileSection />
      </div>

      {currentUser.role === "superAdmin" && (
        <div
          className={cn(
            "shrink-0 border-b border-white/[0.06] transition-all duration-300",
            state === "collapsed" ? "p-2" : "p-3"
          )}
        >
          <CompanySwitcher />
        </div>
      )}

      <nav
        className={cn(
          "fe-sidebar-nav flex-1 overflow-y-auto py-3 transition-all duration-300 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
          state === "collapsed" ? "px-2" : "px-2.5"
        )}
      >
        <SidebarNav />
      </nav>

      <SidebarFooterContent />
    </aside>
  );
}
