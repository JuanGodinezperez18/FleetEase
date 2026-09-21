"use client";

import { useEffect } from "react";

/**
 * Temporarily disables the service worker on all clients.
 * Previous SW versions cached JS/CSS and caused "This page couldn't load"
 * on installed Android PWAs after deploys.
 *
 * We still clear caches and unregister any existing workers so reinstalled
 * PWAs load only from the network (stable). Push can be re-enabled later
 * with a non-caching SW.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const disable = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        // ignore
      }
      try {
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
      } catch {
        // ignore
      }
    };

    void disable();
  }, []);

  return null;
}
