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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.07] bg-[#080a0f]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[64px] sm:h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="FleetEase inicio">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-white">
            <Image
              src="/logo.png"
              alt="FleetEase - Software de gestión de flotillas"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </div>
          <span className="text-[19px] font-semibold tracking-[-0.03em]">FleetEase</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {nav.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-sm text-[13px] font-medium text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a0f]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <Link href="/login" className="rounded-sm text-[13px] font-medium text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a0f]">
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="group flex items-center gap-2 rounded-full bg-[#d7ff3f] px-5 py-2.5 text-[13px] font-bold text-[#080a0f] transition hover:bg-white"
          >
            Empezar ahora{" "}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f] md:hidden"
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
            className="border-t border-white/[0.07] bg-[#080a0f] md:hidden"
          >
            <div className="flex flex-col gap-5 px-5 py-6">
              {nav.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-sm text-base text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f]"
                >
                  {label}
                </Link>
              ))}
              <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-sm text-base text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f]">
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-[#d7ff3f] px-5 py-3 text-center font-bold text-[#080a0f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a0f]"
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
