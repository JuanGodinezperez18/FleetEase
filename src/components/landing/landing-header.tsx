"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

const nav = [
  ["Producto", "#producto"],
  ["Funciones", "/funciones"],
  ["Precios", "#pricing"],
  ["Soluciones", "/soluciones"],
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]";

export function LandingHeader({ secondary = false }: { secondary?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const menuButton = useRef<HTMLButtonElement>(null);
  const destination = (href: string) => secondary && href.startsWith('#') ? `/${href}` : href;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-[var(--header-h)] border-b border-white/[0.07] bg-[var(--fe-ink)]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <BrandLogo size={56} priority className="gap-3.5" />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {nav.map(([label, href]) => (
            <a
              key={label}
              href={destination(href)}
              className={`inline-flex min-h-11 items-center rounded-sm text-[13px] font-medium text-white/60 transition-colors hover:text-white ${focusRing}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <Link
            href="/login"
            className={`rounded-sm text-[13px] font-medium text-white/60 transition hover:text-white ${focusRing}`}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className={`group flex items-center gap-2 rounded-full bg-[var(--fe-lime)] px-5 py-2.5 text-[13px] font-bold text-[var(--fe-ink)] transition hover:bg-white ${focusRing}`}
          >
            Empezar ahora{" "}
            <ArrowRight className="h-4 w-4 transition motion-safe:group-hover:translate-x-0.5" />
          </Link>
        </div>
        <button
          ref={menuButton}
          type="button"
          className={`flex h-11 w-11 items-center justify-center rounded-lg text-white/80 ${focusRing} md:hidden`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="landing-mobile-menu"
            initial={{ y: reduceMotion ? 0 : -6, opacity: reduceMotion ? 1 : 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduceMotion ? 0 : -6, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            className="max-h-[calc(100dvh-var(--header-h))] overflow-y-auto border-t border-white/[0.07] bg-[var(--fe-ink)] md:hidden"
          >
            <div className="flex flex-col gap-5 px-5 py-6">
              {nav.map(([label, href]) => (
                <a
                  key={label}
                  href={destination(href)}
                  onClick={() => setMenuOpen(false)}
                  className={`inline-flex min-h-11 items-center rounded-sm text-base text-white/70 ${focusRing}`}
                >
                  {label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className={`rounded-sm text-base text-white/70 ${focusRing}`}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl bg-[var(--fe-lime)] px-5 py-3 text-center font-bold text-[var(--fe-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]`}
              >
                Empezar ahora
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
