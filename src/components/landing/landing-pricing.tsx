"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { plans, type PlanType } from "@/config/plans";

// Publica solo planes cuya oferta está validada. Enterprise se mantiene fuera de marketing hasta confirmar su alcance.
const ORDER: PlanType[] = ["free", "starter", "pro"];

/** Highlights cortos por plan para la landing (no listar 20 features). */
const HIGHLIGHTS: Partial<Record<PlanType, string[]>> = {
  free: [
    "Gratis para siempre",
    "Todas las funciones Pro",
    "1 vehículo · 1 usuario",
    "Sin tarjeta de crédito",
    "Con anuncios",
  ],
  starter: [
    "Sin anuncios",
    "Hasta 5 vehículos · 1 usuario",
    "Operación y cobranza completa",
    "Mantenimiento y alertas",
    "Soporte por email",
  ],
  pro: [
    "Todo lo de Starter",
    "Hasta 15 vehículos · 3 usuarios",
    "Rentabilidad por vehículo",
    "Reportes PDF y Excel",
    "Soporte prioritario",
  ],
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]";

function formatPrice(planId: PlanType): string {
  const p = plans[planId];
  if (p.price === 0) return "Gratis";
  return `$${p.price.toLocaleString("es-MX")}`;
}

export function LandingPricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="border-t border-white/[0.07] scroll-mt-[var(--header-h)]"
    >
      <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fe-lime)]">
            Precios
          </div>
          <h2
            id="pricing-title"
            className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl"
          >
            Planes claros. Sin sorpresas.
          </h2>
          <p className="mt-5 text-[16px] leading-7 text-white/55">
            Empieza gratis con un vehículo. Ideal para conductores independientes y empresas que están comenzando.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ORDER.map((id) => {
            const plan = plans[id];
            const popular = Boolean(plan.popular);
            return (
              <article
                key={id}
                className={[
                  "group relative flex flex-col rounded-[22px] border p-6 transition-all duration-300 ease-out motion-safe:hover:-translate-y-2",
                  "hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
                  popular
                    ? "border-[var(--fe-lime)]/45 bg-[var(--fe-lime)]/[0.06] hover:border-[var(--fe-lime)]/70 hover:bg-[var(--fe-lime)]/[0.1]"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.055]",
                ].join(" ")}
              >
                {popular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--fe-lime)] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--fe-ink)]">
                    Recomendado
                  </span>
                ) : null}

                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-2 min-h-[40px] text-sm leading-5 text-white/55">
                  {plan.description}
                </p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-white">
                    {formatPrice(id)}
                  </span>
                  {plan.price > 0 ? (
                    <span className="text-sm text-white/50">
                      {plan.currency || "MXN"}/{plan.period}
                    </span>
                  ) : (
                    <span className="text-sm text-white/50">para siempre</span>
                  )}
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                  {(HIGHLIGHTS[id] ?? []).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fe-lime)]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/registro?plan=${id}`}
                  aria-label={`${plan.price === 0 ? "Empezar gratis" : "Elegir plan"} ${plan.name}`}
                  className={[
                    "mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition",
                    popular
                      ? "bg-[var(--fe-lime)] text-[var(--fe-ink)] hover:bg-white"
                      : "border border-white/15 bg-white/[0.04] text-white hover:border-white/30 hover:bg-white/10",
                    focusRing,
                  ].join(" ")}
                >
                  {plan.price === 0 ? "Empezar gratis" : "Elegir plan"}
                  <ArrowRight className="h-4 w-4 transition motion-safe:group-hover:translate-x-0.5" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
