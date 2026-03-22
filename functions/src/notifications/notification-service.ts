
// functions/src/notifications/notification-service.ts
import * as admin from 'firebase-admin';

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: string;
  priority: 'normal' | 'high';
  url?: string;
  companyId?: string;
  data?: Record<string, any>;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const db = admin.firestore();
  
  try {
    // 1. Guardar en Firestore
    await db.collection('notifications').add({
      userId: payload.userId,
      title: payload.title,
      message: payload.body,
      type: payload.type,
      priority: payload.priority,
      url: payload.url || null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      companyId: payload.companyId || null,
    });

    // 2. Obtener tokens FCM
    const tokensSnapshot = await db
      .collection('fcmTokens')
      .where('userId', '==', payload.userId)
      .limit(5)
      .get();

    if (tokensSnapshot.empty) {
      console.log(`⚠️ Usuario ${payload.userId} sin tokens FCM`);
      return;
    }

    const tokens = tokensSnapshot.docs
      .map(doc => doc.data().token)
      .filter((token): token is string => Boolean(token));

    // 3. Enviar push
    const messaging = admin.messaging();
    for (const token of tokens) {
      try {
        await messaging.send({
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            type: payload.type,
            priority: payload.priority,
            url: payload.url || '',
            ...(payload.data || {}),
          },
          android: {
            priority: payload.priority === 'high' ? 'high' : 'normal',
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
        });
        console.log(`✅ Notificación enviada a ${payload.userId}`);
      } catch (error: any) {
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          // Eliminar token inválido
          const tokenDoc = tokensSnapshot.docs.find(doc => doc.data().token === token);
          if (tokenDoc) await tokenDoc.ref.delete();
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en sendNotification:', error);
    throw error;
  }
}

    