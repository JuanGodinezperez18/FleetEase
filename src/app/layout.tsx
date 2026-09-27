import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Manrope } from 'next/font/google';
import "./globals.css";
import "./fleetease-ui.css";
import "@/components/ui/search.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/common/providers";
import GlobalErrorBoundary from "@/components/common/global-error-boundary";
import { OfflineIndicator } from "@/components/common/offline-indicator";
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
  appleWebApp: {
    capable: true,
    title: "FleetEase Manager",
    statusBarStyle: "black-translucent",
  },
  keywords: [
    "gestión de flotillas",
    "software para flotillas",
    "FleetEase",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://www.fleetease.com.mx/",
    siteName: "FleetEase",
    title: "FleetEase | Software de Gestión de Flotillas en México",
    description: "Controla rentabilidad, mantenimiento y operación de tu flotilla. Prueba gratis 14 días, sin tarjeta.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "FleetEase Manager" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FleetEase | Software de Gestión de Flotillas en México",
    description: "Controla rentabilidad, mantenimiento y operación de tu flotilla.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/og-image.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#080a0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

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

/**
 * Recupera fallos de carga en PWA (chunks viejos / SW).
 * Si se agotan los reintentos, desregistra el SW y borra caches.
 */
const legacySwCleanupScript = `
(function() {
  // FleetEase no longer registers a Service Worker. Remove legacy workers/caches
  // once, without forcing a reload or interfering with App Router navigation.
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    return Promise.all(registrations.map(function(registration) {
      try {
        if (registration.active) registration.active.postMessage('CLEAR_CACHES');
      } catch (e) {}
      return registration.unregister();
    }));
  }).then(function() {
    if (!('caches' in window)) return;
    return caches.keys().then(function(names) {
      return Promise.all(names.map(function(name) { return caches.delete(name); }));
    });
  }).catch(function() {});
})();
`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth" className="dark">
      <head>
        <Script id="fleetease-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Script id="fleetease-legacy-sw-cleanup" strategy="beforeInteractive">
          {legacySwCleanupScript}
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
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-sans fe-shell-bg antialiased`}>
        <div id="fe-boot" aria-hidden="true">
          <div className="fe-boot-kicker">Fleet OS</div>
          <h1>FleetEase <span>Manager</span></h1>
          <p>Gestión inteligente de flotillas</p>
          <div className="fe-boot-bar"><i /></div>
        </div>
        <GlobalErrorBoundary>
          <Providers>
            <OfflineIndicator />
            {children}
            <PwaInstallButton />
            <Toaster />
          </Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
