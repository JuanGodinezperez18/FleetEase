"use client";

import React from "react";
import { ThemeProvider } from "@/contexts/theme-provider";
import { SupabaseAuthProvider } from "@/contexts/auth-provider-supabase";
import { DataProvider } from "@/contexts/data-provider-supabase";
import { SplashProvider } from "@/contexts/splash-provider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from "sonner";
import { ToastProvider } from "@/contexts/toast-provider";
import { SplashScreenWrapper } from "@/components/splash/splash-screen-wrapper";
import { retryQuery, retryDelayQuery } from "@/lib/query-resilience";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        networkMode: 'offlineFirst',
        retry: retryQuery,
        retryDelay: retryDelayQuery,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        networkMode: 'online',
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        storageKey="theme"
        disableTransitionOnChange
      >
        <SplashProvider minDuration={400} enabled={true}>
          <ToastProvider>
            <SupabaseAuthProvider>
              <DataProvider>
                <SplashScreenWrapper>
                  {children}
                </SplashScreenWrapper>
              </DataProvider>
            </SupabaseAuthProvider>
            <SonnerToaster position="top-right" richColors />
          </ToastProvider>
        </SplashProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
