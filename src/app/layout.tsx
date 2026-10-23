import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Inter, Manrope, JetBrains_Mono } from 'next/font/google';
import "./globals.css";
import "./fleetease-ui.css";
import "./landing-text.css";
import "@/components/ui/search.css";
import { Toaster } from "@/components/ui/toaster";
import { CookieBanner } from "@/components/cookie-consent/cookie-banner";
import { Providers } from "@/components/common/providers";
import GlobalErrorBoundary from "@/components/common/global-error-boundary";
import { OfflineIndicator } from "@/components/common/offline-indicator";
import { PwaInstallButton } from "@/components/common/pwa-install-button";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

/** Publisher ID de AdSense (verificación del sitio + unidades de anuncio). */
const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fleetease.com.mx"),
  title: {
    default: "FleetEase | Software de Gestión de Flotillas en México",
    template: "%s | FleetEase",
  },
  description: "Software de gestión de flotillas y renta de vehículos en México. Controla rentabilidad, mantenimiento y operación. Plan Free permanente con todas las funciones.",
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
    description: "Controla rentabilidad, mantenimiento y operación de tu flotilla. Plan Free permanente con todas las funciones.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "FleetEase Manager" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FleetEase | Software de Gestión de Flotillas en México",
    description: "Controla rentabilidad, mantenimiento y operación de tu flotilla.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#080a0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('fleetease-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

const legacySwCleanupScript = `
(function() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    regs.forEach(function(r) {
      if (r.scope && r.scope.indexOf(location.origin) === 0) {
        /* keep active SW */
      }
    });
  }).catch(function() {});
})();
`;

/**
 * Failsafe: never leave the static #fe-boot overlay up if React/auth hangs.
 * Only toggle data-fe-boot-hidden — CSS hides the overlay.
 * Do NOT removeChild: #fe-boot is owned by React in the layout tree;
 * removing it causes NotFoundError on hydration/navigation.
 */
const bootFailsafeScript = `
(function() {
  try {
    function hideBoot() {
      document.documentElement.dataset.feBootHidden = 'true';
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(hideBoot, 300);
    } else {
      window.addEventListener('DOMContentLoaded', function() {
        setTimeout(hideBoot, 300);
      });
    }
    setTimeout(hideBoot, 2500);
  } catch (e) {}
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
        <Script id="fleetease-boot-failsafe" strategy="beforeInteractive">
          {bootFailsafeScript}
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
        {adsenseClientId ? (
          <Script
            id="adsense-init"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} font-sans fe-shell-bg antialiased`}>
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
            <CookieBanner />
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>
            <Analytics />
          </Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
