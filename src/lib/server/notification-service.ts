'use server';

import { adminDb } from './firebase-admin';
import * as admin from 'firebase-admin';

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: string;
  priority?: 'normal' | 'high';
  url?: string;
  companyId?: string;
  data?: Record<string, any>;
}

export class NotificationService {
  /**
   * Envía una notificación a un usuario específico.
   */
  static async notifyUser(userId: string, payload: Omit<NotificationPayload, 'userId'>): Promise<void> {
    const fullPayload: NotificationPayload = { ...payload, userId };
    return this.send(fullPayload);
  }

  /**
   * Envía una notificación a todos los administradores y editores de una empresa.
   */
  static async notifyAdmins(companyId: string, payload: Omit<NotificationPayload, 'userId' | 'companyId'>): Promise<void> {
    try {
      const adminsSnapshot = await adminDb
        .collection('users')
        .where('companyId', '==', companyId)
        .where('role', 'in', ['admin', 'editor', 'superAdmin'])
        .get();

      const notifications = adminsSnapshot.docs.map(adminDoc => {
        const adminPayload: NotificationPayload = {
          ...payload,
          userId: adminDoc.id,
          companyId,
        };
        return this.send(adminPayload);
      });

      await Promise.all(notifications);
    } catch (error) {
      console.error('Error notificando a admins:', error);
    }
  }

  /**
   * Envía una notificación a un cliente específico.
   */
  static async notifyClient(clientId: string, payload: Omit<NotificationPayload, 'userId' | 'companyId'>): Promise<void> {
    try {
      const clientDoc = await adminDb.collection('clients').doc(clientId).get();
      if (!clientDoc.exists) return;

      const clientData = clientDoc.data();
      if (clientData?.userId) {
        const clientPayload: NotificationPayload = {
          ...payload,
          userId: clientData.userId,
          companyId: clientData.companyId,
        };
        await this.send(clientPayload);
      }
    } catch (error) {
      console.error('Error notificando al cliente:', error);
    }
  }
  
    /**
   * Envía una notificación a un socio específico.
   */
  static async notifyPartner(partnerId: string, payload: Omit<NotificationPayload, 'userId' | 'companyId'>): Promise<void> {
    try {
      const partnerDoc = await adminDb.collection('partners').doc(partnerId).get();
      if (!partnerDoc.exists) return;

      const partnerData = partnerDoc.data();
      if (partnerData?.userId) {
        const partnerPayload: NotificationPayload = {
          ...payload,
          userId: partnerData.userId,
          companyId: partnerData.companyId,
        };
        await this.send(partnerPayload);
      }
    } catch (error) {
      console.error('Error notificando al socio:', error);
    }
  }


  /**
   * Lógica principal para enviar notificaciones.
   */
  private static async send(payload: NotificationPayload): Promise<void> {
    try {
      // 1. Guardar en Firestore
      await adminDb.collection('notifications').add({
        userId: payload.userId,
        title: payload.title,
        message: payload.body,
        type: payload.type,
        priority: payload.priority || 'normal',
        url: payload.url || null,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        companyId: payload.companyId || null,
      });

      // 2. Obtener tokens FCM
      const tokensSnapshot = await adminDb
        .collection('fcmTokens')
        .where('userId', '==', payload.userId)
        .limit(5)
        .get();

      if (tokensSnapshot.empty) {
        return;
      }

      const tokens = tokensSnapshot.docs
        .map(doc => doc.data().token)
        .filter((token): token is string => Boolean(token));

      if (tokens.length === 0) return;
      
      // 3. Enviar push con FCM
      const messaging = admin.messaging();
      const fcmPayload = {
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            type: payload.type,
            priority: payload.priority || 'normal',
            url: payload.url || '',
            ...(payload.data || {}),
          },
          android: {
            priority: (payload.priority === 'high' ? 'high' : 'normal') as 'high' | 'normal',
            notification: { sound: 'default' },
          },
          apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
          },
          webpush: {
            notification: {
              icon: '/icon-192x192.png',
              requireInteraction: payload.priority === 'high',
            },
          },
        };

      const { failureCount, successCount, responses } = await messaging.sendEachForMulticast({ tokens, ...fcmPayload });

      if (failureCount > 0) {
        console.warn(`${failureCount} notificaciones push fallaron.`);

        const failedTokens: string[] = [];
        responses.forEach((response, i) => {
          if (!response.success && response.error) {
              const errorCode = response.error.code;
              if (errorCode === 'messaging/invalid-registration-token' ||
                  errorCode === 'messaging/registration-token-not-registered') {
                  failedTokens.push(tokens[i]);
              }
          }
        });

        // Eliminar tokens inválidos
        if (failedTokens.length > 0) {
            const batch = adminDb.batch();
            const tokensQuery = await adminDb.collection('fcmTokens').where('token', 'in', failedTokens).get();
            tokensQuery.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
      }
    } catch (error) {
      console.error('❌ Error en NotificationService.send:', error);
    }
  }
}
