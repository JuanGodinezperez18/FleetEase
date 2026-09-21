import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Manrope } from 'next/font/google';
import "./globals.css";
import "./fleetease-ui.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/common/providers";
import GlobalErrorBoundary from "@/components/common/global-error-boundary";
import { OfflineIndicator } from "@/components/common/offline-indicator";
import { ServiceWorkerRegister } from "@/components/common/service-worker-register";
import { PwaInstallButton } from "@/components/common/pwa-install-button";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fleetease.com.mx"),
  title: {
    default: "FleetEase | Software de Gestión de Flotillas en México",
    template: "%s | FleetEase",
  },
  description: "Software de gestión de flotillas y renta de vehículos en México. Controla rentabilidad, mantenimiento y operación. Prueba gratis 14 días, sin tarjeta.",
  applicationName: "FleetEase",
  keywords: [
    "gestión de flotillas",
    "software para flotillas",
    "software gestión de flotillas",
    "administración de vehículos",
    "control de flotillas",
    "control de flotillas México",
    "renta de vehículos",
    "software para renta de vehículos",
    "mantenimiento de flotillas",
    "software control de flotillas",
    "FleetEase",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://www.fleetease.com.mx/",
    siteName: "FleetEase",
    title: "FleetEase | Software de Gestión de Flotillas en México",
    description: "Controla rentabilidad, mantenimiento y operación de tu flotilla. Prueba gratis 14 días, sin tarjeta.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FleetEase - Software de gestión de flotillas y renta de vehículos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FleetEase | Software de Gestión de Flotillas en México",
    description: "Controla rentabilidad, mantenimiento y operación de tu flotilla. Prueba gratis 14 días, sin tarjeta.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#080a0f",
  width: "device-width",
  initialScale: 1,
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.fleetease.com.mx/#organization",
      name: "FleetEase",
      url: "https://www.fleetease.com.mx/",
      logo: "https://www.fleetease.com.mx/logo.png",
      description: "Software de gestión de flotillas y renta de vehículos para operadores en México.",
      sameAs: [],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.fleetease.com.mx/#software",
      name: "FleetEase",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.fleetease.com.mx/",
      description:
        "Software para gestionar flotillas de vehículos: clientes, rentabilidad, mantenimiento, créditos y operación desde un solo lugar. Ideal para renta de vehículos y control de flotillas en México.",
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "MXN",
          description:
            "Prueba gratuita durante 14 días. 1 usuario, hasta 2 vehículos, sin tarjeta ni compromiso.",
          url: "https://www.fleetease.com.mx/registro",
          availability: "https://schema.org/InStock",
          priceValidUntil: "2027-12-31",
        },
        {
          "@type": "Offer",
          name: "Starter",
          price: "299",
          priceCurrency: "MXN",
          description:
            "Para flotillas pequeñas que comienzan. Hasta 5 vehículos, 1 usuario admin, gestión de clientes y vehículos, registro de ingresos y gastos, dashboard básico, soporte por email.",
          url: "https://www.fleetease.com.mx/#pricing",
          availability: "https://schema.org/InStock",
          priceValidUntil: "2027-12-31",
          billingDuration: "P1M",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "599",
          priceCurrency: "MXN",
          description:
            "El más popular para renta de vehículos. Hasta 15 vehículos, 3 usuarios, rentabilidad por vehículo, alertas de mantenimiento, Client Score, reportes en Excel, soporte prioritario.",
          url: "https://www.fleetease.com.mx/#pricing",
          availability: "https://schema.org/InStock",
          priceValidUntil: "2027-12-31",
          billingDuration: "P1M",
        },
        {
          "@type": "Offer",
          name: "Enterprise",
          price: "999",
          priceCurrency: "MXN",
          description:
            "Para empresas que escalan. Vehículos y usuarios ilimitados, todas las features Pro, multi-empresa, API de integración, soporte 24/7, personalización de marca.",
          url: "https://www.fleetease.com.mx/#pricing",
          availability: "https://schema.org/InStock",
          priceValidUntil: "2027-12-31",
          billingDuration: "P1M",
        },
      ],
      featureList: [
        "Rentabilidad por vehículo",
        "Control de mantenimiento",
        "Gestión de clientes y asignaciones",
        "Seguimiento de ingresos y costos",
        "Alertas de vencimientos",
        "Reportes en Excel",
        "Client Score",
        "Multi-empresa (Enterprise)",
      ],
      provider: {
        "@id": "https://www.fleetease.com.mx/#organization",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.fleetease.com.mx/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Para quién es FleetEase?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Para empresas y operadores que administran vehículos de renta, flotillas comerciales o unidades asignadas a conductores y necesitan controlar operación y rentabilidad.",
          },
        },
        {
          "@type": "Question",
          name: "¿Puedo probar FleetEase antes de pagar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sí. El plan Free te permite usar FleetEase durante 14 días con 1 usuario y hasta 2 vehículos, sin ingresar tarjeta ni información de pago.",
          },
        },
        {
          "@type": "Question",
          name: "¿Los planes dependen del número de vehículos?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sí. Los planes están pensados para crecer contigo y aumentar la capacidad conforme crece tu flotilla. Free (2 vehículos), Starter (5), Pro (15), Enterprise (ilimitados).",
          },
        },
        {
          "@type": "Question",
          name: "¿FleetEase reemplaza mi GPS?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No necesariamente. FleetEase está pensado como la capa de gestión de tu operación: centraliza información, costos, mantenimiento y rentabilidad.",
          },
        },
        {
          "@type": "Question",
          name: "¿FleetEase sirve para control de flotillas en México?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sí. FleetEase es un software de gestión de flotillas y renta de vehículos diseñado para operadores en México. Te permite controlar rentabilidad, mantenimiento y operación desde un solo lugar.",
          },
        },
      ],
    },
  ],
};

/** Aplica class dark/light en <html> antes del paint para evitar FOUC blanco en skeletons. */
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored || 'dark';
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme === 'light' ? 'light' : 'dark');
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth" className="dark">
      <head>
        <Script id="fleetease-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Script id="fleetease-structured-data" type="application/ld+json">
          {JSON.stringify(structuredData)}
        </Script>
        <Script id="pwa-install-capture" strategy="beforeInteractive">
          {`
            window.addEventListener('beforeinstallprompt', function(event) {
              event.preventDefault();
              window.__fleetEaseInstallPrompt = event;
              window.dispatchEvent(new Event('fleetease-install-available'));
            });
          `}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-H9R5JSBQMW"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-H9R5JSBQMW');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "yk1al17grh");
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-sans bg-[#080a0f] text-white antialiased`}>
        <GlobalErrorBoundary>
          <Providers>
            <ServiceWorkerRegister />
            <OfflineIndicator />
            {children}
            <PwaInstallButton />
            <Toaster />
          </Providers>
        </GlobalErrorBoundary>
        <Script id="chunk-error-handler">
          {`
            window.addEventListener('error', (e) => {
              if (e.message.includes('ChunkLoadError')) window.location.reload();
            });
          `}
        </Script>
      </body>
    </html>
  );
}
