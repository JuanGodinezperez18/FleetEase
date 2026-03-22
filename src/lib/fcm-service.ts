// lib/fcm-service.ts
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { app } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// VAPID key - Reemplazar con tu clave pública de Firebase Console
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

export class FCMService {
  private static messaging: Messaging | null = null;

  /**
   * Inicializar Firebase Messaging
   */
  private static getMessagingInstance(): Messaging | null {
    if (typeof window === 'undefined') return null;

    if (!this.messaging) {
      try {
        this.messaging = getMessaging(app);
      } catch (error) {
        console.error('Error al inicializar Firebase Messaging:', error);
        return null;
      }
    }

    return this.messaging;
  }

  /**
   * Solicitar permisos de notificaciones y obtener token FCM
   */
  static async requestPermissionAndGetToken(userId: string): Promise<string | null> {
    try {
      // Verificar si estamos en el navegador
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('Las notificaciones no están soportadas en este navegador');
        return null;
      }

      // Verificar si ya se otorgó permiso
      if (Notification.permission === 'granted') {
        return await this.getToken(userId);
      }

      // Solicitar permisos
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Permiso de notificaciones concedido');
        return await this.getToken(userId);
      } else {
        console.warn('⚠️ Permiso de notificaciones denegado');
        return null;
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      return null;
    }
  }

  /**
   * Obtener token FCM
   */
  static async getToken(userId: string): Promise<string | null> {
    try {
      const messaging = this.getMessagingInstance();
      if (!messaging) return null;

      if (!VAPID_KEY) {
        console.error('❌ VAPID key no configurada. Agrega NEXT_PUBLIC_FIREBASE_VAPID_KEY en .env.local');
        return null;
      }

      // Registrar service worker si no está registrado
      const registration = await this.registerServiceWorker();
      if (!registration) {
        console.error('No se pudo registrar el service worker');
        return null;
      }

      // Obtener token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        console.log('📱 Token FCM obtenido:', token.substring(0, 20) + '...');

        // Guardar token en Firestore
        await this.saveTokenToFirestore(userId, token);

        return token;
      } else {
        console.warn('No se pudo obtener el token FCM');
        return null;
      }
    } catch (error) {
      console.error('Error al obtener token FCM:', error);
      return null;
    }
  }

  /**
   * Registrar service worker
   */
  private static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers no soportados');
        return null;
      }

      // Verificar si ya está registrado
      const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (existingRegistration) {
        console.log('✅ Service Worker ya registrado');
        return existingRegistration;
      }

      // Registrar nuevo service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('✅ Service Worker registrado correctamente');

      return registration;
    } catch (error) {
      console.error('Error al registrar Service Worker:', error);
      return null;
    }
  }

  /**
   * Guardar token en Firestore
   */
  private static async saveTokenToFirestore(userId: string, token: string): Promise<void> {
    try {
      const tokenDoc = doc(db, 'fcmTokens', userId);

      await setDoc(
        tokenDoc,
        {
          token,
          userId,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log('✅ Token FCM guardado en Firestore');
    } catch (error) {
      console.error('Error al guardar token en Firestore:', error);
    }
  }

  /**
   * Escuchar mensajes en primer plano (cuando la app está abierta)
   */
  static onMessageListener(callback: (payload: any) => void): (() => void) | null {
    const messaging = this.getMessagingInstance();
    if (!messaging) return null;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📬 Mensaje recibido en primer plano:', payload);
      callback(payload);
    });

    return unsubscribe;
  }

  /**
   * Eliminar token (para logout)
   */
  static async deleteToken(userId: string): Promise<void> {
    try {
      const messaging = this.getMessagingInstance();
      if (!messaging) return;

      // En la versión actual de Firebase, deleteToken ya no está disponible
      // En su lugar, simplemente eliminamos el token de Firestore
      const tokenDoc = doc(db, 'fcmTokens', userId);
      await setDoc(
        tokenDoc,
        {
          token: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log('✅ Token FCM eliminado de Firestore');
    } catch (error) {
      console.error('Error al eliminar token:', error);
    }
  }
}
