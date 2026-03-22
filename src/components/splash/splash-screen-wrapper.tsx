// components/splash/splash-screen-wrapper.tsx
'use client';

import { useEffect, ReactNode } from 'react';
import { useSplash } from '@/contexts/splash-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/contexts/data-provider';
import { SplashScreen } from './splash-screen';

interface SplashScreenWrapperProps {
  children: ReactNode;
}

export function SplashScreenWrapper({ children }: SplashScreenWrapperProps) {
  const { showSplash, setDataLoaded, hideSplash } = useSplash();
  const { loading: authLoading } = useAuth();
  const dataContext = useData();

  // Verificar si los datos están cargados
  useEffect(() => {
    // Considerar los datos cargados cuando:
    // 1. Auth no está cargando
    // 2. DataProvider no está cargando
    const isLoaded = !authLoading && !dataContext?.loadingData;

    if (isLoaded) {
      // Pequeño delay para asegurar que todo está renderizado
      const timer = setTimeout(() => {
        setDataLoaded(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [authLoading, dataContext?.loadingData, setDataLoaded]);

  return (
    <>
      {showSplash && (
        <SplashScreen
          duration={3000}
          onFinish={() => {
            console.log('✅ Splash screen finalizado');
          }}
          forceHide={!showSplash}
        />
      )}
      {children}
    </>
  );
}
