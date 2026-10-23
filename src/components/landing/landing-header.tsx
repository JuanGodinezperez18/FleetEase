"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

const nav = [
  ["Producto", "#producto"],
  ["Cómo funciona", "#como-funciona"],
  ["Precios", "#pricing"],
  ["FAQ", "#faq"],
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]";

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-[var(--header-h)] border-b border-white/[0.07] bg-[var(--fe-ink)]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <BrandLogo size={56} priority className="gap-3.5" />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {nav.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className={`rounded-sm text-[13px] font-medium text-white/60 transition hover:text-white ${focusRing}`}
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
          type="button"
          className={`rounded-lg p-2 text-white/80 ${focusRing} md:hidden`}
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.07] bg-[var(--fe-ink)] md:hidden"
          >
            <div className="flex flex-col gap-5 px-5 py-6">
              {nav.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-sm text-base text-white/70 ${focusRing}`}
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
