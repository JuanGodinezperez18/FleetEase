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
const BRAND_IMAGE = "/web-app-manifest-512x512.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://fleetease.com.mx"),
  title: {
    default: "FleetEase | Gestión inteligente de flotillas",
    template: "%s | FleetEase",
  },
  description: "Software para gestionar flotillas de vehículos: clientes, rentabilidad, mantenimiento, créditos y operación desde un solo lugar.",
  applicationName: "FleetEase",
  keywords: ["gestión de flotillas", "software para flotillas", "administración de vehículos", "control de flotillas", "renta de vehículos", "mantenimiento de flotillas", "FleetEase"],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://fleetease.com.mx/",
    siteName: "FleetEase",
    title: "FleetEase | Gestión inteligente de flotillas",
    description: "Controla clientes, vehículos, rentabilidad y mantenimiento de tu flotilla desde un solo lugar.",
    images: [{ url: BRAND_IMAGE, width: 512, height: 512, alt: "FleetEase" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FleetEase | Gestión inteligente de flotillas",
    description: "Controla operación, rentabilidad y mantenimiento de tu flotilla desde un solo lugar.",
    images: [BRAND_IMAGE],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon-96x96.png",
    shortcut: "/favicon-96x96.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#080a0f", width: "device-width", initialScale: 1 };

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://fleetease.com.mx/#organization",
      name: "FleetEase",
      url: "https://fleetease.com.mx/",
      logo: "https://fleetease.com.mx/web-app-manifest-512x512.png",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://fleetease.com.mx/#software",
      name: "FleetEase",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://fleetease.com.mx/",
      description: "Software para gestionar flotillas, vehículos, mantenimiento, clientes y rentabilidad desde un solo lugar.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "MXN", description: "Prueba gratuita durante 14 días, con 1 usuario y hasta 2 vehículos, sin tarjeta." },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <Script id="fleetease-structured-data" type="application/ld+json">{JSON.stringify(structuredData)}</Script>
        <Script id="pwa-install-capture" strategy="beforeInteractive">
          {`window.addEventListener('beforeinstallprompt', function(event) { event.preventDefault(); window.__fleetEaseInstallPrompt = event; window.dispatchEvent(new Event('fleetease-install-available')); });`}
        </Script>
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-sans`}>
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
          {`window.addEventListener('error', (e) => { if (e.message.includes('ChunkLoadError')) window.location.reload(); });`}
        </Script>
      </body>
    </html>
  );
}