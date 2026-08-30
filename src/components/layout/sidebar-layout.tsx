"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { GlobalLoader } from '../common/GlobalLoader';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setIsMounted(true), []);
  useEffect(() => setIsMobileMenuOpen(false), [pathname]);

  if (!isMounted) return <GlobalLoader />;

  return (
    <SidebarProvider>
      <div className="fe-app-shell flex h-screen overflow-hidden">
        <div className="hidden lg:block w-64 border-r border-white/[0.07] bg-sidebar shadow-[10px_0_40px_rgba(0,0,0,.12)]">
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080a0f]/85 backdrop-blur-2xl lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <Button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                variant="ghost"
                size="sm"
                className={cn("h-auto rounded-xl p-2 hover:bg-white/[0.06]", isMobileMenuOpen && "bg-white/[0.06]")}
                aria-label="Abrir menú"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <span className="text-sm font-semibold tracking-tight">FleetEase</span>
              <div className="h-9 w-9 rounded-full bg-[#d7ff3f]/10" />
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="w-72 border-r border-white/[0.08] bg-[#080a0f] p-0" onInteractOutside={() => setIsMobileMenuOpen(false)}>
                  <SheetHeader className="sr-only">
                    <SheetTitle>Menú</SheetTitle>
                    <SheetDescription>Navegación principal de la aplicación</SheetDescription>
                  </SheetHeader>
                  <Sidebar />
                </SheetContent>
              </Sheet>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-background">
            <div className="mx-auto min-h-full w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
