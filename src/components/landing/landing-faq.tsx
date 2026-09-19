"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs: [string, string][] = [
  [
    "¿Para quién es FleetEase?",
    "Para empresas y operadores que administran vehículos de renta, flotillas comerciales o unidades asignadas a conductores y necesitan controlar operación y rentabilidad. Ideal para software de gestión de flotillas y renta de vehículos en México.",
  ],
  [
    "¿Puedo probar FleetEase antes de pagar?",
    "Sí. El plan Free te permite usar FleetEase durante 14 días con 1 usuario y hasta 2 vehículos, sin ingresar tarjeta ni información de pago.",
  ],
  [
    "¿Los planes dependen del número de vehículos?",
    "Sí. Los planes están pensados para crecer contigo y aumentar la capacidad conforme crece tu flotilla.",
  ],
  [
    "¿FleetEase reemplaza mi GPS?",
    "No necesariamente. FleetEase está pensado como la capa de gestión de tu operación: centraliza información, costos, mantenimiento y rentabilidad.",
  ],
  [
    "¿FleetEase sirve para control de flotillas en México?",
    "Sí. FleetEase es un software de gestión de flotillas y renta de vehículos diseñado para operadores en México. Te permite controlar rentabilidad, mantenimiento y operación desde un solo lugar.",
  ],
  [
    "¿Qué incluye el control de mantenimiento de flotillas?",
    "Puedes registrar servicios, kilometraje, vencimientos de seguros y verificaciones, y recibir alertas antes de que un vehículo se detenga por falta de mantenimiento.",
  ],
];

export function LandingFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="faq" className="border-t border-white/[0.07] bg-white/[0.018]">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 lg:grid-cols-[.65fr_1.35fr] lg:gap-14 lg:px-8 lg:py-24">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7ff3f]">FAQ</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Lo esencial,
            <br />
            sin vueltas.
          </h2>
        </div>
        <div>
          {faqs.map(([q, a], i) => (
            <div key={q} className="border-b border-white/[0.08] first:border-t">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between py-5 text-left text-sm font-semibold text-white/90"
                aria-expanded={openFaq === i}
              >
                <span>{q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-white/40 transition ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {/* Always render answer text in DOM for SEO; hide visually when closed */}
              <div className={openFaq === i ? "block" : "sr-only"}>
                <p className="pb-5 pr-8 text-sm leading-6 text-white/55">{a}</p>
              </div>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                    aria-hidden
                  >
                    {/* Visual duplicate handled by sr-only block above for SSR/crawlers */}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
