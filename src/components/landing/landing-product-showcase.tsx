import Link from "next/link";

const pillars = [
  {
    number: "01",
    title: "La operación de cada vehículo",
    description:
      "Organiza vehículos, clientes, asignaciones, socios y cobranza. Consulta la información de tu operación sin depender de archivos dispersos.",
    details: ["Vehículos y clientes", "Asignaciones y rentas", "Seguimiento de cobranza"],
  },
  {
    number: "02",
    title: "Los números de tu flotilla",
    description:
      "Registra ingresos, gastos y pagos para entender cómo se comporta cada unidad y dónde se concentra el costo.",
    details: ["Ingresos y gastos", "Pagos y créditos", "Rentabilidad por vehículo"],
  },
  {
    number: "03",
    title: "La continuidad de tus unidades",
    description:
      "Da seguimiento a servicios, kilometraje y vencimientos para mantener visible lo que requiere atención.",
    details: ["Servicios y kilometraje", "Documentos y vencimientos", "Alertas de seguimiento"],
  },
] as const;

export function LandingProductShowcase() {
  return (
    <section
      id="producto"
      aria-labelledby="producto-title"
      className="scroll-mt-[var(--header-h)] border-y border-white/[0.08] bg-[var(--fe-dark-main)]"
    >
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fe-lime)]">
            Una operación conectada
          </p>
          <h2
            id="producto-title"
            className="mt-4 max-w-[520px] text-3xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl"
          >
            Cada vehículo cuenta una historia financiera.
          </h2>
          <p className="mt-6 max-w-[440px] text-base leading-7 text-white/60">
            FleetEase reúne la operación diaria y sus números para que puedas revisar qué ocurre con cada unidad y actuar con información más clara.
          </p>
          <Link
            href="#pricing"
            className="mt-8 inline-flex min-h-11 items-center border-b border-[var(--fe-lime)] pb-1 text-sm font-semibold text-[var(--fe-lime)] transition-colors hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--fe-dark-main)]"
          >
            Comparar planes
          </Link>
        </div>

        <div className="border-t border-white/[0.14]">
          {pillars.map((pillar) => (
            <article
              key={pillar.number}
              className="grid gap-4 border-b border-white/[0.14] py-7 sm:grid-cols-[52px_1fr] sm:gap-6 sm:py-8"
            >
              <span className="pt-1 font-mono text-xs tabular-nums text-[var(--fe-lime)]">
                {pillar.number}
              </span>
              <div className="grid gap-5 lg:grid-cols-[1fr_0.82fr] lg:gap-8">
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 max-w-[490px] text-sm leading-6 text-white/60">
                    {pillar.description}
                  </p>
                </div>
                <ul className="grid content-start gap-2 text-xs leading-5 text-white/55 sm:grid-cols-2 lg:grid-cols-1">
                  {pillar.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--fe-lime)]"
                      />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
