'use client';

import { useEffect } from 'react';
import { useSplash } from '@/contexts/splash-provider';
import { useAuth } from '@/contexts/auth-provider';
import { SplashScreen } from './splash-screen';

interface SplashScreenWrapperProps {
  children: React.ReactNode;
}

export function SplashScreenWrapper({ children }: SplashScreenWrapperProps) {
  const { showSplash, setDataLoaded } = useSplash();
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    if (!showSplash) return;

    const maxTimer = window.setTimeout(() => setDataLoaded(true), 1600);

    if (!authLoading) {
      const readyTimer = window.setTimeout(() => setDataLoaded(true), 200);
      return () => {
        window.clearTimeout(maxTimer);
        window.clearTimeout(readyTimer);
      };
    }

    return () => window.clearTimeout(maxTimer);
  }, [showSplash, authLoading, setDataLoaded]);

  return (
    <>
      {showSplash && <SplashScreen duration={1200} />}
      {children}
    </>
  );
}
