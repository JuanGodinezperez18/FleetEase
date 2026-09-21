"use client";

import { useEffect } from "react";

/**
 * Registers the FleetEase SW and keeps the installed PWA on the latest assets.
 * Avoids reload loops that produced "This page couldn't load" on mobile PWAs.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let hadController = !!navigator.serviceWorker.controller;

    const clearAllCaches = async () => {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      } catch {
        // ignore
      }
    };

    const register = async () => {
      try {
        // One-shot migration: wipe legacy fleetease-v* caches that held JS/CSS.
        const migrated = sessionStorage.getItem("fe_sw_v8_migrated");
        if (!migrated) {
          await clearAllCaches();
          sessionStorage.setItem("fe_sw_v8_migrated", "1");
        }

        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (cancelled) return;

        // Ask waiting worker to activate immediately when present.
        if (registration.waiting) {
          registration.waiting.postMessage("SKIP_WAITING");
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage("SKIP_WAITING");
            }
          });
        });

        await registration.update();

        const checkForUpdate = () => {
          if (document.visibilityState === "visible") {
            void registration.update();
          }
        };
        document.addEventListener("visibilitychange", checkForUpdate);

        const handleControllerChange = () => {
          // First controller claim after install — do not reload.
          if (!hadController) {
            hadController = true;
            return;
          }
          // Soft reload at most once per session when a new SW takes control.
          try {
            if (sessionStorage.getItem("fe_sw_reloaded") === "1") return;
            sessionStorage.setItem("fe_sw_reloaded", "1");
          } catch {
            return;
          }
          window.location.reload();
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        return () => {
          cancelled = true;
          document.removeEventListener("visibilitychange", checkForUpdate);
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            handleControllerChange
          );
        };
      } catch (error) {
        console.warn("[FleetEase] Service Worker registration failed:", error);
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
