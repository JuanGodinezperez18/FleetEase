"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function LandingStickyCta() {
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {showStickyCta && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[var(--fe-ink)]/92 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden"
        >
          <Link
            href="/registro"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--fe-lime)] py-3 text-sm font-bold text-[var(--fe-ink)]"
          >
            Comenzar gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
