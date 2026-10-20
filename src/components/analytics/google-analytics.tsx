"use client";

/**
 * Google Analytics 4 (GA4) — solo se activa con consentimiento de cookies analíticas.
 *
 * Variable de entorno requerida:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
 *
 * Flujo:
 * 1. Consent Mode por defecto: analytics_storage denied.
 * 2. Si el usuario ya aceptó analytics (o lo acepta en el banner), se actualiza el
 *    consentimiento y se envían pageviews.
 * 3. Cada cambio de ruta en App Router dispara un page_view.
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  COOKIE_CONSENT_EVENT,
  readCookieConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtag(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    // Formato oficial de Google: dataLayer.push(arguments), no un array.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
}

function grantAnalyticsConsent(): void {
  ensureGtag();
  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
  });
}

function denyAnalyticsConsent(): void {
  ensureGtag();
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
  });
}

function sendPageView(url: string): void {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  ensureGtag();
  window.gtag?.("event", "page_view", {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}

function buildPath(pathname: string, searchParams: ReturnType<typeof useSearchParams>): string {
  const qs = searchParams?.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analyticsEnabledRef = useRef(false);
  const configuredRef = useRef(false);

  // Aplicar consentimiento guardado y reaccionar a cambios del banner
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const applyConsent = (consent: CookieConsent | null) => {
      if (consent?.analytics) {
        grantAnalyticsConsent();
        if (!configuredRef.current) {
          ensureGtag();
          window.gtag?.("config", GA_MEASUREMENT_ID, {
            anonymize_ip: true,
            send_page_view: false,
          });
          configuredRef.current = true;
        }
        analyticsEnabledRef.current = true;
        sendPageView(buildPath(pathname, searchParams));
      } else {
        denyAnalyticsConsent();
        analyticsEnabledRef.current = false;
      }
    };

    applyConsent(readCookieConsent());

    const onConsentChanged = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent>).detail;
      applyConsent(detail ?? readCookieConsent());
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChanged);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChanged);
    // Solo al montar: el pageview por ruta se maneja en el otro effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pageviews en navegación cliente (App Router)
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !analyticsEnabledRef.current) return;
    sendPageView(buildPath(pathname, searchParams));
  }, [pathname, searchParams]);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      {/* Consent Mode v2: denegado por defecto hasta que el usuario acepte analytics */}
      <Script id="ga4-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-js-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        `}
      </Script>
    </>
  );
}
