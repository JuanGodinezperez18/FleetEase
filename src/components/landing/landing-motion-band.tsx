const domains = [
  "Vehículos",
  "Rentas",
  "Ingresos",
  "Gastos",
  "Mantenimiento",
  "Rentabilidad",
] as const;

export function LandingDomainStrip() {
  return (
    <section
      aria-label="Áreas de gestión de FleetEase"
      className="border-y border-white/[0.1] bg-[var(--fe-dark-main)]"
    >
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-5 lg:px-8">
        <p className="mr-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Una sola operación
        </p>
        {domains.map((domain, index) => (
          <span key={domain} className="inline-flex items-center gap-5">
            <span className="text-xs font-medium text-white/70">{domain}</span>
            {index < domains.length - 1 ? (
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--fe-lime)]/70" />
            ) : null}
          </span>
        ))}
      </div>
    </section>
  );
}
