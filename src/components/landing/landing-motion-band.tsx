import { CarFront, ArrowRight } from "lucide-react";
import Link from "next/link";

const capabilities = [
  "Rentabilidad por vehículo",
  "Mantenimiento",
  "Cobranza",
  "Asignaciones",
  "Alertas",
  "Reportes",
  "Hecho para México",
];

const facts = [
  { value: "8+", label: "años de experiencia en operación de renta" },
  { value: "3", label: "pasos para empezar" },
  { value: "1", label: "vehículo en el plan Free" },
  { value: "$0", label: "para comenzar, sin tarjeta" },
];

export function LandingMotionBand() {
  return (
    <>
      <section aria-label="Operación FleetEase" className="relative overflow-hidden border-y border-white/[0.08] bg-white/[0.025]">
        <div className="relative mx-auto flex h-[58px] max-w-[1240px] items-center px-5 lg:px-8">
          <div className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.2)_0_20px,transparent_20px_40px)] lg:inset-x-8" />
          <div className="relative flex h-full w-full items-center justify-between">
            <span className="flex items-center gap-2 bg-[var(--fe-ink)] pr-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)]" />
              Operación conectada
            </span>
            <CarFront aria-hidden="true" className="h-7 w-7 animate-float rounded-md bg-[var(--fe-ink)] p-1 text-[var(--fe-lime)] motion-reduce:animate-none" />
            <Link href="/registro" className="flex items-center gap-1 bg-[var(--fe-ink)] pl-3 text-xs font-semibold text-[var(--fe-lime)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)]">
              Empieza gratis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-b border-white/[0.07] py-4" aria-label="Funciones de FleetEase">
        <div className="fe-capability-track flex w-max items-center gap-8 whitespace-nowrap text-sm font-semibold text-white/45">
          {[...capabilities, ...capabilities].map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-8">
              {item}
              <span aria-hidden="true" className="text-[var(--fe-lime)]">✦</span>
            </span>
          ))}
        </div>
      </div>

      <section aria-label="FleetEase en datos" className="mx-auto grid max-w-[1240px] grid-cols-2 gap-x-5 gap-y-8 px-5 py-14 sm:grid-cols-4 lg:px-8 lg:py-16">
        {facts.map((fact, index) => (
          <div key={fact.label} className="fe-fact-reveal border-l border-white/[0.12] pl-4 sm:pl-5" style={{ animationDelay: `${index * 90}ms` }}>
            <p className="font-heading text-4xl font-semibold tracking-[-0.055em] text-[var(--fe-lime)] sm:text-5xl">{fact.value}</p>
            <p className="mt-2 max-w-[220px] text-xs leading-5 text-white/50 sm:text-sm">{fact.label}</p>
          </div>
        ))}
      </section>

      <style jsx>{`
        .fe-capability-track {
          animation: fe-marquee 36s linear infinite;
          will-change: transform;
        }
        .fe-capability-track:hover { animation-play-state: paused; }
        .fe-fact-reveal {
          animation: fe-fade-up 650ms cubic-bezier(.16, 1, .3, 1) both;
        }
        @keyframes fe-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes fe-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fe-capability-track, .fe-fact-reveal { animation: none; }
        }
      `}</style>
    </>
  );
}
