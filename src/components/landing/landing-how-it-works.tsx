import { ArrowRight, ClipboardList, LineChart, Rocket } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Registra tu flotilla",
    description:
      "Agrega vehículos, clientes y costos en minutos. Sin integraciones obligatorias ni setup técnico.",
    icon: ClipboardList,
  },
  {
    number: "02",
    title: "Opera el día a día",
    description:
      "Asignaciones, cobranza, mantenimiento y alertas en un solo lugar. Todo queda trazable.",
    icon: Rocket,
  },
  {
    number: "03",
    title: "Decide con números",
    description:
      "Ve rentabilidad por unidad, costos ocultos y dónde estás dejando dinero sobre la mesa.",
    icon: LineChart,
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-title"
      className="border-t border-white/[0.07] scroll-mt-[var(--header-h)]"
    >
      <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24">
        <div className="max-w-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fe-lime)]">
            Cómo funciona
          </div>
          <h2
            id="como-funciona-title"
            className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl"
          >
            Tres pasos. Sin fricción.
          </h2>
          <p className="mt-5 text-[16px] leading-7 text-white/55">
            Diseñado para operadores que no tienen tiempo de aprender otro sistema complicado.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {steps.map(({ number, title, description, icon: Icon }) => (
            <article
              key={number}
              className="relative rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.14em] text-white/45">
                  {number}
                </span>
                <Icon className="h-5 w-5 text-[var(--fe-lime)]" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/55">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--fe-lime)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]"
          >
            Empezar en minutos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
