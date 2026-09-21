'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  duration?: number;
  onFinish?: () => void;
  forceHide?: boolean;
}

/**
 * Única pantalla de arranque: nombre + carga.
 * Sin imagen estática del logo (el lobo solo provocaba un flash vacío).
 */
export function SplashScreen({ duration = 1400, onFinish, forceHide = false }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(8);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const progressInterval = window.setInterval(() => {
      setProgress(prev => Math.min(prev + 4, 100));
    }, Math.max(duration / 40, 16));

    const timer = window.setTimeout(() => {
      setFadeOut(true);
      window.setTimeout(() => {
        setIsVisible(false);
        onFinish?.();
      }, 220);
    }, duration);

    return () => {
      window.clearInterval(progressInterval);
      window.clearTimeout(timer);
    };
  }, [duration, onFinish]);

  useEffect(() => {
    if (!forceHide || !isVisible) return;
    setFadeOut(true);
    const timer = window.setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [forceHide, isVisible, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center fe-shell-bg transition-opacity duration-200 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-label="Cargando FleetEase"
      aria-live="polite"
    >
      <div className="relative z-10 flex w-[min(92%,420px)] flex-col items-center px-6 text-center">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] fe-text-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
          Fleet OS
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.05em] fe-text sm:text-4xl">
          FleetEase <span className="text-[#d7ff3f]">Manager</span>
        </h1>
        <p className="mt-2 text-sm fe-text-muted">Gestión inteligente de flotillas</p>

        <div className="mt-8 w-full max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fe-hover)]">
            <div
              className="h-full rounded-full bg-[#d7ff3f] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] fe-text-faint">{Math.round(progress)}%</p>
        </div>
        <p className="mt-4 text-xs fe-text-muted">Cargando tu experiencia…</p>
      </div>

      <p className="absolute bottom-5 text-[11px] fe-text-faint">
        © {new Date().getFullYear()} FleetEase Manager
      </p>
    </div>
  );
}
