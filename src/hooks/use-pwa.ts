// src/hooks/use-pwa.ts
'use client';

import { useState, useEffect } from 'react';
import { PWAConfig } from '@/app/pwa-config';

/**
 * Hook para usar features de PWA
 */
export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    // Check if installed
    setIsInstalled(PWAConfig.isStandalone());

    // Listen for updates
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener('pwa-update-available', handleUpdate);

    // Register SW
    PWAConfig.registerSW();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, []);

  return {
    isOnline,
    isInstalled,
    updateAvailable,
    install: () => PWAConfig.requestNotificationPermission(),
    update: () => window.location.reload(),
  };
};
