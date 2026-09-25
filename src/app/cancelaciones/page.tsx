import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cancelaciones y Devoluciones | FleetEase",
  description:
    "Cómo cancelar su suscripción a FleetEase, avisos de renovación y política de reembolsos conforme a la LFPC.",
};

export default function CancelacionesPage() {
  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
        <Link
          href="/"
          className="mb-10 inline-flex text-sm text-white/50 transition hover:text-[#d7ff3f]"
        >
          ← Volver a FleetEase
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Política de Cancelaciones y Devoluciones
        </h1>
        <p className="mt-2 text-sm text-white/45">Última actualización: 25 de septiembre de 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-7 text-white/75">
          <section>
            <p>
              Conforme a la reforma a la Ley Federal de Protección al Consumidor (artículos 76 Bis fracciones VIII
              y IX):
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Cancelación de suscripción</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Puede cancelar su suscripción en cualquier momento desde su cuenta (Configuración → Plan /
                Suscripción) o enviando un correo a{" "}
                <a href="mailto:soporte@fleetease.com.mx" className="text-[#d7ff3f] hover:underline">
                  soporte@fleetease.com.mx
                </a>
                .
              </li>
              <li>La cancelación es <strong className="text-white/90">inmediata</strong> y sin obstáculos.</li>
              <li>Conservará el acceso hasta el final del período ya pagado.</li>
              <li>No se realizarán cargos futuros después de la cancelación.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Aviso de renovación automática</h2>
            <p>
              Le notificaremos por correo electrónico al menos <strong className="text-white/90">5 días naturales</strong>{" "}
              antes de cualquier renovación automática, para que pueda cancelar sin penalización.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Reembolsos</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Por regla general no se realizan reembolsos de períodos ya iniciados (servicio digital de acceso
                inmediato).
              </li>
              <li>Sí se reembolsa en casos de: cargo duplicado, error de sistema o cobro indebido.</li>
              <li>
                Período de prueba (trial): no se realiza cargo automático al finalizar; el acceso se suspende hasta
                contratar un plan.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Datos tras la cancelación</h2>
            <p>
              Sus datos se conservan durante 30 días después de la fecha de terminación del servicio para que pueda
              descargarlos. Después se eliminan de forma permanente, salvo obligación legal de conservación.
            </p>
          </section>

          <section className="border-t border-white/10 pt-6 text-sm text-white/45">
            <p>
              Consulte también el{" "}
              <Link href="/privacidad" className="text-[#d7ff3f] hover:underline">
                Aviso de Privacidad
              </Link>{" "}
              y los{" "}
              <Link href="/terminos" className="text-[#d7ff3f] hover:underline">
                Términos y Condiciones
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
