"use client";

import { useEffect } from "react";

/** Hides the static boot layer only after the React tree has committed. */
export function BootSplashHandoff() {
  useEffect(() => {
    document.documentElement.dataset.feBootHidden = "true";
  }, []);

  return null;
}
