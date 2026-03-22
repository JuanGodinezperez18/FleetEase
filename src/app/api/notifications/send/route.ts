import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { admin } from '@/lib/server/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // 🔐 AUTENTICACIÓN: Verificar que el usuario esté autenticado
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    } catch (error) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    // Solo admin, editor y superAdmin pueden enviar notificaciones
    const userRole = decodedToken.role as string;
    if (!['admin', 'editor', 'superAdmin'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const {
      userId,
      title,
      body,
      type,
      priority,
      url,
      data,
      companyId,
    } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'userId, title y body son requeridos' }, { status: 400 });
    }

    const timestamp = new Date();
    const notificationRef = adminDb.collection('notifications').doc();
    await notificationRef.set({
      userId,
      title,
      message: body,
      type: type || 'general',
      priority: priority || 'normal',
      url: url || null,
      data: data || null,
      read: false,
      createdAt: timestamp,
      companyId: companyId || null,
    });

    const tokensSnapshot = await adminDb.collection('fcmTokens').where('userId', '==', userId).limit(5).get();

    if (tokensSnapshot.empty) {
      return NextResponse.json({
        success: true,
        notificationSaved: true,
        pushSent: false,
        message: 'Notificación guardada pero usuario sin token FCM',
      });
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter((token): token is string => Boolean(token));

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        notificationSaved: true,
        pushSent: false,
        message: 'Notificación guardada pero no hay tokens válidos',
      });
    }

    const messaging = admin.messaging();
    const fcmPayload = {
      notification: { title, body },
      data: {
        type: type || 'general',
        priority: priority || 'normal',
        url: url || '',
        notificationId: notificationRef.id,
        ...(data || {}),
      },
      android: {
        priority: priority === 'high' ? 'high' as const : 'normal' as const,
        notification: { sound: 'default', clickAction: url || undefined, channelId: type || 'general', priority: priority === 'high' ? 'high' as const : 'default' as const },
      },
      apns: { payload: { aps: { sound: 'default', badge: 1, contentAvailable: true, ...(url && { 'url-args': [url] }) } } },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-icon.png',
          requireInteraction: priority === 'high',
          actions: url ? [{ action: 'open', title: 'Ver más' }] : undefined,
        },
        fcmOptions: { link: url || undefined },
      },
    };

    const sendPromises = tokens.map(async (token) => {
      try {
        await messaging.send({ token, ...fcmPayload });
        return { success: true, token };
      } catch (error: any) {
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          const tokenDoc = tokensSnapshot.docs.find(doc => doc.data().token === token);
          if (tokenDoc) await tokenDoc.ref.delete();
        }
        return { success: false, token, error: error.code };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      notificationSaved: true,
      pushSent: successCount > 0,
      tokensAttempted: tokens.length,
      tokensSucceeded: successCount,
      tokensFailed: failureCount,
      notificationId: notificationRef.id,
    });
  } catch (error: any) {
    console.error('Error en /api/notifications/send:', error);
    return NextResponse.json({ error: 'Error al enviar notificación', details: error.message }, { status: 500 });
  }
}
