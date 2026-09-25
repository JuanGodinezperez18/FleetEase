"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Selector de tema (claro / oscuro / sistema).
 * Usa next-themes; la clase dark|light se aplica en <html>.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-xl border fe-border-subtle bg-[var(--fe-hover)] fe-text-secondary"
        aria-label="Tema"
        disabled
      >
        <Sun className="h-[18px] w-[18px] opacity-40" strokeWidth={1.75} />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-xl border fe-border-subtle bg-[var(--fe-hover)] fe-text-secondary transition-all hover:bg-[var(--fe-hover-strong)] hover:text-[var(--fe-text)]"
          aria-label="Cambiar tema"
        >
          {isDark ? (
            <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="fe-panel-bg w-40 border shadow-2xl backdrop-blur-xl">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer gap-2 rounded-lg fe-text-secondary focus:bg-[var(--fe-hover)] focus:text-[var(--fe-text)]"
        >
          <Sun className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
          Claro
          {theme === "light" && <span className="ml-auto text-[10px] text-[#d7ff3f]">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer gap-2 rounded-lg fe-text-secondary focus:bg-[var(--fe-hover)] focus:text-[var(--fe-text)]"
        >
          <Moon className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
          Oscuro
          {theme === "dark" && <span className="ml-auto text-[10px] text-[#d7ff3f]">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer gap-2 rounded-lg fe-text-secondary focus:bg-[var(--fe-hover)] focus:text-[var(--fe-text)]"
        >
          <Monitor className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
          Sistema
          {theme === "system" && <span className="ml-auto text-[10px] text-[#d7ff3f]">●</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
