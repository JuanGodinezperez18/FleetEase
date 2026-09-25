import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de Privacidad | FleetEase",
  description:
    "Aviso de Privacidad de FleetEase conforme a la LFPDPPP. Cómo tratamos tus datos personales.",
};

export default function PrivacidadPage() {
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
          Aviso de Privacidad
        </h1>
        <p className="mt-2 text-sm text-white/45">Última actualización: 25 de septiembre de 2026</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-8 text-[15px] leading-7 text-white/75">
          <section>
            <h2 className="text-lg font-semibold text-white">Responsable del tratamiento</h2>
            <p>
              FleetEase (en adelante el &quot;Responsable&quot;), con domicilio en México, es responsable
              del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos
              Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.
            </p>
            <p className="mt-2 text-sm text-white/50">
              Contacto de privacidad:{" "}
              <a href="mailto:privacidad@fleetease.com.mx" className="text-[#d7ff3f] hover:underline">
                privacidad@fleetease.com.mx
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Datos personales que recabamos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Datos de identificación y contacto: nombre, correo electrónico, teléfono, empresa, cargo.</li>
              <li>Datos de facturación: RFC, dirección fiscal y datos de pago (procesados por proveedores de pago).</li>
              <li>Datos de uso de la plataforma: información de flotillas, vehículos, conductores, mantenimientos, rentas y reportes que usted registre.</li>
              <li>Datos técnicos: dirección IP, tipo de navegador, cookies y datos de navegación.</li>
            </ul>
            <p className="mt-2">No recabamos datos personales sensibles de forma habitual.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Finalidades del tratamiento</h2>
            <p className="font-medium text-white/90">Necesarias (sin las cuales no podemos prestar el servicio):</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Crear y administrar su cuenta.</li>
              <li>Prestar el servicio de gestión de flotillas y renta de vehículos.</li>
              <li>Facturación, cobro y atención de solicitudes.</li>
              <li>Cumplimiento de obligaciones legales y fiscales.</li>
            </ul>
            <p className="mt-3 font-medium text-white/90">Secundarias (requieren su consentimiento):</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Envío de comunicaciones comerciales, novedades y mejoras del servicio.</li>
              <li>Análisis de uso para mejorar la plataforma.</li>
            </ul>
            <p className="mt-2">
              Usted puede oponerse a las finalidades secundarias sin que ello afecte el servicio principal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Transferencias</h2>
            <p>Podemos transferir datos a:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Proveedores de hosting, correo y procesamiento de pagos (solo para la prestación del servicio).</li>
              <li>Autoridades cuando la ley lo requiera.</li>
            </ul>
            <p className="mt-2">
              No realizamos transferencias internacionales que requieran su consentimiento adicional, salvo las
              necesarias para el funcionamiento técnico del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Derechos ARCO y revocación del consentimiento</h2>
            <p>
              Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición, así como
              revocar su consentimiento, enviando un correo a{" "}
              <a href="mailto:privacidad@fleetease.com.mx" className="text-[#d7ff3f] hover:underline">
                privacidad@fleetease.com.mx
              </a>
              . Incluya: nombre completo, medio de contacto, descripción clara de su solicitud y documentos que
              acrediten su identidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Medidas de seguridad</h2>
            <p>
              Implementamos medidas administrativas, técnicas y físicas para proteger sus datos contra daño,
              pérdida, alteración, destrucción o uso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Cambios al Aviso</h2>
            <p>
              Cualquier modificación se publicará en esta misma página. Le recomendamos revisarla periódicamente.
            </p>
          </section>

          <section className="border-t border-white/10 pt-6 text-sm text-white/45">
            <p>
              También puede consultar nuestra{" "}
              <Link href="/cookies" className="text-[#d7ff3f] hover:underline">
                Política de Cookies
              </Link>
              ,{" "}
              <Link href="/terminos" className="text-[#d7ff3f] hover:underline">
                Términos y Condiciones
              </Link>{" "}
              y{" "}
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
