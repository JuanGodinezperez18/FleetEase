'use client';

import { useEffect } from 'react';
import { useSplash } from '@/contexts/splash-provider';
import { useAuth } from '@/contexts/auth-provider';
import { SplashScreen } from './splash-screen';

interface SplashScreenWrapperProps {
  children: React.ReactNode;
}

/**
 * El splash es únicamente visual. No debe depender de las consultas de datos
 * porque una consulta lenta nunca debe impedir que la aplicación aparezca.
 */
export function SplashScreenWrapper({ children }: SplashScreenWrapperProps) {
  const { showSplash, setDataLoaded } = useSplash();
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    if (!showSplash) return;

    // Límite absoluto: el splash nunca puede quedarse indefinidamente.
    const maxTimer = window.setTimeout(() => {
      setDataLoaded(true);
    }, 2500);

    // Si autenticación termina correctamente, retiramos el splash poco después.
    if (!authLoading) {
      const readyTimer = window.setTimeout(() => {
        setDataLoaded(true);
      }, 350);

      return () => {
        window.clearTimeout(maxTimer);
        window.clearTimeout(readyTimer);
      };
    }

    return () => window.clearTimeout(maxTimer);
  }, [showSplash, authLoading, setDataLoaded]);

  return (
    <>
      {showSplash && <SplashScreen duration={2200} />}
      {children}
    </>
  );
}
