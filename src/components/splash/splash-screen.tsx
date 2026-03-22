// components/splash/splash-screen.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './splash-screen.module.css';

interface SplashScreenProps {
  /** Duración del splash en milisegundos */
  duration?: number;
  /** Callback cuando termina el splash */
  onFinish?: () => void;
  /** Forzar ocultar el splash */
  forceHide?: boolean;
}

export function SplashScreen({
  duration = 3000,
  onFinish,
  forceHide = false
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Animación de la barra de progreso
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Progreso más rápido al inicio, más lento al final
        const increment = prev < 50 ? 3 : prev < 80 ? 2 : 1;
        return Math.min(prev + increment, 100);
      });
    }, duration / 50);

    // Timer para ocultar el splash
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setIsVisible(false);
        onFinish?.();
      }, 500); // Tiempo de fade out
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [duration, onFinish]);

  // Ocultar inmediatamente si se fuerza
  useEffect(() => {
    if (forceHide && isVisible) {
      setFadeOut(true);
      setTimeout(() => {
        setIsVisible(false);
        onFinish?.();
      }, 500);
    }
  }, [forceHide, isVisible, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`${styles.splashContainer} ${fadeOut ? styles.fadeOut : ''}`}
      role="dialog"
      aria-label="Pantalla de carga"
      aria-live="polite"
    >
      {/* Partículas flotantes de fondo */}
      <div className={styles.particlesContainer}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className={styles.particle}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              opacity: 0.1 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>

      {/* Contenido principal */}
      <div className={styles.content}>
        {/* Logo con animaciones */}
        <div className={styles.logoContainer}>
          <div className={styles.logoGlow} />
          <div className={styles.logoWrapper}>
            <Image
              src="/logo.png"
              alt="FleetEase Manager Logo"
              width={150}
              height={150}
              priority
              className={styles.logo}
            />
          </div>
        </div>

        {/* Nombre de la aplicación */}
        <h1 className={styles.appName}>
          FleetEase Manager
        </h1>

        {/* Tagline */}
        <p className={styles.tagline}>
          Gestión Inteligente de Flotas
        </p>

        {/* Barra de progreso */}
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBarBackground}>
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.progressText}>{Math.round(progress)}%</span>
        </div>

        {/* Dots de carga animados */}
        <div className={styles.loadingDots}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>

        {/* Texto de carga */}
        <p className={styles.loadingText}>
          Cargando tu experiencia...
        </p>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} FleetEase Manager
        </p>
      </div>
    </div>
  );
}
