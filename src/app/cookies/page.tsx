import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cookies | FleetEase",
  description: "Política de Cookies de FleetEase. Cómo usamos cookies y tecnologías similares.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
        <Link
          href="/"
          className="mb-10 inline-flex text-sm text-white/50 transition hover:text-[#d7ff3f]"
        >
          ← Volver a FleetEase
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Política de Cookies</h1>
        <p className="mt-2 text-sm text-white/45">Última actualización: 25 de septiembre de 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-7 text-white/75">
          <section>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el uso del sitio
              y, en su caso, mostrar contenido relevante.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Tipos de cookies que usamos</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/90">Esenciales / Técnicas:</strong> necesarias para el
                funcionamiento del sitio y la seguridad (no requieren consentimiento).
              </li>
              <li>
                <strong className="text-white/90">Analíticas:</strong> nos ayudan a entender cómo se usa el
                sitio (por ejemplo Google Analytics u similares).
              </li>
              <li>
                <strong className="text-white/90">Funcionales:</strong> recuerdan preferencias.
              </li>
              <li>
                <strong className="text-white/90">Marketing (si se usan):</strong> para campañas publicitarias.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Consentimiento</h2>
            <p>
              Al continuar navegando o aceptar el banner de cookies, usted consiente el uso de cookies no
              esenciales. Puede configurar o rechazar las cookies no esenciales en cualquier momento a través del
              banner o de la configuración de su navegador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Cómo gestionar las cookies</h2>
            <p>
              Puede eliminar o bloquear cookies desde la configuración de su navegador (Chrome, Firefox, Safari,
              Edge, etc.). Tenga en cuenta que desactivar cookies esenciales puede afectar el funcionamiento del
              sitio.
            </p>
          </section>

          <section className="border-t border-white/10 pt-6 text-sm text-white/45">
            <p>
              Para más detalles consulte nuestro{" "}
              <Link href="/privacidad" className="text-[#d7ff3f] hover:underline">
                Aviso de Privacidad
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
