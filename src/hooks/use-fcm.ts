// hooks/use-fcm.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { FCMService } from '@/lib/fcm-service';
import { useAuth } from '@/contexts/auth-provider';
import { toast } from 'sonner';

export function useFCM() {
  const { currentUser } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar permisos existentes
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsPermissionGranted(Notification.permission === 'granted');
    }
    setIsLoading(false);
  }, []);

  // Solicitar permisos y obtener token
  const requestPermission = useCallback(async () => {
    if (!currentUser) {
      toast.error('Debes iniciar sesión para habilitar notificaciones');
      return null;
    }

    setIsLoading(true);

    try {
      const token = await FCMService.requestPermissionAndGetToken(currentUser.uid);

      if (token) {
        setFcmToken(token);
        setIsPermissionGranted(true);
        toast.success('Notificaciones habilitadas', {
          description: 'Recibirás notificaciones push en este dispositivo',
        });
        return token;
      } else {
        toast.error('No se pudieron habilitar las notificaciones');
        return null;
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      toast.error('Error al configurar notificaciones');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Escuchar mensajes en primer plano
  useEffect(() => {
    if (!currentUser || !isPermissionGranted) return;

    const unsubscribe = FCMService.onMessageListener((payload) => {
      // Mostrar notificación usando toast cuando la app está abierta
      toast.info(payload.notification?.title || 'Nueva notificación', {
        description: payload.notification?.body,
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, isPermissionGranted]);

  // Eliminar token al desmontar (logout)
  useEffect(() => {
    return () => {
      if (currentUser && fcmToken) {
        FCMService.deleteToken(currentUser.uid);
      }
    };
  }, [currentUser, fcmToken]);

  return {
    fcmToken,
    isPermissionGranted,
    isLoading,
    requestPermission,
  };
}
