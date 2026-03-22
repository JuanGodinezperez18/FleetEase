// src/app/pwa-config.ts
// Configuración PWA para FleetEase Manager

export const PWAConfig = {
  // Service Worker registration
  registerSW: async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        
        console.log('[PWA] Service Worker registrado:', registration.scope);
        
        // Actualizar contenido dinámicamente
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Nuevo contenido disponible
                  console.log('[PWA] Nuevo contenido disponible, recargar para actualizar');
                  dispatchEvent(new CustomEvent('pwa-update-available'));
                } else {
                  // Primera instalación
                  console.log('[PWA] Contenido cacheado para uso offline');
                  dispatchEvent(new CustomEvent('pwa-ready'));
                }
              }
            };
          }
        };
        
        return registration;
      } catch (error) {
        console.error('[PWA] Error registrando Service Worker:', error);
        return null;
      }
    }
    return null;
  },

  // Unregister Service Worker
  unregisterSW: async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('[PWA] Service Worker desregistrado');
    }
  },

  // Request notification permission
  requestNotificationPermission: async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  // Send notification
  sendNotification: (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...(options as NotificationOptions),
      });
    }
    return null;
  },

  // Add to home screen prompt
  setupInstallPrompt: (onPrompt: (prompt: () => void) => void) => {
    let deferredPrompt: any = null;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      onPrompt(() => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('[PWA] Usuario aceptó instalar la app');
            }
            deferredPrompt = null;
          });
        }
      });
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App instalada exitosamente');
      deferredPrompt = null;
    });
  },

  // Check if app is installed/running as PWA
  isStandalone: () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  },
};
