import { Check, Clock, ShieldCheck, Truck } from "lucide-react";

const stats = [
  {
    value: "14 días",
    label: "Prueba gratis sin tarjeta",
    icon: Clock,
  },
  {
    value: "1 lugar",
    label: "Operación, costos y rentabilidad",
    icon: Truck,
  },
  {
    value: "Antes",
    label: "Alertas de mantenimiento a tiempo",
    icon: ShieldCheck,
  },
  {
    value: "Minutos",
    label: "Para configurar tu cuenta",
    icon: Check,
  },
] as const;

/**
 * Soft social proof focused on product value (no invented customer counts).
 * Replace with real testimonials/metrics when you have them.
 */
export function LandingSocialProof() {
  return (
    <section
      aria-label="Beneficios clave de FleetEase"
      className="border-y border-white/[0.07] bg-[var(--fe-main)]"
    >
      <div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8 lg:py-16">
        <p className="mb-8 text-center text-[12px] font-medium uppercase tracking-[0.14em] text-white/40">
          Pensado para operadores de renta en México
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {stats.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-5 text-center"
            >
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                <Icon className="h-4 w-4 text-[var(--fe-lime)]" strokeWidth={1.75} />
              </div>
              <div className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {value}
              </div>
              <div className="mt-1.5 text-[11px] leading-4 text-white/50 sm:text-xs">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
