import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { admin } from '@/lib/server/firebase-admin';

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

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

    // Solo admin y superAdmin pueden enviar notificaciones broadcast
    const userRole = decodedToken.role as string;
    if (!['admin', 'superAdmin'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes - Solo administradores pueden enviar broadcasts' }, { status: 403 });
    }

    const {
      title,
      message,
      recipientType,
      selectedUsers,
      sendPush,
      priority,
      senderName,
      companyId,
    } = await request.json();

    let recipientUserIds: string[] = [];

    // ✅ Optimización: Usar Promise.all para queries paralelas cuando sea posible
    switch (recipientType) {
      case 'all':
        const allUsersSnap = await adminDb
          .collection('users')
          .where('companyId', '==', companyId)
          .select() // Solo IDs, más rápido
          .get();
        recipientUserIds = allUsersSnap.docs.map(doc => doc.id);
        break;

      case 'admins':
        const adminsSnap = await adminDb
          .collection('users')
          .where('companyId', '==', companyId)
          .where('role', '==', 'admin')
          .select()
          .get();
        recipientUserIds = adminsSnap.docs.map(doc => doc.id);
        break;

      case 'editors':
        const editorsSnap = await adminDb
          .collection('users')
          .where('companyId', '==', companyId)
          .where('role', '==', 'editor')
          .select()
          .get();
        recipientUserIds = editorsSnap.docs.map(doc => doc.id);
        break;

      case 'partners':
        const partnersSnap = await adminDb
          .collection('partners')
          .where('companyId', '==', companyId)
          .select('userId')
          .get();
        recipientUserIds = partnersSnap.docs
          .map(doc => doc.data().userId)
          .filter((id): id is string => Boolean(id));
        break;

      case 'clients':
        const clientsSnap = await adminDb
          .collection('clients')
          .where('companyId', '==', companyId)
          .select('userId')
          .get();
        recipientUserIds = clientsSnap.docs
          .map(doc => doc.data().userId)
          .filter((id): id is string => Boolean(id));
        break;

      case 'specific':
        recipientUserIds = selectedUsers || [];
        break;
    }

    // ✅ Optimización: Usar batches múltiples (máx 500 operaciones por batch)
    const timestamp = new Date();
    const MAX_BATCH_SIZE = 500;
    const userIdChunks = chunkArray(recipientUserIds, MAX_BATCH_SIZE);

    const batchPromises = userIdChunks.map(chunk => {
      const batch = adminDb.batch();

      chunk.forEach(userId => {
        const notificationRef = adminDb.collection('notifications').doc();
        batch.set(notificationRef, {
          userId,
          title,
          message,
          type: 'announcement',
          priority: priority || 'normal',
          read: false,
          createdAt: timestamp,
          createdBy: senderName,
          companyId,
        });
      });

      return batch.commit();
    });

    // Ejecutar todos los batches en paralelo
    await Promise.all(batchPromises);

    let pushSentCount = 0;

    if (sendPush && recipientUserIds.length > 0) {
      // ✅ Optimización: Obtener todos los tokens en paralelo con chunks de 30 (límite de 'in')
      const userIdChunks = chunkArray(recipientUserIds, 30);

      const tokenQueryPromises = userIdChunks.map(chunk =>
        adminDb
          .collection('fcmTokens')
          .where('userId', 'in', chunk)
          .select('token')
          .get()
      );

      const tokenSnapshots = await Promise.all(tokenQueryPromises);
      const allTokens: string[] = tokenSnapshots
        .flatMap(snap => snap.docs.map(doc => doc.data().token))
        .filter((token): token is string => Boolean(token));

      if (allTokens.length > 0) {
        const messaging = admin.messaging();
        const tokenChunks = chunkArray(allTokens, 500);

        // ✅ Enviar notificaciones en paralelo (máx 3 a la vez para evitar rate limits)
        const sendInBatches = async (chunks: string[][], batchSize: number = 3) => {
          for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);

            const sendPromises = batch.map(async (tokenChunk) => {
              try {
                const response = await messaging.sendEachForMulticast({
                  tokens: tokenChunk,
                  notification: { title, body: message },
                  data: { type: 'announcement', priority: priority || 'normal' },
                  android: { priority: priority === 'high' ? 'high' : 'normal', notification: { sound: 'default' } },
                  apns: { payload: { aps: { sound: 'default', badge: 1 } } },
                  webpush: { notification: { icon: '/icon-192x192.png', requireInteraction: priority === 'high' } },
                });

                pushSentCount += response.successCount;

                // Limpiar tokens inválidos en paralelo
                if (response.failureCount > 0) {
                  const failedTokens = response.responses
                    .map((resp, idx) => resp.success ? null : tokenChunk[idx])
                    .filter((token): token is string => token !== null);

                  const deletePromises = failedTokens.map(token =>
                    adminDb
                      .collection('fcmTokens')
                      .where('token', '==', token)
                      .limit(1)
                      .get()
                      .then(snap => {
                        if (!snap.empty) {
                          return snap.docs[0].ref.delete();
                        }
                      })
                  );

                  await Promise.all(deletePromises);
                }

                return response.successCount;
              } catch (error) {
                console.error('Error enviando notificaciones push:', error);
                return 0;
              }
            });

            await Promise.all(sendPromises);
          }
        };

        await sendInBatches(tokenChunks);
      }
    }

    return NextResponse.json({
      success: true,
      recipientCount: recipientUserIds.length,
      pushSent: pushSentCount,
    });
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return NextResponse.json({ error: 'Error al enviar notificación' }, { status: 500 });
  }
}
