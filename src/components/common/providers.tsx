"use client";

import React from "react";
import { ThemeProvider } from "@/contexts/theme-provider";
import { AuthProvider } from "@/contexts/auth-provider";
import { DataProvider } from "@/contexts/data-provider";
import { SplashProvider } from "@/contexts/splash-provider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from "sonner";
import { ToastProvider } from "@/contexts/toast-provider";
import { SplashScreenWrapper } from "@/components/splash/splash-screen-wrapper";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SplashProvider minDuration={2500} enabled={true}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <AuthProvider>
              <DataProvider>
                <SplashScreenWrapper>
                  {children}
                </SplashScreenWrapper>
              </DataProvider>
            </AuthProvider>
            <SonnerToaster position="top-right" richColors />
          </ToastProvider>
        </ThemeProvider>
      </SplashProvider>
    </QueryClientProvider>
  );
}
