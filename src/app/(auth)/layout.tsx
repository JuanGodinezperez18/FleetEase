"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { PasswordVisibility } from '@/components/auth/password-visibility';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) router.replace('/dashboard');
  }, [currentUser, loading, router]);

  // Auth screens are designed as a dark shell. Force dark tokens while mounted
  // so light-theme CSS bridges cannot turn inputs light while text stays white.
  useEffect(() => {
    const root = document.documentElement;
    const hadLight = root.classList.contains('light');
    const hadDark = root.classList.contains('dark');
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';

    return () => {
      // Restore previous theme class if the user had light preference.
      // ThemeProvider / next-themes will re-apply the preferred class shortly after.
      if (hadLight && !hadDark) {
        root.classList.add('light');
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };
  }, []);

  if (loading || currentUser) return <GlobalLoader />;

  return (
    <div className="fleetease-auth-modern dark min-h-screen bg-[var(--fe-ink)] text-[var(--fe-text)]">
      <PasswordVisibility>{children}</PasswordVisibility>
    </div>
  );
}
