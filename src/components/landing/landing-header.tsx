"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";

const nav = [
  ["Producto", "#producto"],
  ["Cómo funciona", "#como-funciona"],
  ["Precios", "#pricing"],
  ["FAQ", "#faq"],
] as const;

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.07] bg-[var(--fe-ink)]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[68px] sm:h-[76px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3.5" aria-label="FleetEase inicio">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="FleetEase - Software de gestión de flotillas"
              width={48}
              height={48}
              className="h-11 w-11 sm:h-12 sm:w-12 object-contain"
              priority
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.03em]">
              <span className="text-white">Fleet</span>
              <span className="text-[var(--fe-lime)]">Ease</span>
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <span className="h-px w-5 bg-[var(--fe-lime)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)]" />
              <span className="h-px w-5 bg-[var(--fe-lime)]" />
            </span>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {nav.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-sm text-[13px] font-medium text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <Link href="/login" className="rounded-sm text-[13px] font-medium text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]">
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="group flex items-center gap-2 rounded-full bg-[var(--fe-lime)] px-5 py-2.5 text-[13px] font-bold text-[var(--fe-ink)] transition hover:bg-white"
          >
            Empezar ahora{" "}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] md:hidden"
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
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-sm text-base text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)]"
                >
                  {label}
                </Link>
              ))}
              <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-sm text-base text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)]">
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-[var(--fe-lime)] px-5 py-3 text-center font-bold text-[var(--fe-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]"
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
