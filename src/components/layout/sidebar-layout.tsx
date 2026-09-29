"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "../common/GlobalLoader";
import { ThemeToggle } from "./theme-toggle";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

function SidebarLayoutContent({ children }: SidebarLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();

  useEffect(() => setIsMounted(true), []);
  useEffect(() => setOpenMobile(false), [pathname, setOpenMobile]);

  if (!isMounted) return <GlobalLoader />;

  return (
    <>
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
        <div className="fe-shell-bg hidden w-64 shrink-0 border-r fe-border-subtle shadow-[10px_0_40px_rgba(0,0,0,.12)] dark:shadow-[10px_0_40px_rgba(0,0,0,.35)] xl:block">
          <Sidebar />
        </div>

        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            side="left"
            className="w-[18rem] max-w-[85vw] border-r border-[var(--fe-border)] bg-[var(--fe-bg)] p-0 text-[var(--fe-text)] shadow-[var(--fe-shadow-dialog)] xl:hidden [&>button]:hidden"
          >
            <Sidebar collapsible="none" />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className="sticky top-0 z-30 border-b fe-border-subtle backdrop-blur-2xl xl:hidden"
            style={{ backgroundColor: "color-mix(in srgb, var(--fe-bg) 90%, transparent)" }}
          >
            <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:h-16 sm:px-6">
              <Button
                onClick={() => setOpenMobile(!openMobile)}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-10 w-10 rounded-xl p-0 fe-text-secondary hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]",
                  openMobile && "bg-[var(--fe-hover)] fe-text"
                )}
                aria-label={openMobile ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={openMobile}
              >
                {openMobile ? (
                  <X className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  <Menu className="h-5 w-5" strokeWidth={1.75} />
                )}
              </Button>
              <span className="justify-self-center font-heading text-sm font-semibold tracking-[-0.02em] fe-text sm:text-base">FleetEase</span>
              <div className="justify-self-end"><ThemeToggle /></div>
            </div>
          </header>

          <main className="fe-main-bg flex-1 overflow-auto">
            <div className="mx-auto min-h-full w-full max-w-[1440px] p-4 sm:p-6 xl:p-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <SidebarLayoutContent>{children}</SidebarLayoutContent>
    </SidebarProvider>
  );
}
