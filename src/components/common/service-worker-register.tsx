"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let hadController = !!navigator.serviceWorker.controller;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        await registration.update();

        const checkForUpdate = () => {
          if (document.visibilityState === 'visible') {
            void registration.update();
          }
        };

        document.addEventListener('visibilitychange', checkForUpdate);

        const handleControllerChange = () => {
          if (!hadController) {
            hadController = true;
            return;
          }
          window.location.reload();
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        return () => {
          document.removeEventListener('visibilitychange', checkForUpdate);
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
      } catch (error) {
        console.warn('[FleetEase] Service Worker registration failed:', error);
      }
    };

    void register();
  }, []);

  return null;
}
