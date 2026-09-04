// components/splash/splash-screen.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './splash-screen.module.css';

interface SplashScreenProps {
  duration?: number;
  onFinish?: () => void;
  forceHide?: boolean;
}

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i * 0.43) % 5}s`,
  duration: `${7 + (i % 6)}s`,
  opacity: 0.12 + (i % 4) * 0.06,
}));

export function SplashScreen({ duration = 2200, onFinish, forceHide = false }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const progressInterval = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 100));
    }, Math.max(duration / 50, 20));

    const timer = window.setTimeout(() => {
      setFadeOut(true);
      window.setTimeout(() => {
        setIsVisible(false);
        onFinish?.();
      }, 300);
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
    }, 300);
    return () => window.clearTimeout(timer);
  }, [forceHide, isVisible, onFinish]);

  if (!isVisible) return null;

  return (
    <div className={`${styles.splashContainer} ${fadeOut ? styles.fadeOut : ''}`} role="dialog" aria-label="Pantalla de carga" aria-live="polite">
      <div className={styles.particlesContainer} aria-hidden="true">
        {PARTICLES.map((particle, i) => (
          <div key={i} className={styles.particle} style={{ left: particle.left, animationDelay: particle.delay, animationDuration: particle.duration, opacity: particle.opacity }} />
        ))}
      </div>

      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <div className={styles.logoGlow} />
          <div className={styles.logoWrapper}>
            <Image src="/web-app-manifest-512x512.png" alt="FleetEase Manager Logo" width={150} height={150} priority className={styles.logo} />
          </div>
        </div>

        <h1 className={styles.appName}>FleetEase Manager</h1>
        <p className={styles.tagline}>Gestión Inteligente de Flotas</p>

        <div className={styles.progressBarContainer}>
          <div className={styles.progressBarBackground}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressText}>{Math.round(progress)}%</span>
        </div>

        <div className={styles.loadingDots} aria-hidden="true">
          <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
        </div>
        <p className={styles.loadingText}>Cargando tu experiencia...</p>
      </div>

      <div className={styles.footer}>
        <p className={styles.copyright}>© {new Date().getFullYear()} FleetEase Manager</p>
      </div>
    </div>
  );
}
