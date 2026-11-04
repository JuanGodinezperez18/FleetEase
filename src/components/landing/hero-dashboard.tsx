import { LandingProductImage } from '@/components/landing/landing-product-image';

export function HeroDashboard() {
  return (
    <figure className="relative mx-auto w-full min-w-0 max-w-[650px]">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-white/85">Rentabilidad por vehículo</span>
        <span className="text-white/55">Así se ve FleetEase</span>
      </figcaption>
      <LandingProductImage
        screen="profitability"
        alt="FleetEase muestra ingresos, gastos, utilidad y margen por vehículo en una cuenta QA."
        priority
        sizes="(min-width: 1280px) 620px, (min-width: 1024px) 52vw, (min-width: 690px) 650px, calc(100vw - 40px)"
      />
      <p className="mt-3 text-xs leading-5 text-white/55">
        Captura real de la aplicación con una flotilla ficticia. Amplíala para consultar los detalles.
      </p>
    </figure>
  );
}
