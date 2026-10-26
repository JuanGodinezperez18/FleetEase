import { plans } from "@/config/plans";

const faqs: [string, string][] = [
  [
    "¿Para quién es FleetEase?",
    "Para conductores independientes con un vehículo y para empresas que administran vehículos de renta, flotillas comerciales o unidades asignadas a conductores. Controla gastos, mantenimiento, ingresos y rentabilidad en un solo lugar.",
  ],
  [
    "¿Puedo empezar sin pagar?",
    "Sí. El plan Free es permanente: hasta 1 vehículo y 1 usuario, con todas las funciones Pro y sin tarjeta de crédito. Incluye anuncios para mantenerlo gratis.",
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
 * Organization + WebSite + SoftwareApplication (3 offers) + FAQPage.
 * FAQ debe coincidir con LandingFaq y con las cards de precios (1 vehículo Free).
 */
export function LandingJsonLd() {
  const free = plans.free;
  const starter = plans.starter;
  const pro = plans.pro;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.fleetease.com.mx/#org",
        name: "FleetEase",
        url: "https://www.fleetease.com.mx/",
        logo: "https://www.fleetease.com.mx/logo.png",
        areaServed: "MX",
        sameAs: [] as string[],
      },
      {
        "@type": "WebSite",
        "@id": "https://www.fleetease.com.mx/#website",
        url: "https://www.fleetease.com.mx/",
        name: "FleetEase",
        inLanguage: "es-MX",
        publisher: { "@id": "https://www.fleetease.com.mx/#org" },
      },
      {
        "@type": "SoftwareApplication",
        name: "FleetEase",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Software de gestión de flotillas y renta de vehículos en México. Controla rentabilidad, mantenimiento y operación.",
        url: "https://www.fleetease.com.mx/",
        provider: { "@id": "https://www.fleetease.com.mx/#org" },
        offers: [
          {
            "@type": "Offer",
            name: free.name,
            price: String(free.price),
            priceCurrency: free.currency || "MXN",
            description: free.description,
            availability: "https://schema.org/InStock",
          },
          {
            "@type": "Offer",
            name: starter.name,
            price: String(starter.price),
            priceCurrency: starter.currency || "MXN",
            description: starter.description,
            availability: "https://schema.org/InStock",
          },
          {
            "@type": "Offer",
            name: pro.name,
            price: String(pro.price),
            priceCurrency: pro.currency || "MXN",
            description: pro.description,
            availability: "https://schema.org/InStock",
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: {
            "@type": "Answer",
            text: a,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
