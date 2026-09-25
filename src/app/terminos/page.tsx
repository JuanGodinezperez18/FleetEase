import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | FleetEase",
  description: "Términos y Condiciones de uso de la plataforma FleetEase.",
};

export default function TerminosPage() {
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
          Términos y Condiciones de Uso
        </h1>
        <p className="mt-2 text-sm text-white/45">Última actualización: 25 de septiembre de 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-7 text-white/75">
          <section>
            <p>
              Al acceder o utilizar la plataforma FleetEase (software de gestión de flotillas y renta de
              vehículos), usted acepta estos Términos y Condiciones.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">1. Descripción del servicio</h2>
            <p>
              FleetEase es una plataforma SaaS que permite gestionar vehículos, clientes, rentas,
              mantenimientos, reportes y operaciones relacionadas con flotillas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Cuenta de usuario</h2>
            <p>
              Usted es responsable de la confidencialidad de sus credenciales y de toda actividad realizada desde
              su cuenta. Debe proporcionar información veraz y actualizada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Uso permitido</h2>
            <p>
              El servicio se otorga bajo licencia de uso no exclusiva, intransferible y limitada. Queda prohibido:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Realizar ingeniería inversa, copiar o revender el software.</li>
              <li>Usar el servicio para fines ilegales.</li>
              <li>Sobrecargar o intentar vulnerar la seguridad de la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Pagos y suscripciones</h2>
            <p>
              Los precios, planes y condiciones de facturación se detallan en la página de precios o en la orden
              de servicio correspondiente. Los pagos son por adelantado según el plan contratado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Propiedad intelectual</h2>
            <p>
              Todo el software, diseño, contenido y marca FleetEase son propiedad exclusiva del Responsable. Usted
              conserva la propiedad de los datos que carga en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Limitación de responsabilidad</h2>
            <p>
              El servicio se proporciona &quot;tal cual&quot;. FleetEase no será responsable por daños indirectos,
              lucro cesante o pérdida de datos, excepto en casos de dolo o culpa grave. La responsabilidad máxima
              se limita al monto pagado en los últimos 3 meses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Terminación</h2>
            <p>
              Podemos suspender o cancelar el acceso por incumplimiento de estos términos o falta de pago. Usted
              puede cancelar en cualquier momento conforme a la{" "}
              <Link href="/cancelaciones" className="text-[#d7ff3f] hover:underline">
                Política de Cancelaciones
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se
              someterá a los tribunales competentes de México.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Contacto</h2>
            <p>
              <a href="mailto:legal@fleetease.com.mx" className="text-[#d7ff3f] hover:underline">
                legal@fleetease.com.mx
              </a>
            </p>
          </section>

          <section className="border-t border-white/10 pt-6 text-sm text-white/45">
            <p>
              Consulte también el{" "}
              <Link href="/privacidad" className="text-[#d7ff3f] hover:underline">
                Aviso de Privacidad
              </Link>{" "}
              y la{" "}
              <Link href="/cancelaciones" className="text-[#d7ff3f] hover:underline">
                Política de Cancelaciones
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
