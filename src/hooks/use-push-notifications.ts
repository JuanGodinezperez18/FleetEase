// hooks/use-push-notifications.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { app } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-provider';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export function usePushNotifications() {
  const { currentUser } = useAuth();
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Inicializar messaging solo en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const messagingInstance = getMessaging(app);
        setMessaging(messagingInstance);
        setNotificationPermission(Notification.permission);
      } catch (error) {
        console.error('Error al inicializar Firebase Messaging:', error);
      }
    }
  }, []);

  // Solicitar permiso y registrar token
  const requestPermission = useCallback(async () => {
    if (!messaging || !currentUser) return null;

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });

        if (token) {
          setFcmToken(token);
          
          // Guardar token en Firestore
          await setDoc(doc(db, 'fcmTokens', currentUser.uid), {
            token,
            userId: currentUser.uid,
            timestamp: serverTimestamp(),
            platform: 'web',
            userAgent: navigator.userAgent,
          }, { merge: true });

          toast.success('Notificaciones habilitadas correctamente');
          return token;
        }
      } else {
        toast.error('Permiso de notificaciones denegado');
      }
    } catch (error) {
      console.error('Error al solicitar permiso de notificaciones:', error);
      toast.error('Error al habilitar notificaciones');
    }

    return null;
  }, [messaging, currentUser]);

  // Escuchar mensajes en primer plano
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Mensaje recibido en primer plano:', payload);
      
      // Mostrar notificación usando toast
      toast(payload.notification?.title || 'Notificación', {
        description: payload.notification?.body,
        action: payload.data?.url ? {
          label: 'Ver',
          onClick: () => {
            if (payload.data?.url) {window.location.href = payload.data.url;
            }
          }
        } : undefined,
      });
    });

    return () => unsubscribe();
  }, [messaging]);

  return {
    notificationPermission,
    fcmToken,
    requestPermission,
    isSupported: !!messaging,
  };
}