// contexts/splash-provider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SplashContextType {
  showSplash: boolean;
  hideSplash: () => void;
  isDataLoaded: boolean;
  setDataLoaded: (loaded: boolean) => void;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

interface SplashProviderProps {
  children: ReactNode;
  /** Tiempo mínimo que debe mostrarse el splash (ms) */
  minDuration?: number;
  /** Si debe mostrarse el splash al cargar la app */
  enabled?: boolean;
}

export function SplashProvider({
  children,
  minDuration = 2000,
  enabled = true
}: SplashProviderProps) {
  const [showSplash, setShowSplash] = useState(() => {
    // Solo mostrar el splash si es la primera carga
    if (typeof window === 'undefined') return enabled;

    const hasShownSplash = sessionStorage.getItem('hasShownSplash');
    return enabled && !hasShownSplash;
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !showSplash) return;

    // Marcar que ya se mostró el splash en esta sesión
    sessionStorage.setItem('hasShownSplash', 'true');

    // Asegurar que el splash se muestre al menos minDuration
    const checkAndHide = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        if (isDataLoaded) {
          setShowSplash(false);
        }
      }, remaining);
    };

    if (isDataLoaded) {
      checkAndHide();
    }
  }, [isDataLoaded, startTime, minDuration, enabled, showSplash]);

  const hideSplash = () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minDuration - elapsed);

    setTimeout(() => {
      setShowSplash(false);
    }, remaining);
  };

  const setDataLoaded = (loaded: boolean) => {
    setIsDataLoaded(loaded);
  };

  return (
    <SplashContext.Provider
      value={{
        showSplash,
        hideSplash,
        isDataLoaded,
        setDataLoaded
      }}
    >
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error('useSplash debe usarse dentro de SplashProvider');
  }
  return context;
}

/**
 * Hook para marcar que los datos se han cargado
 * Debe ser llamado cuando la carga inicial de datos termine
 */
export function useMarkDataLoaded() {
  const { setDataLoaded } = useSplash();

  useEffect(() => {
    // Auto-marcar como cargado después de un tiempo máximo
    const maxLoadTime = setTimeout(() => {
      setDataLoaded(true);
    }, 10000); // 10 segundos máximo

    return () => clearTimeout(maxLoadTime);
  }, [setDataLoaded]);

  return setDataLoaded;
}
