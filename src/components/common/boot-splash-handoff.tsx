"use client";

import { useEffect } from "react";

/**
 * Hides the static #fe-boot overlay after the React tree has committed.
 * Uses a short double-rAF so the first painted frame of the app (or route
 * skeleton) is ready before the splash fades — avoids a single empty box flash.
 */
export function BootSplashHandoff() {
  useEffect(() => {
    let cancelled = false;
    const hide = () => {
      if (!cancelled) {
        document.documentElement.dataset.feBootHidden = "true";
      }
    };

    // Wait two animation frames so layout/paint of children can settle.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Small delay keeps the branded splash readable on fast devices.
        window.setTimeout(hide, 120);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  return null;
}
