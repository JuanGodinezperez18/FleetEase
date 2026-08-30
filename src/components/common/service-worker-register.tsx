"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (error) {
        console.warn('[FleetEase] Service Worker registration failed:', error);
      }
    };

    void register();
  }, []);

  return null;
}
