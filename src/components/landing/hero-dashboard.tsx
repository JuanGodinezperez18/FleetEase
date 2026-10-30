const navigation = ["Resumen", "Vehículos", "Finanzas", "Mantenimiento"] as const;

const workstreams = [
  {
    label: "Operación",
    title: "Vehículos y rentas",
    description: "Unidades, clientes, asignaciones y cobranza.",
  },
  {
    label: "Finanzas",
    title: "Ingresos y gastos",
    description: "Movimientos y rentabilidad por vehículo.",
  },
  {
    label: "Continuidad",
    title: "Mantenimiento y documentos",
    description: "Servicios, kilometraje y vencimientos.",
  },
] as const;

/**
 * Composición conceptual para explicar las áreas del producto.
 * No es una captura de pantalla ni representa información real.
 */
export function HeroDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-[650px]" aria-hidden="true">
      <div className="absolute -inset-5 -z-10 bg-[radial-gradient(ellipse_at_55%_45%,rgba(215,255,63,0.09),transparent_68%)]" />
      <div className="overflow-hidden border border-white/[0.14] bg-[#0e1117] shadow-[0_32px_90px_rgba(0,0,0,0.42)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.1] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center bg-[var(--fe-lime)] text-sm font-black tracking-tight text-[var(--fe-ink)]">
              F
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">FleetEase</p>
              <p className="mt-0.5 text-[10px] text-white/45">Plataforma de gestión de flotillas</p>
            </div>
          </div>
          <span className="border border-white/[0.14] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55">
            Concepto visual
          </span>
        </div>

        <div className="grid min-h-[340px] sm:grid-cols-[150px_1fr]">
          <aside className="hidden border-r border-white/[0.08] px-3 py-5 sm:block">
            <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/35">
              Espacios
            </p>
            <ul className="mt-4 space-y-1">
              {navigation.map((item, index) => (
                <li
                  key={item}
                  className={[
                    "px-2.5 py-2.5 text-[11px]",
                    index === 0
                      ? "bg-[var(--fe-lime)]/[0.1] font-semibold text-[var(--fe-lime)]"
                      : "text-white/50",
                  ].join(" ")}
                >
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.09] pb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                  Vista general
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-white sm:text-2xl">
                  Tu operación, conectada.
                </h2>
              </div>
              <span className="text-[10px] text-white/35">Vista ilustrativa</span>
            </div>

            <div className="mt-5 grid gap-2.5">
              {workstreams.map((item, index) => (
                <div
                  key={item.label}
                  className="grid gap-2 border border-white/[0.09] bg-white/[0.018] p-3.5 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-4 sm:p-4"
                >
                  <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--fe-lime)]">
                    {item.label}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white sm:text-sm">{item.title}</p>
                    <p className="mt-1 text-[10px] leading-4 text-white/45 sm:text-xs">
                      {item.description}
                    </p>
                  </div>
                  <span className="hidden text-[10px] tabular-nums text-white/25 sm:col-start-1 sm:row-start-1 sm:justify-self-end">
                    0{index + 1}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 border-l-2 border-[var(--fe-lime)]/70 pl-3 text-[10px] leading-5 text-white/40">
              Esta composición explica las áreas de FleetEase. No es una captura del sistema ni muestra datos reales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
