import { Activity, BarChart3, Gauge, Wrench } from "lucide-react";

/**
 * Vista conceptual del dashboard en el hero. No representa datos reales de clientes.
 */
export function HeroDashboard() {
  const bars = [38, 48, 43, 62, 57, 75, 68, 88, 79, 94, 83, 100];

  return (
    <div className="relative" aria-hidden="true">
      {/* Halo limitado al producto para separarlo del fondo sin decorar toda la página. */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-[40px] sm:-inset-10 sm:bg-[var(--fe-lime)]/[0.07]"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(var(--fe-lime-rgb), 0.10), transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-[22px] border border-white/[0.12] bg-[var(--fe-dark-surface)]/90 shadow-[0_40px_100px_rgba(0,0,0,.55)] backdrop-blur-xl sm:rounded-[26px]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-[var(--fe-lime)] p-1.5">
              <Gauge className="h-full w-full text-[var(--fe-ink)]" />
            </div>
            <div>
              <span className="text-xs font-semibold">Resumen de flotilla</span>
              <span className="mt-0.5 block text-[10px] text-white/60">
                Demostración visual sin datos reales
              </span>
            </div>
          </div>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/60">
            DEMO SIN DATOS REALES
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {(
            [
              ["Vista", "Vehículos"],
              ["Ejemplo", "Ingresos"],
              ["Ejemplo", "Costos"],
              ["Referencia", "Margen"],
            ] as const
          ).map(([value, label], i) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
            >
              <div className="mb-2 text-[10px] text-white/60">{label}</div>
              <div
                className={`break-words text-base font-semibold tracking-tight sm:text-lg ${
                  i === 3 ? "text-[var(--fe-lime)]" : "text-white"
                }`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 px-3 pb-3 sm:px-4 sm:pb-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold">Tendencia visual</div>
                <div className="mt-1 text-[10px] text-white/60">Gráfico ilustrativo, sin valores reales</div>
              </div>
              <BarChart3 className="h-4 w-4 text-white/50" />
            </div>
            <div className="flex h-36 items-end gap-1.5 sm:gap-2">
              {bars.map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-t-md ${
                    i === 11 ? "bg-[var(--fe-lime)]" : "bg-white/[0.10]"
                  }`}
                />
              ))}
            </div>
            {/* Labels alineados: solo extremos para 12 barras */}
            <div className="mt-3 grid grid-cols-12 text-[10px] text-white/60">
              <span className="col-span-1">ENE</span>
              <span className="col-span-10" />
              <span className="col-span-1 text-right">DIC</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold">Estado de flota</span>
                <Activity className="h-4 w-4 text-[var(--fe-lime)]" />
              </div>
              <div className="text-lg font-semibold">Estados operativos</div>
              <p className="mt-2 text-xs leading-5 text-white/65">
                Una vista para revisar disponibilidad y seguimiento de cada unidad.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--fe-lime)]/20 bg-[var(--fe-lime)]/[0.055] p-5">
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-4 w-4 text-[var(--fe-lime)]" />
                <div>
                  <div className="text-xs font-semibold">Seguimiento de mantenimiento</div>
                  <div className="mt-1 text-[10px] leading-4 text-white/65">
                    Servicios, kilometraje y vencimientos en un mismo lugar.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
