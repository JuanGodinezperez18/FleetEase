import { plans } from "@/config/plans";
import { landingFaqs } from "@/config/landing-faq";

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
        mainEntity: landingFaqs.map(([q, a]) => ({
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
