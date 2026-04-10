import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { admin } from '@/lib/server/firebase-admin';
import { checkRateLimit, notificationLimiter } from '@/lib/rate-limit';
import { z } from 'zod';

const SendNotificationSchema = z.object({
  userId: z.string().min(1, 'userId es requerido'),
  title: z.string().min(1, 'title es requerido').max(200),
  body: z.string().min(1, 'body es requerido').max(1000),
  type: z.string().optional().default('general'),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  url: z.string().url().nullable().optional(),
  data: z.record(z.string()).optional(),
  companyId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  // Rate limiting para envío de notificaciones
  const rateLimitResponse = await checkRateLimit(request, notificationLimiter);
  if (rateLimitResponse) return rateLimitResponse;

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

    const body = await request.json();

    const parsed = SendNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') },
        { status: 400 }
      );
    }

    const {
      userId,
      title,
      body: messageBody,
      type,
      priority,
      url,
      data,
      companyId,
    } = parsed.data;

    const timestamp = new Date();
    const notificationRef = adminDb.collection('notifications').doc();
    await notificationRef.set({
      userId,
      title,
      message: messageBody,
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
      notification: { title, body: messageBody },
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
