// components/splash/splash-screen-wrapper.tsx
'use client';

import { useEffect } from 'react';
import { useSplash } from '@/contexts/splash-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/contexts/data-provider';
import { SplashScreen } from './splash-screen';

interface SplashScreenWrapperProps {
  children: React.ReactNode;
}

export function SplashScreenWrapper({ children }: SplashScreenWrapperProps) {
  const { showSplash, setDataLoaded } = useSplash();
  const { loading: authLoading } = useAuth();
  const dataContext = useData();

  // Mark initial data as loaded once auth and the DataProvider finish.
  // The splash component owns its visual timeout; keeping the callback
  // stable avoids restarting that timeout on every parent render.
  useEffect(() => {
    const isLoaded = !authLoading && !dataContext?.loadingData;

    if (!isLoaded) return;

    const timer = window.setTimeout(() => {
      setDataLoaded(true);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [authLoading, dataContext?.loadingData, setDataLoaded]);

  return (
    <>
      {showSplash && <SplashScreen duration={3000} />}
      {children}
    </>
  );
}
