"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-provider";
import { GlobalLoader } from "@/components/common/GlobalLoader";

/**
 * Client island: redirects authenticated users to /dashboard.
 * While auth is loading we still render children (SSR content stays visible).
 * Only shows a full-page loader if the user is already known to be logged in
 * and we are about to redirect — avoids blank CSR shell for crawlers.
 */
export function LandingAuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace("/dashboard");
    }
  }, [currentUser, loading, router]);

  // If we already know the user is logged in, show loader while redirecting
  if (!loading && currentUser) {
    return <GlobalLoader />;
  }

  return <>{children}</>;
}
