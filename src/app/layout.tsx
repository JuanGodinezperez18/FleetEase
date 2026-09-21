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

/** Aplica dark/light antes del paint para evitar flash y desajustes de hidratación. */
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
 * Recupera cargas fallidas por chunks viejos tras un deploy
 * (síntoma: "This page couldn't load" → Reload funciona).
 */
const loadRecoveryScript = `
(function() {
  var KEY = 'fe_load_recovery';
  var MAX = 2;

  function canRecover() {
    try {
      var n = parseInt(sessionStorage.getItem(KEY) || '0', 10);
      return n < MAX;
    } catch (e) { return false; }
  }

  function markAndReload() {
    if (!canRecover()) return;
    try {
      var n = parseInt(sessionStorage.getItem(KEY) || '0', 10);
      sessionStorage.setItem(KEY, String(n + 1));
    } catch (e) {}
    window.location.reload();
  }

  function isChunkError(msg) {
    if (!msg) return false;
    var m = String(msg).toLowerCase();
    return (
      m.indexOf('chunkloaderror') !== -1 ||
      m.indexOf('loading chunk') !== -1 ||
      m.indexOf('failed to fetch dynamically imported module') !== -1 ||
      m.indexOf('importing a module script failed') !== -1 ||
      m.indexOf('error loading dynamically imported module') !== -1
    );
  }

  window.addEventListener('error', function(e) {
    var msg = (e && (e.message || (e.error && e.error.message))) || '';
    if (isChunkError(msg)) markAndReload();
  });

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e && e.reason;
    var msg = typeof reason === 'string' ? reason : (reason && reason.message) || '';
    if (isChunkError(msg)) markAndReload();
  });

  // Quitar overlay de arranque si React no monta a tiempo
  window.setTimeout(function() {
    var boot = document.getElementById('fe-boot');
    if (boot) boot.remove();
  }, 4000);

  // Tras una carga exitosa, limpiar contador de recuperación
  window.addEventListener('load', function() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
  });
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth" className="dark">
      <head>
        <Script id="fleetease-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Script id="fleetease-load-recovery" strategy="beforeInteractive">
          {loadRecoveryScript}
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
            <ServiceWorkerRegister />
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
