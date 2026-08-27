import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Manrope } from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/common/providers";
import GlobalErrorBoundary from "@/components/common/global-error-boundary";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: "Sistema de Gestión",
  description: "Sistema completo de gestión vehicular",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${manrope.variable} font-sans`}>
        <GlobalErrorBoundary>
            <Providers>
              {children}
              <Toaster />
            </Providers>
        </GlobalErrorBoundary>
        <Script id="chunk-error-handler">
          {`
            window.addEventListener('error', (e) => {
              if (e.message.includes('ChunkLoadError')) {
                window.location.reload();
              }
            });
          `}
        </Script>
      </body>
    </html>
  );
}
