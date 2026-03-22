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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (!isMounted) {
    return <GlobalLoader />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden lg:block w-64 border-r border-border bg-sidebar shadow-sm">
          <Sidebar />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
           <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm lg:hidden">
            <div className="flex items-center justify-between px-4 h-16">
                <Button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  variant="ghost" 
                  size="sm" 
                  className={cn("p-2 h-auto hover:bg-accent", isMobileMenuOpen && "bg-accent")}
                  aria-label="Abrir menú"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                 <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetContent side="left" className="p-0 w-64 border-r" onInteractOutside={() => setIsMobileMenuOpen(false)}>
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
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
