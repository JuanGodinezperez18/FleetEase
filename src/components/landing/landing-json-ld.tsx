import { plans } from "@/config/plans";

const faqs: [string, string][] = [
  [
    "¿Para quién es FleetEase?",
    "Para empresas y operadores que administran vehículos de renta, flotillas comerciales o unidades asignadas a conductores y necesitan controlar operación y rentabilidad. Ideal para software de gestión de flotillas y renta de vehículos en México.",
  ],
  [
    "¿Puedo empezar sin pagar?",
    "Sí. El plan Free es permanente: hasta 3 vehículos y 1 usuario, con todas las funciones Pro y sin tarjeta. Incluye anuncios para mantenerlo gratis.",
  ],
  [
    "¿Los planes dependen del número de vehículos?",
    "Sí. Los planes están pensados para crecer contigo y aumentar la capacidad conforme crece tu flotilla.",
  ],
  [
    "¿FleetEase reemplaza mi GPS?",
    "No necesariamente. FleetEase está pensado como la capa de gestión de tu operación: centraliza información, costos, mantenimiento y rentabilidad.",
  ],
  [
    "¿FleetEase sirve para control de flotillas en México?",
    "Sí. FleetEase es un software de gestión de flotillas y renta de vehículos diseñado para operadores en México. Te permite controlar rentabilidad, mantenimiento y operación desde un solo lugar.",
  ],
  [
    "¿Qué incluye el control de mantenimiento de flotillas?",
    "Puedes registrar servicios, kilometraje, vencimientos de seguros y verificaciones, y recibir alertas antes de que un vehículo se detenga por falta de mantenimiento.",
  ],
];

/**
 * Structured data for the landing page.
 * SoftwareApplication (with Free offer) + FAQPage from the same content as LandingFaq.
 */
export function LandingJsonLd() {
  const free = plans.free;
  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FleetEase",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Software de gestión de flotillas y renta de vehículos en México. Controla rentabilidad, mantenimiento y operación.",
    url: "https://www.fleetease.com.mx/",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "MXN",
      description: free.description,
      availability: "https://schema.org/InStock",
    },
    aggregateRating: undefined,
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
