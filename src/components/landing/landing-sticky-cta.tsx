"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Sticky CTA mobile. Se oculta cuando el CTA final (#cta-final) entra en viewport
 * para no duplicar la misma llamada a la acción.
 */
export function LandingStickyCta() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const finalCta = document.getElementById("cta-final");
    let finalCtaVisible = false;

    const onScroll = () => {
      const pastHero = window.scrollY > 520;
      setShowStickyCta(pastHero && !finalCtaVisible);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let observer: IntersectionObserver | undefined;
    if (finalCta) {
      observer = new IntersectionObserver(
        ([entry]) => {
          finalCtaVisible = entry.isIntersecting;
          onScroll();
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      observer.observe(finalCta);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  return (
    <AnimatePresence>
      {showStickyCta && (
        <motion.div
          initial={{ y: reduceMotion ? 0 : 12, opacity: reduceMotion ? 1 : 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduceMotion ? 0 : 12, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16 }}
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[var(--fe-ink)]/92 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden motion-safe:transition-none"
        >
          <Link
            href="/registro"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--fe-lime)] py-3 text-sm font-bold text-[var(--fe-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]"
          >
            Comenzar gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
