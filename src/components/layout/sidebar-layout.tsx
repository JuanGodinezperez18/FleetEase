"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "../common/GlobalLoader";

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
      <style jsx global>{`
        @keyframes fe-sidebar-item-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fe-sidebar-submenu-in {
          from { opacity: 0; transform: translateY(-5px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 700px; }
        }
        .fe-sidebar-nav > * {
          animation: fe-sidebar-item-in 360ms cubic-bezier(.22,1,.36,1) both;
        }
        .fe-sidebar-nav > *:nth-child(1) { animation-delay: 20ms; }
        .fe-sidebar-nav > *:nth-child(2) { animation-delay: 35ms; }
        .fe-sidebar-nav > *:nth-child(3) { animation-delay: 50ms; }
        .fe-sidebar-nav > *:nth-child(4) { animation-delay: 65ms; }
        .fe-sidebar-nav > *:nth-child(5) { animation-delay: 80ms; }
        .fe-sidebar-nav > *:nth-child(6) { animation-delay: 95ms; }
        .fe-sidebar-nav > *:nth-child(7) { animation-delay: 110ms; }
        .fe-sidebar-nav > *:nth-child(8) { animation-delay: 125ms; }
        .fe-sidebar-nav > *:nth-child(9) { animation-delay: 140ms; }
        .fe-sidebar-nav > *:nth-child(10) { animation-delay: 155ms; }
        .fe-sidebar-nav > *:nth-child(11) { animation-delay: 170ms; }
        .fe-sidebar-nav > *:nth-child(12) { animation-delay: 185ms; }
        .fe-sidebar-nav > *:nth-child(13) { animation-delay: 200ms; }
        .fe-sidebar-submenu {
          transform-origin: top;
          animation: fe-sidebar-submenu-in 280ms cubic-bezier(.22,1,.36,1) both;
          overflow: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .fe-sidebar-nav > *,
          .fe-sidebar-submenu {
            animation: none !important;
          }
        }
      `}</style>

      <div className="fe-app-shell fe-shell-bg flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <div className="fe-shell-bg hidden w-64 shrink-0 border-r fe-border-subtle shadow-[10px_0_40px_rgba(0,0,0,.12)] dark:shadow-[10px_0_40px_rgba(0,0,0,.35)] lg:block">
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header className="fe-shell-bg/90 sticky top-0 z-30 border-b fe-border-subtle backdrop-blur-2xl lg:hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--fe-bg) 90%, transparent)' }}>
            <div className="flex h-14 items-center justify-between px-4">
              <Button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-10 w-10 rounded-xl p-0 fe-text-secondary hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]",
                  isMobileMenuOpen && "bg-[var(--fe-hover)] fe-text"
                )}
                aria-label="Abrir menú"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  <Menu className="h-5 w-5" strokeWidth={1.75} />
                )}
              </Button>
              <span className="font-heading text-sm font-semibold tracking-[-0.02em] fe-text">FleetEase</span>
              <div className="h-8 w-8 rounded-full border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.08]" />
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent
                  side="left"
                  className="fe-shell-bg w-72 border-r fe-border-subtle p-0 fe-text"
                  onInteractOutside={() => setIsMobileMenuOpen(false)}
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Menú</SheetTitle>
                    <SheetDescription>Navegación principal de la aplicación</SheetDescription>
                  </SheetHeader>
                  <Sidebar />
                </SheetContent>
              </Sheet>
            </div>
          </header>

          <main className="fe-main-bg flex-1 overflow-auto">
            <div className="mx-auto min-h-full w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
